import { ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePostDto } from './dto/create.dto';
import { Posts } from '../entity/posts.entity';
import { ListQueryDto } from './dto/list-post.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from '../entity/notification.entity';
import { User } from '../entity/user.entity';
import { extractMentions } from 'src/utils/mention.util';
import { BlocksService } from 'src/blocks/blocks.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Posts)
    private readonly postRepository: Repository<Posts>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(REQUEST) private req: any,
    private readonly dataSource: DataSource,
    private readonly notifService: NotificationService,
    private readonly blocksService: BlocksService,
  ) {}

  private viewerId(): string | undefined {
    return this.req?.user?.id ?? this.req?.user?.sub;
  }

  // Sembunyikan like & komentar dari akun yang diblokir dua arah.
  private async stripBlockedInteractions<T extends { likes?: any[]; comments?: any[] }>(
    posts: T[],
  ): Promise<T[]> {
    const me = this.viewerId();
    if (!me) return posts;
    const blocked = new Set(await this.blocksService.getBlockedIds(me));
    if (blocked.size === 0) return posts;
    for (const p of posts) {
      if (Array.isArray(p.likes)) {
        p.likes = p.likes.filter((l) => !blocked.has(l?.user?.id));
      }
      if (Array.isArray(p.comments)) {
        p.comments = p.comments.filter((c) => !blocked.has(c?.user?.id));
      }
    }
    return posts;
  }
 
  async createPost(dto: CreatePostDto) {
    // Menggunakan Transaction untuk menjamin integritas data Post & Media
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
 
    try {
      // 1. Inisialisasi entitas Post (konten boleh kosong, hanya media)
      // sortOrder diisi otomatis dari urutan upload: pertama = slide 1.
      const mediasWithOrder = (dto.medias ?? []).map((m, i) => ({
        ...m,
        sortOrder: m.sortOrder ?? i,
      }));
      const post = this.postRepository.create({
        content: dto.content ?? '',
        location: dto.location ?? null,
        musicUrl: dto.music?.url ?? null,
        musicTitle: dto.music?.title ?? null,
        musicArtist: dto.music?.artist ?? null,
        musicCover: dto.music?.cover ?? null,
        user: this.req.user , // Hubungkan dengan user yang sedang login
        medias: mediasWithOrder, // Masukkan array media (TypeORM akan handle relasinya)
      });
 
 
      // 2. Simpan Post (otomatis menyimpan ke tabel medias karena OneToMany)
      const savedPost = await queryRunner.manager.save(post);
 
      await queryRunner.commitTransaction();

      // --- MENTION NOTIFICATIONS ---
      const mentionedUsernames = extractMentions(dto.content ?? '');
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await this.userRepository.find({
          where: mentionedUsernames.map((u) => ({ username: u })),
        });

        for (const mentionedUser of mentionedUsers) {
          if (mentionedUser.id !== this.req.user.id) {
            await this.notifService.createNotification({
              type: NotificationType.MENTION,
              content: `menyebut Anda dalam postingan: "${(dto.content ?? '').substring(0, 50)}"`,
              userId: mentionedUser.id,
              actorId: this.req.user.id,
              postId: savedPost.id,
            });
          }
        }
      }

      return {
        message : "OK",
        data : savedPost
      }
    } catch (err) {
 
        console.log("err", err)
      // Jika salah satu gagal (misal: simpan media error), batalkan semua
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Gagal membuat postingan');
    } finally {
      await queryRunner.release();
    }
  }

  async getRandomFeed(query: ListQueryDto) {
    const { page = 1, limit = 10, search, sort } = query;
    const skip = (page - 1) * limit;
 
    const seed = this.req.user?.id
      ? parseInt(this.req.user.id.replace(/\D/g, '').substring(0, 5))
      : 123;
 
    try {
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .select([
          'post.id',
          'post.content',
          'post.location',
          'post.musicUrl',
          'post.musicTitle',
          'post.musicArtist',
          'post.musicCover',
          'post.createdAt',
        ])
        .leftJoin('post.user', 'user')
        .addSelect(['user.id', 'user.name', 'user.avatar', 'user.username'])
        .leftJoinAndSelect('post.medias', 'media')
        .leftJoinAndSelect('post.likes', 'likes')
        .leftJoin('likes.user', 'likeUser')
        .addSelect(['likeUser.id', 'likeUser.name', 'likeUser.username', 'likeUser.avatar'])
        .leftJoinAndSelect('post.comments', 'comments')
        .leftJoin('comments.user', 'commentUser')
        .addSelect(['commentUser.id', 'commentUser.name', 'commentUser.username', 'commentUser.avatar']);
      // --- SEMBUNYIKAN AKUN DIBLOKIR (dua arah) ---
      const me = this.viewerId();
      if (me) {
        const blockedIds = await this.blocksService.getBlockedIds(me);
        if (blockedIds.length > 0) {
          queryBuilder.andWhere('user.id NOT IN (:...blockedIds)', { blockedIds });
        }
      }
      // --- LOGIKA SEARCHING ---
      if (search) {
        queryBuilder.where('post.content LIKE :search', {
          search: `%${search}%`,
        });
        // Jika sedang mencari, biasanya kita urutkan dari yang terbaru (bukan acak)
        queryBuilder.orderBy('post.createdAt', 'DESC');
      } else if (sort === 'newest') {
        // Halaman utama: postingan terbaru di paling atas.
        queryBuilder.orderBy('post.createdAt', 'DESC');
      } else {
        // Jika tidak mencari, gunakan mode acak (Explore)
        queryBuilder.orderBy(`RAND(${seed})`);
      }
      // NOTE: jangan addOrderBy media.sortOrder di sini — kombinasi
      // RAND() + take/skip + join membuat TypeORM generate
      // `SELECT DISTINCT ..., , ...` yang syntax error di MySQL.
      // Urutan slide dirapikan di JS di bawah (tetap sesuai upload).

      queryBuilder.take(limit).skip(skip);

      const [data, total] = await queryBuilder.getManyAndCount();
      await this.stripBlockedInteractions(data);

      // Slide selalu urut sesuai upload: pertama = slide 1.
      for (const p of data) {
        p.medias?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
 
      return {
        message: search
          ? `Hasil pencarian untuk: ${search}`
          : 'Success fetch explore feed',
        data,
        meta: {
          totalItems: total,
          itemCount: data.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
      };
    } catch (error) {
      console.error('Error Feed:', error);
      throw new InternalServerErrorException('Gagal mengambil data');
    }
  }

  async getUserPosts(userId: string, query: ListQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );

    const user = await this.userRepository.findOne({
      where: isUuid ? { id: userId } : { username: userId.toLowerCase() },
      select: ['id'],
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Profil diblokir dua arah -> postingannya ikut hilang.
    const me = this.viewerId();
    if (me && (await this.blocksService.isBlockedEitherWay(me, user.id))) {
      return {
        message: 'Success fetch posts',
        data: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: limit,
          totalPages: 0,
          currentPage: page,
        },
      };
    }

    const [data, total] = await this.postRepository.findAndCount({
      where: {
        user: { id: user.id },
      },
      relations: ['medias', 'likes', 'likes.user', 'comments', 'comments.user', 'user'],
      order: {
        createdAt: 'DESC',
        medias: { sortOrder: 'ASC' },
      },
      take: limit,
      skip: skip,
    });

    await this.stripBlockedInteractions(data);

    for (const p of data) {
      p.medias?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    return {
      message: 'Success fetch posts',
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  // Detail 1 postingan untuk dibuka dari chat (kotak postingan di pesan).
  async getPostById(id: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (!isUuid) {
      throw new NotFoundException('Postingan tidak ditemukan');
    }

    const post = await this.postRepository
      .createQueryBuilder('post')
      .select([
        'post.id',
        'post.content',
        'post.location',
        'post.musicUrl',
        'post.musicTitle',
        'post.musicArtist',
        'post.musicCover',
        'post.createdAt',
      ])
      .leftJoin('post.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.avatar', 'user.username'])
      .leftJoinAndSelect('post.medias', 'media')
      .leftJoinAndSelect('post.likes', 'likes')
      .leftJoin('likes.user', 'likeUser')
      .addSelect(['likeUser.id', 'likeUser.name', 'likeUser.username', 'likeUser.avatar'])
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoin('comments.user', 'commentUser')
      .addSelect(['commentUser.id', 'commentUser.name', 'commentUser.username', 'commentUser.avatar'])
      .where('post.id = :id', { id })
      .getOne();

    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan');
    }

    // Postingan milik akun yang diblokir dua arah -> anggap tidak ada.
    const detailViewer = this.viewerId();
    if (
      detailViewer &&
      post.user?.id &&
      (await this.blocksService.isBlockedEitherWay(detailViewer, post.user.id))
    ) {
      throw new NotFoundException('Postingan tidak ditemukan');
    }

    post.medias?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    await this.stripBlockedInteractions([post]);

    return {
      message: 'Success fetch post detail',
      data: post,
    };
  }

  async deletePost(id: string) {    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan');
    }
    const meId = this.req?.user?.id;
    if (!meId || post.user?.id !== meId) {
      throw new ForbiddenException('Hanya pemilik postingan yang bisa menghapus');
    }
    // Relasi medias/likes/comments/reposts/saves ikut terhapus via onDelete CASCADE.
    await this.postRepository.remove(post);
    return {
      message: 'Postingan berhasil dihapus',
      data: { postId: id, deleted: true },
    };
  }

  async getMyPosts(query: ListQueryDto) {
    const { page = 1, limit = 10 } = query;
 
    console.log(query)
    const skip = (page - 1) * limit;
 
    try {
      // Menggunakan findAndCount untuk mendapatkan data + total count
      const [data, total] = await this.postRepository.findAndCount({
        where: {
          user: { id: this.req.user.id } // Filter berdasarkan user login
        },
        relations: ['medias', 'likes', 'likes.user', 'comments', 'comments.user', 'user'], // Load relasi yang dibutuhkan
        order: {
          createdAt: 'DESC', // Urutkan dari terbaru
          medias: { sortOrder: 'ASC' }, // Slide urut sesuai upload
        },
        take: limit, // Limit data
        skip: skip,  // Offset data
      });

      for (const p of data) {
        p.medias?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }

      return {
        message: "Success fetch posts",
        data,
        meta: {
          totalItems: total,
          itemCount: data.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Gagal mengambil data postingan');
    }
  }
}