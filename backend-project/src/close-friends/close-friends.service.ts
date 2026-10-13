import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloseFriend } from '../app/entity/close-friend.entity';
import { Follow } from '../app/entity/follow.entity';
import { User } from '../app/entity/user.entity';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class CloseFriendsService {
  constructor(
    @InjectRepository(CloseFriend)
    private readonly closeRepo: Repository<CloseFriend>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly blocksService: BlocksService,
  ) {}

  async getCloseFriendIds(ownerId: string): Promise<string[]> {
    const rows = await this.closeRepo.find({
      where: { ownerId },
      select: ['friendId'],
    });
    return rows.map((r) => r.friendId);
  }

  async getCloseFriendList(ownerId: string) {
    const rows = await this.closeRepo.find({
      where: { ownerId },
      relations: { friend: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.friend.id,
      name: r.friend.name,
      username: r.friend.username,
      avatar: r.friend.avatar,
      addedAt: r.createdAt,
    }));
  }

  async isCloseFriend(ownerId: string, friendId: string): Promise<boolean> {
    const count = await this.closeRepo.count({
      where: { ownerId, friendId },
    });
    return count > 0;
  }

  async addCloseFriend(ownerId: string, friendId: string) {
    if (ownerId === friendId) {
      throw new BadRequestException('Tidak bisa menambahkan akun sendiri');
    }

    const target = await this.userRepo.findOne({
      where: { id: friendId },
      select: ['id'],
    });
    if (!target) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    if (await this.blocksService.isBlockedEitherWay(ownerId, friendId)) {
      throw new BadRequestException(
        'Tidak bisa menambahkan akun yang diblokir',
      );
    }

    // Hanya pengikut (followers) yang boleh jadi teman dekat:
    // friendId harus mengikuti ownerId.
    const isFollower = await this.followRepo.count({
      where: {
        follower: { id: friendId },
        following: { id: ownerId },
      },
    });
    if (isFollower === 0) {
      throw new BadRequestException('Hanya pengikut yang bisa jadi teman dekat');
    }

    const existing = await this.closeRepo.findOne({
      where: { ownerId, friendId },
    });
    if (!existing) {
      await this.closeRepo.save({ ownerId, friendId });
    }

    return { message: 'Ditambahkan ke teman dekat', data: { closeFriend: true } };
  }

  async removeCloseFriend(ownerId: string, friendId: string) {
    await this.closeRepo.delete({ ownerId, friendId });
    return { message: 'Dihapus dari teman dekat', data: { closeFriend: false } };
  }
}
