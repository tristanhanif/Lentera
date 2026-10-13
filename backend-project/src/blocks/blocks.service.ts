import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBlock } from '../app/entity/user-block.entity';
import { Follow } from '../app/entity/follow.entity';

// Sumber kebenaran tunggal untuk relasi blokir.
// getBlockedIds(userId) = semua id yang wajib disembunyikan dari user ini
// (yang dia blokir + yang memblokir dia) -> dipakai semua query list/detail.
@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
  ) {}

  // Id user lain yang terhubung blokir dua arah dengan user ini.
  async getBlockedIds(userId: string): Promise<string[]> {
    const rows = await this.blockRepo.find({
      where: [{ blockerId: userId }, { blockedId: userId }],
      select: ['blockerId', 'blockedId'],
    });
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.blockerId !== userId) ids.add(r.blockerId);
      if (r.blockedId !== userId) ids.add(r.blockedId);
    }
    return [...ids];
  }

  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    if (a === b) return false;
    const count = await this.blockRepo.count({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
    return count > 0;
  }

  async isBlockedBy(me: string, other: string): Promise<boolean> {
    const count = await this.blockRepo.count({
      where: { blockerId: me, blockedId: other },
    });
    return count > 0;
  }

  async blockUser(me: string, targetId: string) {
    if (me === targetId) {
      return { message: 'Tidak bisa memblokir akun sendiri', data: { blocked: false } };
    }

    const existing = await this.blockRepo.findOne({
      where: { blockerId: me, blockedId: targetId },
    });
    if (!existing) {
      await this.blockRepo.save({ blockerId: me, blockedId: targetId });
    }

    // Blokir memutus follow dua arah (seperti Instagram).
    await this.followRepo
      .createQueryBuilder()
      .delete()
      .where(
        '(followerId = :me AND followingId = :target) OR (followerId = :target AND followingId = :me)',
        { me, target: targetId },
      )
      .execute();

    return { message: 'Akun berhasil diblokir', data: { blocked: true } };
  }

  async unblockUser(me: string, targetId: string) {
    await this.blockRepo.delete({ blockerId: me, blockedId: targetId });
    return { message: 'Blokir berhasil dibuka', data: { blocked: false } };
  }

  async getBlockedList(me: string) {
    const rows = await this.blockRepo.find({
      where: { blockerId: me },
      relations: { blocked: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.blocked.id,
      name: r.blocked.name,
      username: r.blocked.username,
      avatar: r.blocked.avatar,
      blockedAt: r.createdAt,
    }));
  }

  async getBlockIds(me: string) {
    const [blockedByMe, blockedMe] = await Promise.all([
      this.blockRepo.find({ where: { blockerId: me }, select: ['blockedId'] }),
      this.blockRepo.find({ where: { blockedId: me }, select: ['blockerId'] }),
    ]);
    return {
      blockedByMe: blockedByMe.map((r) => r.blockedId),
      blockedMe: blockedMe.map((r) => r.blockerId),
    };
  }
}
