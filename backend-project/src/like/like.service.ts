import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Likes } from 'src/app/entity/like.entity';
import { Posts } from 'src/app/entity/posts.entity';
import { LikeGateway } from './like.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/app/entity/notification.entity';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Likes)
    private readonly likeRepository: Repository<Likes>,
    @InjectRepository(Posts)
    private readonly postRepository: Repository<Posts>,
    @Inject(REQUEST) private readonly request: any,
    private readonly likeGateway: LikeGateway,
    private readonly notifService: NotificationService,
  ) {}

  async toggleLike(postId: string) {
    const userId = this.request.user.id;

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });
    if (!post) {
      return { message: 'Postingan tidak ditemukan' };
    }

    const existingLike = await this.likeRepository.findOne({
      where: { user: { id: userId }, post: { id: postId } },
    });

    if (existingLike) {
      await this.likeRepository.remove(existingLike);
      const totalLikes = await this.likeRepository.count({
        where: { post: { id: postId } },
      });
      this.likeGateway.emitLikeToggled({
        postId,
        totalLikes,
        action: 'unliked',
        userId,
      });
      return { message: 'Berhasil unlike postingan', data: { liked: false } };
    }

    const like = this.likeRepository.create({
      user: { id: userId },
      post: { id: postId },
    });
    await this.likeRepository.save(like);

    const totalLikes = await this.likeRepository.count({
      where: { post: { id: postId } },
    });
    this.likeGateway.emitLikeToggled({
      postId,
      totalLikes,
      action: 'liked',
      userId,
    });

    if (post.user.id !== userId) {
      await this.notifService.createNotification({
        type: NotificationType.LIKE,
        content: 'menyukai postingan Anda',
        userId: post.user.id,
        actorId: userId,
        postId,
      });
    }

    return { message: 'Berhasil like postingan', data: { liked: true } };
  }

  async getLikeStatus(postId: string) {
    const userId = this.request.user.id;

    const [liked, total] = await Promise.all([
      this.likeRepository.findOne({
        where: { user: { id: userId }, post: { id: postId } },
      }),
      this.likeRepository.count({ where: { post: { id: postId } } }),
    ]);

    return {
      message: 'Ok',
      data: { liked: !!liked, totalLikes: total },
    };
  }

  async getPostLikes(postId: string) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      return { message: 'Postingan tidak ditemukan' };
    }

    const total = await this.likeRepository.count({
      where: { post: { id: postId } },
    });

    return { message: 'Ok', data: { totalLikes: total } };
  }
}
