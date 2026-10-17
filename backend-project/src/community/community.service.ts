import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  Community,
  CommunityMember,
  CommunityMessage,
} from '../app/entity/community.entity';
import { User } from '../app/entity/user.entity';
import { Follow } from '../app/entity/follow.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../app/entity/notification.entity';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepo: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly memberRepo: Repository<CommunityMember>,
    @InjectRepository(CommunityMessage)
    private readonly messageRepo: Repository<CommunityMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    private readonly notifService: NotificationService,
    private readonly blocksService: BlocksService,
  ) {}

  private async requireMembership(userId: string, communityId: string) {
    const member = await this.memberRepo.findOne({
      where: { communityId, userId },
    });
    if (!member) {
      throw new ForbiddenException('Anda bukan anggota komunitas ini');
    }
    return member;
  }

  private visibleSinceOf(m: { joinedAt: Date; clearedAt: Date | null }) {
    return m.clearedAt && m.clearedAt > m.joinedAt ? m.clearedAt : m.joinedAt;
  }

  private lastSeenOf(m: { joinedAt: Date; clearedAt: Date | null; lastReadAt: Date | null }) {
    const visible = this.visibleSinceOf(m);
    if (m.lastReadAt && m.lastReadAt > visible) return m.lastReadAt;
    return visible;
  }

  private async countUnread(communityId: string, userId: string, since: Date) {
    return this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.communityId = :cid', { cid: communityId })
      .andWhere('msg.createdAt > :since', { since })
      .andWhere('(msg.senderId IS NULL OR msg.senderId != :uid)', { uid: userId })
      .getCount();
  }

  private async firstUnreadId(communityId: string, userId: string, since: Date) {
    const row = await this.messageRepo
      .createQueryBuilder('msg')
      .select('msg.id', 'id')
      .where('msg.communityId = :cid', { cid: communityId })
      .andWhere('msg.createdAt > :since', { since })
      .andWhere('(msg.senderId IS NULL OR msg.senderId != :uid)', { uid: userId })
      .orderBy('msg.createdAt', 'ASC')
      .limit(1)
      .getRawOne();
    return (row?.id as string | undefined) ?? null;
  }

  private async requireAdmin(userId: string, communityId: string) {
    const community = await this.communityRepo.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Komunitas tidak ditemukan');
    }
    if (community.ownerId === userId) return community;
    const member = await this.memberRepo.findOne({
      where: { communityId, userId },
    });
    if (!member || !member.isAdmin) {
      throw new ForbiddenException('Hanya admin yang bisa melakukan ini');
    }
    return community;
  }

  private async requireOwner(userId: string, communityId: string) {
    const community = await this.communityRepo.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Komunitas tidak ditemukan');
    }
    if (community.ownerId !== userId) {
      throw new ForbiddenException('Hanya admin yang bisa melakukan ini');
    }
    return community;
  }

  async createCommunity(
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
    const community = await this.communityRepo.save({
      name,
      description,
      avatarUrl: dto.avatarUrl ?? null,
      ownerId: userId,
    });
    await this.memberRepo.save({
      communityId: community.id,
      userId,
      joinedAt: new Date(),
      isAdmin: true,
    });
    return this.getCommunity(userId, community.id);
  }

  async getMyCommunities(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['community'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      memberships.map(async (m) => {
        const c = m.community;
        if (!c) return null;
        const since = this.lastSeenOf(m);
        const [members, memberCount, lastMessage, unreadCount] = await Promise.all([
          this.memberRepo.find({
            where: { communityId: c.id },
            relations: ['user'],
            order: { createdAt: 'ASC' },
          }),
          this.memberRepo.count({ where: { communityId: c.id } }),
          this.messageRepo.findOne({
            where: {
              communityId: c.id,
              createdAt: MoreThan(
                m.clearedAt && m.clearedAt > m.joinedAt ? m.clearedAt : m.joinedAt,
              ),
            },
            order: { createdAt: 'DESC' },
            relations: ['sender'],
          }),
          this.countUnread(c.id, userId, since),
        ]);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          avatarUrl: c.avatarUrl,
          ownerId: c.ownerId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          memberCount,
          joinedAt: m.joinedAt,
          unreadCount,
          members: members.map((mm) => ({
            id: mm.userId,
            username: mm.user?.username ?? 'anggota',
            name: mm.user?.name ?? 'Anggota',
            avatar: mm.user?.avatar ?? null,
            joinedAt: mm.joinedAt,
            isAdmin: mm.userId === c.ownerId || mm.isAdmin,
          })),
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                senderId: lastMessage.senderId,
                isEvent: lastMessage.isEvent,
                createdAt: lastMessage.createdAt,
                audioUrl: lastMessage.audioUrl ?? null,
                voiceDuration: lastMessage.voiceDuration ?? null,
              }
            : null,
        };
      }),
    ).then((rows) =>
      rows
        .filter((r): r is NonNullable<typeof r> => !!r)
        .sort((a, b) => {
          const ta =
            a.lastMessage?.createdAt?.toString() ?? a.updatedAt?.toString() ?? '';
          const tb =
            b.lastMessage?.createdAt?.toString() ?? b.updatedAt?.toString() ?? '';
          return new Date(tb).getTime() - new Date(ta).getTime();
        }),
    );
  }

  async getCommunity(userId: string, communityId: string) {
    const member = await this.requireMembership(userId, communityId);
    const community = await this.communityRepo.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Komunitas tidak ditemukan');
    }
    const [members, memberCount] = await Promise.all([
      this.memberRepo.find({
        where: { communityId },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      }),
      this.memberRepo.count({ where: { communityId } }),
    ]);
    // Owner paling atas, lalu co-admin, baru anggota.
    const mapped = members.map((mm) => ({
      id: mm.userId,
      username: mm.user?.username ?? 'anggota',
      name: mm.user?.name ?? 'Anggota',
      avatar: mm.user?.avatar ?? null,
      joinedAt: mm.joinedAt,
      isAdmin: mm.userId === community.ownerId || mm.isAdmin,
    }));
    mapped.sort((a, b) => {
      if (a.id === community.ownerId) return -1;
      if (b.id === community.ownerId) return 1;
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return 0;
    });
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      avatarUrl: community.avatarUrl,
      ownerId: community.ownerId,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt,
      memberCount,
      joinedAt: member.joinedAt,
      members: mapped,
    };
  }

  async updateCommunity(
    userId: string,
    communityId: string,
    patch: { name?: string; description?: string; avatarUrl?: string | null },
  ) {
    const community = await this.requireOwner(userId, communityId);
    if (patch.name !== undefined) {
      const v = patch.name.trim().slice(0, 50);
      if (v.length < 3) {
        throw new BadRequestException('Nama minimal 3 karakter');
      }
      community.name = v;
    }
    if (patch.description !== undefined) {
      const v = patch.description.trim().slice(0, 500);
      if (!v) {
        throw new BadRequestException('Deskripsi tidak boleh kosong');
      }
      community.description = v;
    }
    if (patch.avatarUrl !== undefined) {
      community.avatarUrl = patch.avatarUrl;
    }
    await this.communityRepo.save(community);
    return this.getCommunity(userId, communityId);
  }

  async getMessages(userId: string, communityId: string) {
    const member = await this.requireMembership(userId, communityId);
    const visibleSince = this.visibleSinceOf(member);
    const since = this.lastSeenOf(member);
    const messages = await this.messageRepo.find({
      where: {
        communityId,
        createdAt: MoreThan(visibleSince),
      },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: 200,
    });
    const mapped = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender?.username ?? 'Sistem',
      senderUsername: msg.sender?.username ?? null,
      isMine: msg.senderId === userId,
      text: msg.text,
      isEvent: msg.isEvent,
      createdAt: msg.createdAt,
      audioUrl: msg.audioUrl ?? null,
      voiceDuration: msg.voiceDuration ?? null,
    }));
    // Unread = pesan orang lain setelah lastSeen (sudah pasti > visibleSince).
    const unreadIds = mapped
      .filter((m) => !m.isMine && new Date(m.createdAt) > new Date(since))
      .map((m) => m.id);
    return {
      messages: mapped,
      joinedAt: member.joinedAt,
      unreadCount: unreadIds.length,
      firstUnreadId: unreadIds[0] ?? null,
    };
  }

  async markCommunityRead(userId: string, communityId: string) {
    const member = await this.requireMembership(userId, communityId);
    member.lastReadAt = new Date();
    await this.memberRepo.save(member);
    return { message: 'Ditandai dibaca', unreadCount: 0 };
  }

  async sendMessage(
    userId: string,
    communityId: string,
    text: string,
    voice?: { audioUrl?: string | null; voiceDuration?: number | null },
  ) {
    const member = await this.requireMembership(userId, communityId);
    const v = text.trim().slice(0, 2000);
    if (!v) {
      throw new BadRequestException('Pesan tidak boleh kosong');
    }
    // Validasi VN: audioUrl + durasi 1-300 detik (sama kayak DM/saluran).
    const audioUrl = (voice?.audioUrl ?? '').trim() || null;
    let voiceDuration: number | null = null;
    if (audioUrl) {
      const secs = Math.round(Number(voice?.voiceDuration ?? 0));
      if (!Number.isFinite(secs) || secs < 1 || secs > 300) {
        throw new BadRequestException('Durasi VN 1–300 detik');
      }
      if (audioUrl.length > 2000) {
        throw new BadRequestException('Audio tidak valid');
      }
      voiceDuration = secs;
    }
    const saved = await this.messageRepo.save({
      communityId,
      senderId: userId,
      text: v,
      isEvent: false,
      audioUrl,
      voiceDuration,
    });
    await this.communityRepo.update({ id: communityId }, { updatedAt: new Date() });
    // Pengirim otomatis dianggap sudah baca sampai pesannya sendiri.
    try {
      member.lastReadAt = new Date();
      await this.memberRepo.save(member);
    } catch {}
    const withSender = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });
    return {
      id: saved.id,
      senderId: userId,
      senderName: withSender?.sender?.username ?? 'saya',
      isMine: true,
      text: v,
      isEvent: false,
      createdAt: saved.createdAt ?? new Date(),
      audioUrl,
      voiceDuration,
    };
  }

  async clearChat(userId: string, communityId: string) {
    const member = await this.requireMembership(userId, communityId);
    const now = new Date();
    member.clearedAt = now;
    member.lastReadAt = now;
    await this.memberRepo.save(member);
    return { message: 'Chat dibersihkan untuk Anda' };
  }

  async getExploreCommunities(userId: string, limit = 20) {
    const take = Math.min(Math.max(limit || 20, 1), 50);
    const all = await this.communityRepo.find({
      order: { updatedAt: 'DESC' },
      take: take * 3,
    });
    const myMemberships = await this.memberRepo.find({
      where: { userId },
      select: ['communityId'],
    });
    const mine = new Set(myMemberships.map((m) => m.communityId));

    const rows = await Promise.all(
      all.map(async (c) => {
        const [memberCount, owner] = await Promise.all([
          this.memberRepo.count({ where: { communityId: c.id } }),
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
          ownerName: owner?.name ?? null,
          ownerAvatar: owner?.avatar ?? null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          memberCount,
          isMember: mine.has(c.id),
        };
      }),
    );
    // Populer = anggota terbanyak dulu, lalu yang paling baru diupdate.
    rows.sort((a, b) => {
      if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return rows.slice(0, take);
  }

  async joinCommunity(userId: string, communityId: string) {
    const community = await this.communityRepo.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Komunitas tidak ditemukan');
    }
    const exists = await this.memberRepo.findOne({
      where: { communityId, userId },
    });
    if (exists) {
      return this.getCommunity(userId, communityId);
    }
    const me = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'name', 'avatar'],
    });
    if (!me) {
      throw new NotFoundException('Akun tidak ditemukan');
    }
    if (await this.blocksService.isBlockedEitherWay(userId, community.ownerId)) {
      throw new ForbiddenException('Tidak bisa bergabung ke komunitas ini');
    }
    await this.memberRepo.save({
      communityId,
      userId,
      joinedAt: new Date(),
      isAdmin: false,
    });
    const eventText = `'${me.username}' bergabung ke komunitas`;
    await this.messageRepo.save({
      communityId,
      senderId: userId,
      text: eventText,
      isEvent: true,
    });
    await this.communityRepo.update({ id: communityId }, { updatedAt: new Date() });
    // Kasih tahu owner (kecuali join sendiri — tidak mungkin, owner sudah member).
    if (community.ownerId !== userId) {
      try {
        await this.notifService.createNotification({
          type: NotificationType.COMMUNITY,
          content: `bergabung ke komunitas "${community.name}"`,
          userId: community.ownerId,
          actorId: userId,
          communityId: community.id,
        });
      } catch {}
    }
    return this.getCommunity(userId, communityId);
  }

  async addMembers(userId: string, communityId: string, targetIds: string[]) {
    const community = await this.requireAdmin(userId, communityId);
    const uniqueIds = [...new Set(targetIds)].filter((id) => !!id).slice(0, 50);
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Pilih minimal 1 akun');
    }

    const added: { id: string; username: string; name: string; avatar: string | null }[] = [];
    const events: { id: string; text: string; createdAt: Date }[] = [];

    for (const targetId of uniqueIds) {
      if (targetId === userId) continue;
      const exists = await this.memberRepo.findOne({
        where: { communityId, userId: targetId },
      });
      if (exists) continue;

      const target = await this.userRepo.findOne({
        where: { id: targetId },
        select: ['id', 'name', 'username', 'avatar'],
      });
      if (!target) continue;

      // Sumber tambah anggota = Followers admin (yang follow admin).
      const isFollower = await this.followRepo.count({
        where: { follower: { id: targetId }, following: { id: userId } },
      });
      if (isFollower === 0) {
        throw new BadRequestException(
          `@${target.username} bukan followers Anda`,
        );
      }
      if (await this.blocksService.isBlockedEitherWay(userId, targetId)) {
        throw new BadRequestException(
          `Tidak bisa menambahkan @${target.username} yang diblokir`,
        );
      }

      await this.memberRepo.save({
        communityId,
        userId: targetId,
        joinedAt: new Date(),
        isAdmin: false,
      });

      const eventText = `'${target.username}' telah ditambahkan`;
      const event = await this.messageRepo.save({
        communityId,
        senderId: userId,
        text: eventText,
        isEvent: true,
      });
      events.push({ id: event.id, text: eventText, createdAt: event.createdAt });

      await this.notifService.createNotification({
        type: NotificationType.COMMUNITY,
        content: `menambahkan Anda ke komunitas "${community.name}"`,
        userId: targetId,
        actorId: userId,
        communityId: community.id,
      });

      added.push({
        id: target.id,
        username: target.username,
        name: target.name,
        avatar: target.avatar ?? null,
      });
    }

    await this.communityRepo.update({ id: communityId }, { updatedAt: new Date() });
    return { message: 'Anggota ditambahkan', data: { added, events } };
  }

  async promoteAdmin(userId: string, communityId: string, targetId: string) {
    const community = await this.requireAdmin(userId, communityId);
    if (targetId === community.ownerId) {
      throw new BadRequestException('Pemilik sudah menjadi admin');
    }
    const target = await this.memberRepo.findOne({
      where: { communityId, userId: targetId },
      relations: ['user'],
    });
    if (!target) {
      throw new NotFoundException('Anggota tidak ditemukan');
    }
    if (target.isAdmin) {
      throw new BadRequestException('Sudah menjadi admin');
    }
    target.isAdmin = true;
    await this.memberRepo.save(target);
    const eventText = `'${target.user?.username ?? 'anggota'}' telah menjadi admin`;
    await this.messageRepo.save({
      communityId,
      senderId: userId,
      text: eventText,
      isEvent: true,
    });
    await this.communityRepo.update({ id: communityId }, { updatedAt: new Date() });
    try {
      await this.notifService.createNotification({
        type: NotificationType.COMMUNITY,
        content: `menaikkan Anda menjadi admin komunitas "${community.name}"`,
        userId: targetId,
        actorId: userId,
        communityId: community.id,
      });
    } catch {}
    return this.getCommunity(userId, communityId);
  }

  async removeMember(userId: string, communityId: string, targetId: string) {
    const community = await this.requireAdmin(userId, communityId);
    if (targetId === userId) {
      throw new BadRequestException('Gunakan menu Keluar untuk diri sendiri');
    }
    if (targetId === community.ownerId) {
      throw new ForbiddenException('Pemilik tidak bisa dikeluarkan');
    }
    const target = await this.memberRepo.findOne({
      where: { communityId, userId: targetId },
      relations: ['user'],
    });
    if (!target) {
      throw new NotFoundException('Anggota tidak ditemukan');
    }
    // Co-admin hanya boleh mengeluarkan anggota biasa;
    // mengeluarkan sesama admin khusus pemilik.
    if (target.isAdmin && community.ownerId !== userId) {
      throw new ForbiddenException('Hanya pemilik yang bisa mengeluarkan admin');
    }
    const targetName = target.user?.username ?? 'anggota';
    // Event dibuat sebelum membership dihapus: hanya yang masih stay yang lihat,
    // yang dikeluarkan tidak (sama seperti event keluar).
    await this.messageRepo.save({
      communityId,
      senderId: userId,
      text: `'${targetName}' telah dikeluarkan`,
      isEvent: true,
    });
    await this.memberRepo.delete({ communityId, userId: targetId });
    await this.communityRepo.update({ id: communityId }, { updatedAt: new Date() });
    // Notif untuk yang dikeluarkan, gayanya sama seperti notif gabung komunitas.
    try {
      await this.notifService.createNotification({
        type: NotificationType.COMMUNITY,
        content: `mengeluarkan Anda dari komunitas "${community.name}"`,
        userId: targetId,
        actorId: userId,
        communityId: community.id,
      });
    } catch {}
    return this.getCommunity(userId, communityId);
  }

  async leaveCommunity(userId: string, communityId: string) {
    const community = await this.communityRepo.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Komunitas tidak ditemukan');
    }
    await this.requireMembership(userId, communityId);
    // Owner keluar = komunitas dihapus total (cascade ke members/messages).
    if (community.ownerId === userId) {
      await this.communityRepo.remove(community);
      return { message: 'Komunitas dihapus' };
    }
    // Event keluar hanya untuk anggota yang masih stay:
    // dibuat sebelum membership dihapus, jadi si yang keluar tidak melihatnya
    // (requireMembership-nya sudah gagal), anggota lain melihatnya karena
    // createdAt event > joinedAt mereka.
    const me = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username'],
    });
    await this.messageRepo.save({
      communityId,
      senderId: userId,
      text: `'${me?.username ?? 'anggota'}' telah keluar`,
      isEvent: true,
    });
    await this.memberRepo.delete({ communityId, userId });
    await this.communityRepo.update({ id: communityId }, { updatedAt: new Date() });
    return { message: 'Berhasil keluar dari komunitas' };
  }
}
