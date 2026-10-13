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
import { BlocksService } from './blocks.service';

@UseGuards(AtGuard)
@Controller('users/blocks')
export class BlocksController {
  constructor(
    private readonly blocksService: BlocksService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  // Daftar akun yang saya blokir (untuk halaman /akun/akun_blok).
  @Get()
  async getBlockedList() {
    const data = await this.blocksService.getBlockedList(this.req.user.sub);
    return { message: 'OK', data };
  }

  // Id cepat untuk filter di client (disembunyikan dua arah).
  @Get('ids')
  async getBlockIds() {
    const data = await this.blocksService.getBlockIds(this.req.user.sub);
    return { message: 'OK', data };
  }

  @Post(':id')
  async blockUser(@Param('id') targetId: string) {
    return this.blocksService.blockUser(this.req.user.sub, targetId);
  }

  @Delete(':id')
  async unblockUser(@Param('id') targetId: string) {
    return this.blocksService.unblockUser(this.req.user.sub, targetId);
  }
}
