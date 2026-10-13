import { Injectable } from '@nestjs/common';
import { Notification } from '../app/entity/notification.entity';
import { LessThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationGateway } from './notification.gateway';
import { NotificationType } from '../app/entity/notification.entity';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    private readonly notifGateway: NotificationGateway,
    private readonly blocksService: BlocksService,
  ) {}

  async createNotification(dto: {
    type: NotificationType;
    content: string;
    userId: string;
    actorId?: string;
    postId?: string;
    communityId?: string;
  }) {
    // Jangan kirim notifikasi apa pun antara akun yang diblokir dua arah.
    if (
      dto.actorId &&
      (await this.blocksService.isBlockedEitherWay(dto.userId, dto.actorId))
    ) {
      return null;
    }
    const notif = this.notifRepo.create({
      type: dto.type,
      content: dto.content,
      user: { id: dto.userId },
      ...(dto.actorId && { actor: { id: dto.actorId } }),
      ...(dto.postId && { post: { id: dto.postId } }),
      ...(dto.communityId && { community: { id: dto.communityId } }),
    });
    const saved = await this.notifRepo.save(notif);

    const fullNotif = await this.notifRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'actor', 'post', 'post.medias', 'community'],
    });

    if (!fullNotif) {
      throw new Error('Gagal membuat notifikasi');
    }

    this.notifGateway.emitNotification(fullNotif);
    return fullNotif;
  }

  async getNotifications(userId: string) {
    // Hapus otomatis notifikasi yang lebih tua dari 1 bulan
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    await this.notifRepo.delete({
      user: { id: userId },
      createdAt: LessThan(oneMonthAgo),
    });

    return this.notifRepo.find({
      where: { user: { id: userId } },
      relations: ['actor', 'post', 'post.medias', 'community'],
      order: { createdAt: 'DESC' },
    });
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { message: 'Semua notifikasi ditandai sudah dibaca' };
  }
}
