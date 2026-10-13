import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentLike } from 'src/app/entity/comment-like.entity';
import { Comments } from 'src/app/entity/comment.entity';

@Injectable()
export class CommentLikeService {
  constructor(
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(Comments)
    private readonly commentRepository: Repository<Comments>,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  async toggleLike(commentId: string) {
    const userId = this.request.user.id;

    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });
    if (!comment) {
      return { message: 'Komentar tidak ditemukan' };
    }

    const existingLike = await this.commentLikeRepository.findOne({
      where: { user: { id: userId }, comment: { id: commentId } },
    });

    if (existingLike) {
      await this.commentLikeRepository.remove(existingLike);
      const totalLikes = await this.commentLikeRepository.count({
        where: { comment: { id: commentId } },
      });
      return { message: 'Berhasil unlike komentar', data: { liked: false, totalLikes } };
    }

    const like = this.commentLikeRepository.create({
      user: { id: userId },
      comment: { id: commentId },
    });
    await this.commentLikeRepository.save(like);

    const totalLikes = await this.commentLikeRepository.count({
      where: { comment: { id: commentId } },
    });

    return { message: 'Berhasil like komentar', data: { liked: true, totalLikes } };
  }

  async getLikeStatus(commentId: string) {
    const userId = this.request.user.id;

    const [liked, total] = await Promise.all([
      this.commentLikeRepository.findOne({
        where: { user: { id: userId }, comment: { id: commentId } },
      }),
      this.commentLikeRepository.count({ where: { comment: { id: commentId } } }),
    ]);

    return {
      message: 'Ok',
      data: { liked: !!liked, totalLikes: total },
    };
  }
}
