import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CommunityService } from './community.service';
import { AtGuard } from '../common/guards/at.guard';
import {
  AddCommunityMembersDto,
  CreateCommunityDto,
  PromoteCommunityAdminDto,
  SendCommunityMessageDto,
  UpdateCommunityDto,
} from './dto/community.dto';

@UseGuards(AtGuard)
@Controller('communities')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  @Post()
  async create(@Body() dto: CreateCommunityDto) {
    const data = await this.communityService.createCommunity(
      this.req.user.sub,
      dto,
    );
    return { message: 'OK', data };
  }

  @Get()
  async list() {
    const data = await this.communityService.getMyCommunities(
      this.req.user.sub,
    );
    return { message: 'OK', data };
  }

  @Get('explore/popular')
  async explore() {
    const data = await this.communityService.getExploreCommunities(
      this.req.user.sub,
      20,
    );
    return { message: 'OK', data };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.communityService.getCommunity(
      this.req.user.sub,
      id,
    );
    return { message: 'OK', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCommunityDto) {
    const data = await this.communityService.updateCommunity(
      this.req.user.sub,
      id,
      dto,
    );
    return { message: 'OK', data };
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string) {
    const data = await this.communityService.getMessages(
      this.req.user.sub,
      id,
    );
    return { message: 'OK', data };
  }

  @Post(':id/messages')
  async send(@Param('id') id: string, @Body() dto: SendCommunityMessageDto) {
    const data = await this.communityService.sendMessage(
      this.req.user.sub,
      id,
      dto.text,
      { audioUrl: dto.audioUrl ?? null, voiceDuration: dto.voiceDuration ?? null },
    );
    return { message: 'OK', data };
  }

  @Delete(':id/messages')
  async clear(@Param('id') id: string) {
    const data = await this.communityService.clearChat(this.req.user.sub, id);
    return { message: 'OK', data };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string) {
    const data = await this.communityService.markCommunityRead(
      this.req.user.sub,
      id,
    );
    return { message: 'OK', data };
  }

  @Post(':id/join')
  async join(@Param('id') id: string) {
    const data = await this.communityService.joinCommunity(
      this.req.user.sub,
      id,
    );
    return { message: 'OK', data };
  }

  @Post(':id/members')
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddCommunityMembersDto,
  ) {
    const data = await this.communityService.addMembers(
      this.req.user.sub,
      id,
      dto.userIds,
    );
    return { message: 'OK', data };
  }

  @Post(':id/admins')
  async promote(
    @Param('id') id: string,
    @Body() dto: PromoteCommunityAdminDto,
  ) {
    const data = await this.communityService.promoteAdmin(
      this.req.user.sub,
      id,
      dto.userId,
    );
    return { message: 'OK', data };
  }

  @Delete(':id/members/me')
  async leave(@Param('id') id: string) {
    const data = await this.communityService.leaveCommunity(
      this.req.user.sub,
      id,
    );
    return { message: 'OK', data };
  }

  @Delete(':id/members/:targetId')
  async removeMember(
    @Param('id') id: string,
    @Param('targetId') targetId: string,
  ) {
    const data = await this.communityService.removeMember(
      this.req.user.sub,
      id,
      targetId,
    );
    return { message: 'OK', data };
  }
}
