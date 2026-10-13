import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { AtGuard } from 'src/common/guards/at.guard';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@UseGuards(AtGuard)
@Controller('users')
export class FollowController {
  constructor(
    private readonly followService: FollowService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  @Post('follow/:id')
  async toggleFollow(@Param('id') targetId: string) {
    return this.followService.toggleFollow(this.req.user.sub, targetId);
  }

  @Get('suggestions')
  async getSuggestions() {
    const data = await this.followService.getSuggestions(this.req.user.sub);
    return { message: 'OK', data };
  }

  @Get('search')
  async searchUsers(@Query('q') q: string) {
    const data = await this.followService.searchUsers(this.req.user.sub, q);
    return { message: 'OK', data };
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') id: string, @Query('q') q?: string) {
    const data = await this.followService.getFollowList(id, 'followers', q);
    return { message: 'OK', data };
  }

  @Get(':id/following')
  async getFollowing(@Param('id') id: string, @Query('q') q?: string) {
    const data = await this.followService.getFollowList(id, 'following', q);
    return { message: 'OK', data };
  }

  @Get(':id')
  async getUserProfile(@Param('id') id: string) {
    return this.followService.getUserProfile(id, this.req.user.sub);
  }
}
