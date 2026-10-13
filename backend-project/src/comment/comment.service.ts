import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comments } from 'src/app/entity/comment.entity';
import { CommentLike } from 'src/app/entity/comment-like.entity';
import { Posts } from 'src/app/entity/posts.entity';
import { CreateCommentDto } from './dto/comment.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/app/entity/notification.entity';
import { extractMentions } from 'src/utils/mention.util';
import { User } from 'src/app/entity/user.entity';
import { BlocksService } from 'src/blocks/blocks.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comments)
    private readonly commentRepository: Repository<Comments>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(Posts) private readonly postRepository: Repository<Posts>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(REQUEST) private readonly request: any,
    private readonly notifService: NotificationService,
    private readonly blocksService: BlocksService,
  ) {}

  async getCommentsByPost(postId: string) {
    const userId = this.request.user?.id;

    const comments = await this.commentRepository      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .loadRelationCountAndMap('comment.likesCount', 'comment.commentLikes')
      .loadRelationIdAndMap('comment.parentId', 'comment.parent')
      .leftJoin(
        'comment.commentLikes',
        'myLike',
        'myLike.userId = :userId',
        { userId: userId || '' },
      )
      .addSelect(
        'CASE WHEN myLike.id IS NOT NULL THEN true ELSE false END',
        'comment_isLiked',
      )
      .where('comment.postId = :postId', { postId })
      .orderBy('comment.createdAt', 'DESC')
      .getRawAndEntities();

    const result = comments.entities.map((comment, index) => {
      const rawIsLiked = comments.raw[index]?.comment_isLiked;
      return {
        ...comment,
        likesCount: Number(
          (comment as any).likesCount ??
            comments.raw[index]?.comment_likesCount ??
            0,
        ),
        isLiked:
          rawIsLiked === true ||
          rawIsLiked === 1 ||
          rawIsLiked === '1' ||
          rawIsLiked === 'true',
      };
    });

    // Sembunyikan komentar dari akun yang diblokir dua arah.
    let visible = result;
    if (userId) {
      const blocked = new Set(await this.blocksService.getBlockedIds(userId));
      if (blocked.size > 0) {
        visible = result.filter((c: any) => !blocked.has(c?.user?.id));
      }
    }

    return {
      message: 'OK',
      data: visible,
    };
  }

  async createComment(dto: CreateCommentDto) {
    try {
      const post = await this.postRepository.findOne({
        where: { id: dto.postId },
        relations: ['user'],
      });
      if (!post) {
        return { message: 'Postingan tidak ditemukan', data: null };
      }

      // Tidak bisa mengomentari postingan akun yang diblokir dua arah.
      const meId = this.request.user?.id ?? this.request.user?.sub;
      if (
        meId &&
        post.user?.id &&
        (await this.blocksService.isBlockedEitherWay(meId, post.user.id))
      ) {
        throw new ForbiddenException('Anda tidak bisa berinteraksi dengan akun ini');
      }

      const parentComment = dto.parentId
        ? await this.commentRepository.findOne({
            where: { id: dto.parentId },
            relations: ['user'],
          })
        : null;

      if (
        meId &&
        parentComment?.user?.id &&
        (await this.blocksService.isBlockedEitherWay(meId, parentComment.user.id))
      ) {
        throw new ForbiddenException('Anda tidak bisa berinteraksi dengan akun ini');
      }

      const comment = this.commentRepository.create({
        content: dto.content,
        user: {
          id: this.request.user.id,
        },
        post: {
          id: dto.postId,
        },
        ...(parentComment ? { parent: { id: parentComment.id } } : {}),
      });
      const saved = await this.commentRepository.save(comment);

      const fullComment = await this.commentRepository.findOne({
        where: { id: saved.id },
        relations: ['user'],
      });

      // --- NOTIFIKASI DISATUKAN (Opsi A) ---
      // Balasan komentar + mention ke pemilik komentar induk digabung jadi 1:
      // "menyebut Anda di sebuah komentar: <isi balasan baru>"
      // Tujuannya biar tidak dobel ("membalas..." + "menyebut...") untuk 1 aksi balas.
      const alreadyNotified = new Set<string>();

      // 1) Balasan ke komentar induk -> 1 notifikasi gabungan (tipe MENTION
      // supaya frontend tidak menambah prefix "mengomentari:" lagi).
      if (parentComment && parentComment.user.id !== this.request.user.id) {
        await this.notifService.createNotification({
          type: NotificationType.MENTION,
          content: `menyebut Anda di sebuah komentar: "${dto.content.substring(0, 50)}"`,
          userId: parentComment.user.id,
          actorId: this.request.user.id,
          postId: dto.postId,
        });
        alreadyNotified.add(parentComment.user.id);
      }

      // 2) Komentar baru untuk pemilik postingan (top-level maupun balasan).
      // Dilewati kalau pemilik postingan sudah dapat notifikasi gabungan di atas
      // (balasannya ke komentar milik pemilik postingan sendiri) biar tidak dobel.
      if (
        post.user.id !== this.request.user.id &&
        !alreadyNotified.has(post.user.id)
      ) {
        await this.notifService.createNotification({
          type: NotificationType.COMMENT,
          content: dto.content,
          userId: post.user.id,
          actorId: this.request.user.id,
          postId: dto.postId,
        });
        alreadyNotified.add(post.user.id);
      }

      // --- MENTION NOTIFICATIONS ---
      const mentionedUsernames = extractMentions(dto.content);
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await this.userRepository.find({
          where: mentionedUsernames.map((u) => ({ username: u })),
        });

        for (const mentionedUser of mentionedUsers) {
          // Skip jika mention diri sendiri atau sudah dapat notif
          // (pemilik postingan / pemilik komentar induk) biar 1 aksi = 1 notifikasi.
          if (
            mentionedUser.id !== this.request.user.id &&
            !alreadyNotified.has(mentionedUser.id)
          ) {
            await this.notifService.createNotification({
              type: NotificationType.MENTION,
              content: `menyebut Anda di sebuah komentar: "${dto.content.substring(0, 50)}"`,
              userId: mentionedUser.id,
              actorId: this.request.user.id,
              postId: dto.postId,
            });
            alreadyNotified.add(mentionedUser.id);
          }
        }
      }

      return {
        message: 'OK',
        data: fullComment,
      };
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }
}
