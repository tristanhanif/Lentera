import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AtGuard } from 'src/common/guards/at.guard';
import { CloseFriendsService } from './close-friends.service';

@UseGuards(AtGuard)
@Controller('users/close-friends')
export class CloseFriendsController {
  constructor(
    private readonly closeFriendsService: CloseFriendsService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  // Daftar teman dekat saya (untuk ceklis di /akun/teman_dekat).
  @Get()
  async getList() {
    const data = await this.closeFriendsService.getCloseFriendList(
      this.req.user.sub,
    );
    return { message: 'OK', data };
  }

  // Id cepat untuk state ceklis.
  @Get('ids')
  async getIds() {
    const data = await this.closeFriendsService.getCloseFriendIds(
      this.req.user.sub,
    );
    return { message: 'OK', data };
  }

  @Post(':id')
  async add(@Param('id') friendId: string) {
    return this.closeFriendsService.addCloseFriend(
      this.req.user.sub,
      friendId,
    );
  }

  @Delete(':id')
  async remove(@Param('id') friendId: string) {
    return this.closeFriendsService.removeCloseFriend(
      this.req.user.sub,
      friendId,
    );
  }
}
