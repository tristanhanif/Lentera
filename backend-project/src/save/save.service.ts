import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPost } from 'src/app/entity/saved-post.entity';
import { Posts } from 'src/app/entity/posts.entity';

@Injectable()
export class SaveService {
  constructor(
    @InjectRepository(SavedPost)
    private readonly saveRepository: Repository<SavedPost>,
    @InjectRepository(Posts)
    private readonly postRepository: Repository<Posts>,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  async toggleSave(postId: string) {
    const userId = this.request.user.id;

    const existing = await this.saveRepository.findOne({
      where: { user: { id: userId }, post: { id: postId } },
    });

    if (existing) {
      await this.saveRepository.remove(existing);
      return {
        message: 'Postingan dihapus dari simpanan',
        data: { saved: false },
      };
    }

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      return { message: 'Postingan tidak ditemukan', data: null };
    }

    const savedPost = this.saveRepository.create({
      user: { id: userId },
      post: { id: postId },
    });
    await this.saveRepository.save(savedPost);

    return {
      message: 'Postingan disimpan',
      data: { saved: true },
    };
  }

  async getSaveStatus(postId: string) {
    const userId = this.request.user.id;

    const existing = await this.saveRepository.findOne({
      where: { user: { id: userId }, post: { id: postId } },
    });

    return {
      message: 'OK',
      data: { saved: !!existing },
    };
  }

  async getMySavedPosts(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    try {
      const [savedPosts, total] = await this.saveRepository.findAndCount({
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
        message: 'Success fetch saved posts',
        data: savedPosts.map((s) => s.post),
        meta: {
          totalItems: total,
          itemCount: savedPosts.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Gagal mengambil postingan tersimpan');
    }
  }
}
