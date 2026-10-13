import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Follow } from '../app/entity/follow.entity';
import { User } from '../app/entity/user.entity';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/app/entity/notification.entity';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifService: NotificationService,
    private readonly blocksService: BlocksService,
  ) {}

  async toggleFollow(userId: string, targetId: string) {
    if (userId === targetId) {
      return { message: 'Tidak bisa mengikuti akun sendiri', data: { following: false } };
    }

    // Akun yang diblokir / memblokir tidak bisa saling follow.
    if (await this.blocksService.isBlockedEitherWay(userId, targetId)) {
      return { message: 'Tidak bisa mengikuti akun yang diblokir', data: { following: false } };
    }

    const existing = await this.followRepo.findOne({
      where: {
        follower: { id: userId },
        following: { id: targetId },
      },
    });

    if (existing) {
      await this.followRepo.remove(existing);
      return { message: 'Berhenti mengikuti', data: { following: false } };
    }

    await this.followRepo.save({
      follower: { id: userId },
      following: { id: targetId },
    });

    await this.notifService.createNotification({
      type: NotificationType.FOLLOW,
      content: 'mulai mengikuti Anda',
      userId: targetId,
      actorId: userId,
    });

    return { message: 'Berhasil mengikuti', data: { following: true } };
  }

  async getSuggestions(userId: string, limit = 5) {
    const followedIdsResult = await this.followRepo
      .createQueryBuilder('f')
      .where('f.followerId = :userId', { userId })
      .select('f.followingId', 'id')
      .getRawMany();

    const followedIds = followedIdsResult.map((r) => r.id);
    const blockedIds = await this.blocksService.getBlockedIds(userId);

    const whereClause: any = {};
    const excludeIds = [userId, ...followedIds, ...blockedIds];
    whereClause.id = excludeIds.length > 0 ? Not(In(excludeIds)) : undefined;
    // Hanya akun yang sudah verifikasi email yang resmi muncul di Saran Pertemanan
    whereClause.isEmailVerified = true;
    // Akun yang mematikan "Tampilkan saran akun di profil" tidak disarankan ke orang lain
    whereClause.showSuggestion = true;

    const users = await this.userRepo.find({
      where: whereClause,
      select: ['id', 'name', 'username', 'avatar', 'bio'],
    });

    return users.slice(0, limit);
  }

  async searchUsers(userId: string, q?: string) {
    const keyword = (q || '').trim().replace(/^@/, '').toLowerCase();

    if (!keyword) {
      return [];
    }

    const blockedIds = await this.blocksService.getBlockedIds(userId);

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.username) LIKE :kw', { kw: `%${keyword}%` })
      .orWhere('LOWER(u.name) LIKE :kw', { kw: `%${keyword}%` })
      .andWhere('u.id != :userId', { userId })
      .andWhere('u.isEmailVerified = :verified', { verified: true })
      .select(['u.id', 'u.name', 'u.username', 'u.avatar'])
      .take(10);

    if (blockedIds.length > 0) {
      users.andWhere('u.id NOT IN (:...blockedIds)', { blockedIds });
    }

    return users.getMany();
  }

  async getUserProfile(targetId: string, viewerId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetId,
      );

    const user = await this.userRepo.findOne({
      where: isUuid ? { id: targetId } : { username: targetId.toLowerCase() },
      select: ['id', 'name', 'username', 'avatar', 'cover', 'bio', 'location', 'website', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Blokir dua arah: profil, postingan, dan semua konten disembunyikan.
    const [blockedByMe, blockedMe] = await Promise.all([
      this.blocksService.isBlockedBy(viewerId, user.id),
      this.blocksService.isBlockedBy(user.id, viewerId),
    ]);

    if (blockedByMe || blockedMe) {
      return {
        message: 'OK',
        data: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: null,
          cover: null,
          bio: null,
          location: null,
          website: null,
          createdAt: user.createdAt,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isSelf: viewerId === user.id,
          isBlockedByMe: blockedByMe,
          blockedMe,
        },
      };
    }

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      this.followRepo.count({ where: { following: { id: user.id } } }),
      this.followRepo.count({ where: { follower: { id: user.id } } }),
      this.followRepo.count({
        where: { follower: { id: viewerId }, following: { id: user.id } },
      }),
    ]);

    return {
      message: 'OK',
      data: {
        ...user,
        followersCount,
        followingCount,
        isFollowing: isFollowing > 0,
        isSelf: viewerId === user.id,
        isBlockedByMe: false,
        blockedMe: false,
      },
    };
  }

  async getFollowList(
    targetId: string,
    type: 'followers' | 'following',
    q?: string,
  ) {
    const qb = this.followRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect(
        type === 'followers' ? 'f.follower' : 'f.following',
        'u',
      )
      .where(
        type === 'followers'
          ? 'f.followingId = :targetId'
          : 'f.followerId = :targetId',
        { targetId },
      );

    const keyword = (q || '').trim().toLowerCase();
    if (keyword) {
      qb.andWhere('(LOWER(u.username) LIKE :kw OR LOWER(u.name) LIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    qb.orderBy('f.createdAt', 'DESC');

    const rows = await qb.getMany();
    return rows
      .map((r) => (type === 'followers' ? r.follower : r.following))
      .filter(Boolean)
      .map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
      }));
  }

  async getFollowerCount(userId: string) {
    return this.followRepo.count({
      where: { following: { id: userId } },
    });
  }

  async getFollowingCount(userId: string) {
    return this.followRepo.count({
      where: { follower: { id: userId } },
    });
  }
}
