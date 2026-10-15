import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel, ChannelFollow, ChannelMessage, ChannelMessageReaction } from '../app/entity/channel.entity';
import { User } from '../app/entity/user.entity';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ChannelFollow)
    private readonly followRepo: Repository<ChannelFollow>,
    @InjectRepository(ChannelMessage)
    private readonly messageRepo: Repository<ChannelMessage>,
    @InjectRepository(ChannelMessageReaction)
    private readonly reactionRepo: Repository<ChannelMessageReaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly blocksService: BlocksService,
  ) {}

  private async requireFollow(userId: string, channelId: string) {
    const follow = await this.followRepo.findOne({
      where: { channelId, userId },
    });
    if (!follow) {
      throw new ForbiddenException('Anda belum mengikuti saluran ini');
    }
    return follow;
  }

  private async requireOwner(userId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Saluran tidak ditemukan');
    }
    if (channel.ownerId !== userId) {
      throw new ForbiddenException('Hanya pembuat saluran yang bisa melakukan ini');
    }
    return channel;
  }

  private lastSeenOf(f: { joinedAt: Date; lastReadAt: Date | null }) {
    if (f.lastReadAt && f.lastReadAt > f.joinedAt) return f.lastReadAt;
    return f.joinedAt;
  }

  private async countUnread(channelId: string, userId: string, since: Date) {
    return this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.channelId = :cid', { cid: channelId })
      .andWhere('msg.createdAt > :since', { since })
      .andWhere('(msg.senderId IS NULL OR msg.senderId != :uid)', { uid: userId })
      .getCount();
  }

  private async pruneOldMessages(channelId: string, keep = 200) {
    const total = await this.messageRepo.count({ where: { channelId } });
    if (total <= keep) return;
    const excess = total - keep;
    const old = await this.messageRepo.find({
      where: { channelId },
      order: { createdAt: 'ASC' },
      take: excess,
      select: ['id'],
    });
    if (old.length) {
      const ids = old.map((o) => o.id);
      try {
        await this.reactionRepo
          .createQueryBuilder()
          .delete()
          .where('messageId IN (:...ids)', { ids })
          .execute();
      } catch {}
      await this.messageRepo.delete(ids);
    }
  }

  private mapMessage(msg: ChannelMessage, userId: string) {
    const isVoice = !!msg.audioUrl;
    return {
      id: msg.id,
      senderId: msg.senderId,
      isMine: msg.senderId === userId,
      kind: isVoice ? 'voice' : 'text',
      text: msg.text ?? null,
      audioUrl: msg.audioUrl ?? null,
      duration: msg.duration ?? null,
      createdAt: msg.createdAt,
      reactions: [] as { emoji: string; count: number }[],
      totalReactions: 0,
      myEmoji: null as string | null,
    };
  }

  private async attachReactions(
    mapped: ReturnType<ChannelService['mapMessage']>[],
    userId: string,
  ) {
    if (!mapped.length) return mapped;
    const ids = mapped.map((m) => m.id);
    const rows = await this.reactionRepo
      .createQueryBuilder('r')
      .where('r.messageId IN (:...ids)', { ids })
      .getMany();
    const byMsg = new Map<string, ChannelMessageReaction[]>();
    for (const r of rows) {
      const arr = byMsg.get(r.messageId) ?? [];
      arr.push(r);
      byMsg.set(r.messageId, arr);
    }
    for (const m of mapped) {
      const list = byMsg.get(m.id) ?? [];
      const counts = new Map<string, number>();
      for (const r of list) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
      const groups = [...counts.entries()]
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
      m.reactions = groups;
      m.totalReactions = list.length;
      m.myEmoji = list.find((r) => r.userId === userId)?.emoji ?? null;
    }
    return mapped;
  }

  async createChannel(
    userId: string,
    dto: { name: string; description: string; avatarUrl?: string | null },
  ) {
    const name = dto.name.trim().slice(0, 50);
    const description = dto.description.trim().slice(0, 500);
    if (name.length < 3) {
      throw new BadRequestException('Nama minimal 3 karakter');
    }
    if (!description) {
      throw new BadRequestException('Deskripsi tidak boleh kosong');
    }
    const channel = await this.channelRepo.save({
      name,
      description,
      avatarUrl: dto.avatarUrl ?? null,
      ownerId: userId,
    });
    await this.followRepo.save({
      channelId: channel.id,
      userId,
      joinedAt: new Date(),
      lastReadAt: new Date(),
    });
    return this.getChannel(userId, channel.id);
  }

  async getMyChannels(userId: string) {
    const follows = await this.followRepo.find({
      where: { userId },
      relations: ['channel'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      follows.map(async (f) => {
        const c = f.channel;
        if (!c) return null;
        const since = this.lastSeenOf(f);
        const [followerCount, lastMessage, unreadCount, owner] = await Promise.all([
          this.followRepo.count({ where: { channelId: c.id } }),
          this.messageRepo.findOne({
            where: { channelId: c.id },
            order: { createdAt: 'DESC' },
          }),
          this.countUnread(c.id, userId, since),
          this.userRepo.findOne({
            where: { id: c.ownerId },
            select: ['id', 'username', 'name', 'avatar'],
          }),
        ]);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          avatarUrl: c.avatarUrl,
          ownerId: c.ownerId,
          ownerUsername: owner?.username ?? null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          followerCount,
          joinedAt: f.joinedAt,
          unreadCount,
          isOwner: c.ownerId === userId,
          lastMessage: lastMessage
            ? {
                kind: lastMessage.audioUrl ? 'voice' : 'text',
                text: lastMessage.text ?? null,
                duration: lastMessage.duration ?? null,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      }),
    ).then((rows) =>
      rows
        .filter((r): r is NonNullable<typeof r> => !!r)
        .sort((a, b) => {
          const ta = a.lastMessage?.createdAt?.toString() ?? a.updatedAt?.toString() ?? '';
          const tb = b.lastMessage?.createdAt?.toString() ?? b.updatedAt?.toString() ?? '';
          return new Date(tb).getTime() - new Date(ta).getTime();
        }),
    );
  }

  async getChannel(userId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Saluran tidak ditemukan');
    }
    const follow = await this.followRepo.findOne({
      where: { channelId, userId },
    });
    const [followerCount, owner] = await Promise.all([
      this.followRepo.count({ where: { channelId } }),
      this.userRepo.findOne({
        where: { id: channel.ownerId },
        select: ['id', 'username', 'name', 'avatar'],
      }),
    ]);
    const isOwner = channel.ownerId === userId;
    const isFollowing = !!follow;
    // Preview ala WA: non-follower boleh lihat detail (liat-liat dulu).
    // Tetap tolak kalau ada blokir dua arah dengan pemilik.
    if (!isFollowing) {
      if (await this.blocksService.isBlockedEitherWay(userId, channel.ownerId)) {
        throw new ForbiddenException('Tidak bisa melihat saluran ini');
      }
    }
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      avatarUrl: channel.avatarUrl,
      ownerId: channel.ownerId,
      ownerUsername: owner?.username ?? null,
      ownerName: owner?.name ?? null,
      ownerAvatar: owner?.avatar ?? null,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      followerCount,
      joinedAt: follow?.joinedAt ?? null,
      isOwner,
      isFollowing,
    };
  }

  async updateChannel(
    userId: string,
    channelId: string,
    patch: { name?: string; description?: string; avatarUrl?: string | null },
  ) {
    const channel = await this.requireOwner(userId, channelId);
    if (patch.name !== undefined) {
      const v = patch.name.trim().slice(0, 50);
      if (v.length < 3) {
        throw new BadRequestException('Nama minimal 3 karakter');
      }
      channel.name = v;
    }
    if (patch.description !== undefined) {
      const v = patch.description.trim().slice(0, 500);
      if (!v) {
        throw new BadRequestException('Deskripsi tidak boleh kosong');
      }
      channel.description = v;
    }
    if (patch.avatarUrl !== undefined) {
      channel.avatarUrl = patch.avatarUrl;
    }
    await this.channelRepo.save(channel);
    return this.getChannel(userId, channelId);
  }

  async getMessages(userId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Saluran tidak ditemukan');
    }
    const follow = await this.followRepo.findOne({
      where: { channelId, userId },
    });
    // Preview ala WA: non-follower boleh liat-liat isi chat (tanpa unread).
    if (!follow) {
      if (await this.blocksService.isBlockedEitherWay(userId, channel.ownerId)) {
        throw new ForbiddenException('Tidak bisa melihat saluran ini');
      }
      const messagesDesc = await this.messageRepo.find({
        where: { channelId },
        order: { createdAt: 'DESC' },
        take: 200,
      });
      const messages = [...messagesDesc].reverse();
      const mapped = messages.map((m) => this.mapMessage(m, userId));
      await this.attachReactions(mapped, userId);
      return {
        messages: mapped,
        joinedAt: null,
        unreadCount: 0,
        firstUnreadId: null,
        isPreview: true,
      };
    }
    const since = this.lastSeenOf(follow);
    // Riwayat tetap tampil untuk anggota baru: ambil 200 TERBARU (DESC)
    // tanpa filter joinedAt, lalu balik ke ASC untuk tampilan.
    // Kalau total > 200, yang lama sudah dihapus saat kirim (prune);
    // kalau riwayatnya sudah kehapus sistem, yang tampil kosong apa adanya.
    const messagesDesc = await this.messageRepo.find({
      where: { channelId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    const messages = [...messagesDesc].reverse();
    const mapped = messages.map((m) => this.mapMessage(m, userId));
    await this.attachReactions(mapped, userId);
    const unreadIds = mapped
      .filter((m) => !m.isMine && new Date(m.createdAt) > new Date(since))
      .map((m) => m.id);
    return {
      messages: mapped,
      joinedAt: follow.joinedAt,
      unreadCount: unreadIds.length,
      firstUnreadId: unreadIds[0] ?? null,
      isPreview: false,
    };
  }

  async markChannelRead(userId: string, channelId: string) {
    const follow = await this.requireFollow(userId, channelId);
    follow.lastReadAt = new Date();
    await this.followRepo.save(follow);
    return { message: 'Ditandai dibaca', unreadCount: 0 };
  }

  private async saveOwnerMessage(
    userId: string,
    channelId: string,
    msg: { text?: string | null; audioUrl?: string | null; duration?: number | null },
  ) {
    const channel = await this.requireOwner(userId, channelId);
    const saved = await this.messageRepo.save({
      channelId,
      senderId: userId,
      text: msg.text ?? null,
      audioUrl: msg.audioUrl ?? null,
      duration: msg.duration ?? null,
    });
    await this.channelRepo.update({ id: channelId }, { updatedAt: new Date() });
    // Retensi: maksimal 200 pesan per saluran. Kalau lebih, hapus yang paling lama.
    try {
      await this.pruneOldMessages(channelId, 200);
    } catch {}
    // Pembuat otomatis dianggap sudah baca sampai pesannya sendiri.
    try {
      const own = await this.followRepo.findOne({ where: { channelId, userId } });
      if (own) {
        own.lastReadAt = new Date();
        await this.followRepo.save(own);
      }
    } catch {}
    return {
      id: saved.id,
      senderId: userId,
      isMine: true,
      kind: saved.audioUrl ? 'voice' : 'text',
      text: saved.text ?? null,
      audioUrl: saved.audioUrl ?? null,
      duration: saved.duration ?? null,
      createdAt: saved.createdAt ?? new Date(),
      channelName: channel.name,
    };
  }

  async sendText(userId: string, channelId: string, text: string) {
    const v = text.trim().slice(0, 2000);
    if (!v) {
      throw new BadRequestException('Pesan tidak boleh kosong');
    }
    return this.saveOwnerMessage(userId, channelId, { text: v });
  }

  async sendVoice(userId: string, channelId: string, audioUrl: string, duration: number) {
    const url = (audioUrl || '').trim().slice(0, 2000);
    if (!url) {
      throw new BadRequestException('Audio tidak boleh kosong');
    }
    const secs = Math.round(duration);
    if (!Number.isFinite(secs) || secs < 1 || secs > 300) {
      throw new BadRequestException('Durasi VN 1–300 detik');
    }
    return this.saveOwnerMessage(userId, channelId, { audioUrl: url, duration: secs });
  }

  async follow(userId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Saluran tidak ditemukan');
    }
    const exists = await this.followRepo.findOne({
      where: { channelId, userId },
    });
    if (exists) {
      return this.getChannel(userId, channelId);
    }
    if (await this.blocksService.isBlockedEitherWay(userId, channel.ownerId)) {
      throw new ForbiddenException('Tidak bisa mengikuti saluran ini');
    }
    await this.followRepo.save({
      channelId,
      userId,
      joinedAt: new Date(),
      lastReadAt: null,
    });
    await this.channelRepo.update({ id: channelId }, { updatedAt: new Date() });
    return this.getChannel(userId, channelId);
  }

  async unfollow(userId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Saluran tidak ditemukan');
    }
    await this.requireFollow(userId, channelId);
    // Pembuat berhenti mengikuti = saluran dihapus total.
    if (channel.ownerId === userId) {
      await this.channelRepo.remove(channel);
      return { message: 'Saluran dihapus' };
    }
    await this.followRepo.delete({ channelId, userId });
    return { message: 'Berhenti mengikuti saluran' };
  }

  async reactToMessage(userId: string, channelId: string, messageId: string, emoji: string) {
    const clean = (emoji || '').trim().slice(0, 16);
    if (!clean) {
      throw new BadRequestException('Emoji tidak boleh kosong');
    }
    // Hanya yang sudah Join yang bisa kasih reaksi (preview tidak bisa).
    await this.requireFollow(userId, channelId);
    const message = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!message) {
      throw new NotFoundException('Pesan tidak ditemukan');
    }
    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId },
    });
    if (existing) {
      // Pencet emoji yang sama lagi = hapus reaksi (toggle ala WA).
      if (existing.emoji === clean) {
        await this.reactionRepo.remove(existing);
      } else {
        existing.emoji = clean;
        await this.reactionRepo.save(existing);
      }
    } else {
      await this.reactionRepo.save({
        messageId,
        channelId,
        userId,
        emoji: clean,
      });
    }
    const rows = await this.reactionRepo.find({ where: { messageId } });
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    const groups = [...counts.entries()]
      .map(([em, count]) => ({ emoji: em, count }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
    return {
      messageId,
      reactions: groups,
      totalReactions: rows.length,
      myEmoji: rows.find((r) => r.userId === userId)?.emoji ?? null,
    };
  }

  async getMessageReactions(userId: string, channelId: string, messageId: string) {
    const channel = await this.channelRepo.findOne({ where: { id: channelId } });
    if (!channel) {
      throw new NotFoundException('Saluran tidak ditemukan');
    }
    const follow = await this.followRepo.findOne({ where: { channelId, userId } });
    if (!follow) {
      if (await this.blocksService.isBlockedEitherWay(userId, channel.ownerId)) {
        throw new ForbiddenException('Tidak bisa melihat saluran ini');
      }
    }
    const message = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!message) {
      throw new NotFoundException('Pesan tidak ditemukan');
    }
    const rows = await this.reactionRepo.find({ where: { messageId } });
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    const groups = [...counts.entries()]
      .map(([em, count]) => ({ emoji: em, count }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
    return {
      messageId,
      total: rows.length,
      reactions: groups,
      myEmoji: rows.find((r) => r.userId === userId)?.emoji ?? null,
    };
  }

  async getExploreChannels(userId: string, limit = 20) {
    const take = Math.min(Math.max(limit || 20, 1), 50);
    const all = await this.channelRepo.find({
      order: { updatedAt: 'DESC' },
      take: take * 3,
    });
    const mine = await this.followRepo.find({
      where: { userId },
      select: ['channelId'],
    });
    const mineSet = new Set(mine.map((f) => f.channelId));
    const rows = await Promise.all(
      all.map(async (c) => {
        const [followerCount, owner] = await Promise.all([
          this.followRepo.count({ where: { channelId: c.id } }),
          this.userRepo.findOne({
            where: { id: c.ownerId },
            select: ['id', 'username', 'name', 'avatar'],
          }),
        ]);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          avatarUrl: c.avatarUrl,
          ownerId: c.ownerId,
          ownerUsername: owner?.username ?? null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          followerCount,
          isFollowing: mineSet.has(c.id),
          isOwner: c.ownerId === userId,
        };
      }),
    );
    rows.sort((a, b) => {
      if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return rows.slice(0, take);
  }
}
