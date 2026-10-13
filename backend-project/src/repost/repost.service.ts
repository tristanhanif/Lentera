import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reposts } from 'src/app/entity/repost.entity';
import { Posts } from 'src/app/entity/posts.entity';
import { Follow } from 'src/app/entity/follow.entity';

@Injectable()
export class RepostService {
  constructor(
    @InjectRepository(Reposts)
    private readonly repostRepository: Repository<Reposts>,
    @InjectRepository(Posts)
    private readonly postRepository: Repository<Posts>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  async getMyReposts(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    try {
      const [reposts, total] = await this.repostRepository.findAndCount({
        where: { user: { id: this.request.user.id } },
        relations: [
          'post',
          'post.user',
          'post.medias',
          'post.likes',
          'post.likes.user',
          'post.comments',
          'post.comments.user',
        ],
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });

      return {
        message: 'Success fetch my reposts',
        data: reposts.map((r) => r.post),
        meta: {
          totalItems: total,
          itemCount: reposts.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      console.error(error);
      return { message: 'Gagal mengambil data repost', data: [], meta: null };
    }
  }

  async toggleRepost(postId: string) {
    const userId = this.request.user.id;

    const existing = await this.repostRepository.findOne({
      where: { user: { id: userId }, post: { id: postId } },
    });

    if (existing) {
      await this.repostRepository.remove(existing);
      const totalReposts = await this.repostRepository.count({
        where: { post: { id: postId } },
      });
      return {
        message: 'Repost dibatalkan',
        data: { reposted: false, totalReposts },
      };
    }

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      return { message: 'Postingan tidak ditemukan', data: null };
    }

    const repost = this.repostRepository.create({
      user: { id: userId },
      post: { id: postId },
    });
    await this.repostRepository.save(repost);

    const totalReposts = await this.repostRepository.count({
      where: { post: { id: postId } },
    });
    return { message: 'OK', data: { reposted: true, totalReposts } };
  }

  async updatePendapat(postId: string, pendapat: string | null) {
    const userId = this.request.user.id;

    const existing = await this.repostRepository.findOne({
      where: { user: { id: userId }, post: { id: postId } },
    });
    if (!existing) {
      return { message: 'Hanya yang merepost yang bisa mengisi pendapat', data: null };
    }

    const text = (pendapat ?? '').trim().slice(0, 200);
    existing.pendapat = text.length > 0 ? text : null;
    await this.repostRepository.save(existing);

    return {
      message: 'OK',
      data: { postId, pendapat: existing.pendapat },
    };
  }

  async getRepostStatus(postId: string) {
    const userId = this.request.user.id;

    const reposts = await this.repostRepository.find({
      where: { post: { id: postId } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    const mine = reposts.find((r) => r.user.id === userId);

    const follows = await this.followRepository.find({
      where: [
        { follower: { id: userId } },
        { following: { id: userId } },
      ],
      relations: { follower: true, following: true },
    });

    const connectedIds = new Set<string>();
    for (const f of follows) {
      if (f.follower && f.follower.id !== userId) {
        connectedIds.add(f.follower.id);
      }
      if (f.following && f.following.id !== userId) {
        connectedIds.add(f.following.id);
      }
    }

    const rank = (r: Reposts) => {
      if (r.user.id === userId) return 0;
      if (connectedIds.has(r.user.id)) return 1;
      return 2;
    };

    const reposters = [...reposts]
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 5)
      .map((r) => ({
        id: r.user.id,
        name: r.user.name,
        username: r.user.username,
        avatar: r.user.avatar,
        pendapat: r.pendapat ?? null,
      }));

    return {
      message: 'OK',
      data: {
        reposted: !!mine,
        totalReposts: reposts.length,
        reposters,
      },
    };
  }
}
