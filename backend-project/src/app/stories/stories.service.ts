import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { Story, StoryMedia, StoryView, StoryLike } from '../entity/story.entity';
import { User } from '../entity/user.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { CreateStoryCommentDto } from './dto/create-comment.dto';
import { ChatService } from 'src/chat/chat.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from '../entity/notification.entity';
import { BlocksService } from 'src/blocks/blocks.service';

function layoutForCount(count: number): 'single' | 'split2' | 'grid3' | 'grid4' {
  if (count === 2) return 'split2';
  if (count === 3) return 'grid3';
  if (count >= 4) return 'grid4';
  return 'single';
}

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private readonly storyRepository: Repository<Story>,
    @InjectRepository(StoryMedia)
    private readonly mediaRepository: Repository<StoryMedia>,
    @InjectRepository(StoryView)
    private readonly viewRepository: Repository<StoryView>,
    @InjectRepository(StoryLike)
    private readonly likeRepository: Repository<StoryLike>,
    @Inject(REQUEST) private readonly req: any,
    private readonly dataSource: DataSource,
    private readonly chatService: ChatService,
    private readonly notifService: NotificationService,
    private readonly blocksService: BlocksService,
  ) {}

  private get meId(): string | undefined {
    return this.req?.user?.id;
  }

  private mapStory(story: Story) {
    const now = new Date();
    const meId = this.meId;
    const isMine = meId ? story.user?.id === meId : false;
    const isLocked =
      !!story.unlockAt && new Date(story.unlockAt).getTime() > now.getTime();
    // Owner tetap boleh melihat isi kapsulnya sendiri; publik disembunyikan.
    const hideMedia = isLocked && !isMine;
    const timeLeftSec =
      isLocked && story.unlockAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(story.unlockAt).getTime() - now.getTime()) / 1000,
            ),
          )
        : 0;

    const views = story.views ?? [];
    const viewCount = views.length;
    const isViewedByMe = meId
      ? views.some((v) => (v.viewer as User)?.id === meId)
      : false;

    const likes = (story as Story & { likes?: StoryLike[] }).likes ?? [];
    const totalLikes = likes.length;
    const isLikedByMe = meId
      ? likes.some((l) => (l.user as User)?.id === meId)
      : false;

    const medias = hideMedia
      ? []
      : (story.medias ?? [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((m) => ({
            url: m.url,
            type: m.type,
            sortOrder: m.sortOrder,
          }));

    return {
      id: story.id,
      type: story.type,
      layout: story.layout,
      caption: story.caption,
      music: story.musicUrl
        ? {
            url: story.musicUrl,
            title: story.musicTitle,
            artist: story.musicArtist,
            cover: story.musicCover,
            start: story.musicStart ?? 0,
            mode: story.musicMode ?? 'none',
            lyrics: story.musicLyrics ?? null,
            x: story.musicX ?? null,
            y: story.musicY ?? null,
            scale: story.musicScale ?? 1,
          }
        : null,
      text: story.textContent
        ? {
            content: story.textContent,
            style: story.textStyle ?? 'modern',
            bg: story.textBg ?? 'white',
            x: story.textX ?? null,
            y: story.textY ?? null,
            scale: story.textScale ?? 1,
          }
        : null,
      user: story.user
        ? {
            id: story.user.id,
            name: (story.user as any).name,
            username: (story.user as any).username,
            avatar: (story.user as any).avatar,
          }
        : null,
      post: story.postId
        ? {
            id: story.postId,
            ownerUsername: story.postOwnerUsername ?? null,
            mediaCount: story.postMediaCount ?? null,
            scale: story.postScale ?? 1,
          }
        : null,
      medias,
      isLocked,
      isMine,
      unlockAt: story.unlockAt,
      expiresAt: story.expiresAt,
      createdAt: story.createdAt,
      timeLeftSec,
      viewCount,
      isViewedByMe,
      totalLikes,
      isLikedByMe,
    };
  }

  async create(dto: CreateStoryDto) {
    // --- Validasi custom tipe vs media (bukan decorator) ---
    if (dto.type === 'photo') {
      if (dto.medias.length < 1 || dto.medias.length > 4) {
        throw new BadRequestException(
          'Story foto harus berisi 1-4 foto',
        );
      }
      const nonImage = dto.medias.find((m) => m.type !== 'image');
      if (nonImage) {
        throw new BadRequestException(
          'Story photo hanya boleh berisi media image',
        );
      }
    } else if (dto.type === 'video') {
      if (dto.medias.length !== 1) {
        throw new BadRequestException(
          'Story video harus tepat 1 video',
        );
      }
      if (dto.medias[0].type !== 'video') {
        throw new BadRequestException(
          'Story video hanya boleh berisi media video',
        );
      }
    }

    // --- Validasi unlockAt (kapsul): min +5 menit, max +24 jam ---
    const now = new Date();
    let unlockAt: Date | null = null;
    if (dto.unlockAt) {
      const parsed = new Date(dto.unlockAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Format unlockAt tidak valid');
      }
      const min = now.getTime() + 5 * 60 * 1000;
      const max = now.getTime() + 24 * 60 * 60 * 1000;
      if (parsed.getTime() <= min) {
        throw new BadRequestException(
          'unlockAt minimal +5 menit dari sekarang',
        );
      }
      if (parsed.getTime() > max) {
        throw new BadRequestException(
          'unlockAt maksimal +24 jam dari sekarang',
        );
      }
      unlockAt = parsed;
    }

    const layout = dto.layout ?? layoutForCount(dto.medias.length);
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const story = this.storyRepository.create({
        type: dto.type,
        layout,
        caption: dto.caption ?? null,
        musicUrl: dto.music?.url ?? null,
        musicTitle: dto.music?.title ?? null,
        musicArtist: dto.music?.artist ?? null,
        musicCover: dto.music?.cover ?? null,
        musicStart:
          typeof dto.music?.start === 'number'
            ? Math.max(0, Math.min(600, dto.music.start))
            : 0,
        musicMode: dto.music?.mode ?? 'none',
        musicLyrics: dto.music?.lyrics?.slice(0, 2000) ?? null,
        musicX:
          typeof dto.music?.x === 'number'
            ? Math.max(0, Math.min(100, dto.music.x))
            : null,
        musicY:
          typeof dto.music?.y === 'number'
            ? Math.max(0, Math.min(100, dto.music.y))
            : null,
        musicScale:
          typeof dto.music?.scale === 'number'
            ? Math.max(0.5, Math.min(2, dto.music.scale))
            : 1,
        textContent: dto.text?.content?.slice(0, 140) ?? null,
        textStyle: dto.text?.style ?? 'modern',
        textBg: dto.text?.bg ?? 'white',
        textX:
          typeof dto.text?.x === 'number'
            ? Math.max(0, Math.min(100, dto.text.x))
            : null,
        textY:
          typeof dto.text?.y === 'number'
            ? Math.max(0, Math.min(100, dto.text.y))
            : null,
        textScale:
          typeof dto.text?.scale === 'number'
            ? Math.max(0.5, Math.min(2, dto.text.scale))
            : 1,
        unlockAt,
        expiresAt,
        postId: dto.postId ?? null,
        postOwnerUsername: dto.postOwnerUsername?.slice(0, 255) ?? null,
        postMediaCount:
          typeof dto.postMediaCount === 'number'
            ? Math.max(1, Math.min(10, dto.postMediaCount))
            : null,
        postScale:
          typeof dto.postScale === 'number'
            ? Math.max(0.5, Math.min(2, dto.postScale))
            : null,
        user: { id: this.req.user.id } as User,
        medias: dto.medias.map((m, idx) =>
          this.mediaRepository.create({
            url: m.url,
            publicId: m.publicId,
            type: m.type,
            sortOrder: idx,
          }),
        ),
      });

      const saved = await queryRunner.manager.save(story);
      await queryRunner.commitTransaction();
      return {
        message: 'OK',
        data: saved,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        (err as Error)?.message ?? 'Gagal membuat story',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private baseQuery() {
    return this.storyRepository
      .createQueryBuilder('story')
      .leftJoin('story.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.username', 'user.avatar'])
      .leftJoinAndSelect('story.medias', 'media')
      .leftJoinAndSelect('story.views', 'view')
      .leftJoin('view.viewer', 'viewer')
      .addSelect(['viewer.id'])
      .leftJoinAndSelect('story.likes', 'storyLike')
      .leftJoin('storyLike.user', 'liker')
      .addSelect(['liker.id']);
  }

  async feed() {
    const now = new Date();
    const stories = await this.baseQuery()
      .where('story.expiresAt > :now', { now })
      .orderBy('story.createdAt', 'DESC')
      .getMany();

    // Sembunyikan story dari akun yang diblokir dua arah.
    const meId = this.meId;
    let visible = stories;
    if (meId) {
      const blocked = new Set(await this.blocksService.getBlockedIds(meId));
      if (blocked.size > 0) {
        visible = stories.filter((s) => !blocked.has((s.user as User)?.id));
      }
    }

    return {
      message: 'OK',
      data: visible.map((s) => this.mapStory(s)),
    };
  }

  async detail(id: string) {
    const story = await this.baseQuery()
      .where('story.id = :id', { id })
      .getOne();

    if (!story) {
      throw new NotFoundException('Story tidak ditemukan');
    }
    if (new Date(story.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException('Story tidak ditemukan');
    }
    const meId = this.meId;
    if (
      meId &&
      (story.user as User)?.id &&
      (await this.blocksService.isBlockedEitherWay(meId, (story.user as User).id))
    ) {
      throw new NotFoundException('Story tidak ditemukan');
    }
    return {
      message: 'OK',
      data: this.mapStory(story),
    };
  }

  async markViewed(id: string) {
    const story = await this.storyRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!story || new Date(story.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException('Story tidak ditemukan atau sudah expired');
    }

    const meId = this.meId;
    const isMine = meId ? (story.user as User)?.id === meId : false;
    const isLocked =
      !!story.unlockAt && new Date(story.unlockAt).getTime() > Date.now();
    if (isLocked && !isMine) {
      throw new ForbiddenException('Story masih terkunci (kapsul waktu)');
    }

    const existing = await this.viewRepository.findOne({
      where: {
        story: { id: story.id },
        viewer: { id: meId },
      },
      relations: ['story', 'viewer'],
    });
    if (!existing) {
      const view = this.viewRepository.create({
        story: { id: story.id } as Story,
        viewer: { id: meId } as User,
      });
      await this.viewRepository.save(view);
    }

    return {
      message: 'OK',
      data: { storyId: story.id, viewed: true },
    };
  }

  private async getOpenStoryOrFail(id: string) {
    const story = await this.storyRepository.findOne({
      where: { id },
      relations: ['user', 'medias'],
    });
    if (!story || new Date(story.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException('Story tidak ditemukan atau sudah expired');
    }
    const meId = this.meId;
    if (
      meId &&
      (story.user as User)?.id &&
      (await this.blocksService.isBlockedEitherWay(meId, (story.user as User).id))
    ) {
      throw new NotFoundException('Story tidak ditemukan atau sudah expired');
    }
    return story;
  }

  private assertUnlockedForMe(story: Story) {
    const meId = this.meId;
    const isMine = meId ? (story.user as User)?.id === meId : false;
    const isLocked =
      !!story.unlockAt && new Date(story.unlockAt).getTime() > Date.now();
    if (isLocked && !isMine) {
      throw new ForbiddenException('Story masih terkunci (kapsul waktu)');
    }
    return { meId, isMine, isLocked };
  }

  async toggleLike(id: string) {
    const story = await this.getOpenStoryOrFail(id);
    const { meId } = this.assertUnlockedForMe(story);

    const existing = await this.likeRepository.findOne({
      where: {
        story: { id: story.id },
        user: { id: meId },
      },
    });

    let liked: boolean;
    if (existing) {
      await this.likeRepository.remove(existing);
      liked = false;
    } else {
      const like = this.likeRepository.create({
        story: { id: story.id } as Story,
        user: { id: meId } as User,
      });
      await this.likeRepository.save(like);
      liked = true;

      // Akun B me-like story akun A -> akun A dapat notifikasi (ala like postingan).
      const ownerId = (story.user as User)?.id;
      if (liked && ownerId && ownerId !== meId) {
        await this.notifService.createNotification({
          type: NotificationType.LIKE,
          content: 'menyukai story Anda',
          userId: ownerId,
          actorId: meId as string,
        });
      }
    }

    const totalLikes = await this.likeRepository.count({
      where: { story: { id: story.id } },
    });

    return {
      message: 'OK',
      data: { storyId: story.id, liked, totalLikes },
    };
  }

  async getViewers(id: string) {
    const story = await this.getOpenStoryOrFail(id);
    const meId = this.meId;
    if (!meId || (story.user as User)?.id !== meId) {
      throw new ForbiddenException('Hanya pemilik story yang bisa melihat daftar penonton');
    }

    const views = await this.viewRepository.find({
      where: { story: { id: story.id } },
      relations: ['viewer'],
      order: { viewedAt: 'DESC' },
    });

    const likes = await this.likeRepository.find({
      where: { story: { id: story.id } },
      relations: ['user'],
    });
    const likedIds = new Set(likes.map((l) => (l.user as User)?.id));

    return {
      message: 'OK',
      data: views.map((v) => ({
        user: {
          id: (v.viewer as User)?.id,
          name: (v.viewer as User)?.name,
          username: (v.viewer as User)?.username,
          avatar: (v.viewer as User)?.avatar,
        },
        viewedAt: v.viewedAt,
        liked: likedIds.has((v.viewer as User)?.id),
      })),
    };
  }

  async commentStory(id: string, dto: CreateStoryCommentDto) {
    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Komentar tidak boleh kosong');
    }
    const story = await this.getOpenStoryOrFail(id);
    const { meId, isMine } = this.assertUnlockedForMe(story);
    if (isMine) {
      throw new BadRequestException('Tidak bisa mengomentari story sendiri');
    }

    const ownerId = (story.user as User).id;
    const ownerUsername = (story.user as any)?.username ?? null;
    // Preview story untuk kartu "Membalas cerita [username]" di messages:
    // pakai media pertama (foto/gambar/video) — video ditampilkan sebagai
    // gambar (thumbnail frame) di frontend.
    const sortedMedias = [...(story.medias ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const firstMedia = sortedMedias[0] ?? null;
    const conversation = await this.chatService.createConversation(meId as string, ownerId);
    const message = await this.chatService.sendMessage(
      meId as string,
      conversation.id,
      content,
      undefined,
      {
        storyId: story.id,
        storyMediaUrl: firstMedia?.url ?? null,
        storyMediaType: firstMedia?.type ?? null,
        storyOwnerUsername: ownerUsername,
      },
    );

    return {
      message: 'OK',
      data: {
        storyId: story.id,
        conversationId: conversation.id,
        chatMessage: message,
      },
    };
  }

  async deleteStory(id: string) {
    const story = await this.storyRepository.findOne({
      where: { id },
      relations: ['user', 'medias'],
    });
    if (!story || new Date(story.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException('Story tidak ditemukan atau sudah expired');
    }
    const meId = this.meId;
    if (!meId || (story.user as User)?.id !== meId) {
      throw new ForbiddenException('Hanya pemilik story yang bisa menghapus');
    }

    for (const media of story.medias ?? []) {
      try {
        await cloudinary.uploader.destroy(media.publicId, {
          resource_type: media.type === 'video' ? 'video' : 'image',
        });
      } catch {
        // Abaikan kegagalan hapus satu file agar hapus story tetap lanjut.
      }
    }

    await this.storyRepository.remove(story);

    return {
      message: 'Story berhasil dihapus',
      data: { storyId: id, deleted: true },
    };
  }

  async cleanupExpired() {
    const now = new Date();
    const expired = await this.storyRepository.find({
      where: { expiresAt: LessThanOrEqual(now) },
      relations: ['medias'],
    });

    for (const story of expired) {
      for (const media of story.medias ?? []) {
        try {
          await cloudinary.uploader.destroy(media.publicId, {
            resource_type: media.type === 'video' ? 'video' : 'image',
          });
        } catch {
          // Abaikan kegagalan hapus satu file agar cleanup tetap lanjut.
        }
      }
    }

    if (expired.length > 0) {
      await this.storyRepository.remove(expired);
    }

    return {
      message: 'OK',
      data: { deleted: expired.length },
    };
  }
}
