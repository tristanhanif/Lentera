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
import { ChannelService } from './channel.service';
import { AtGuard } from '../common/guards/at.guard';
import {
  CreateChannelDto,
  SendChannelTextDto,
  SendChannelVoiceDto,
  UpdateChannelDto,
} from './dto/channel.dto';

@UseGuards(AtGuard)
@Controller('channels')
export class ChannelController {
  constructor(
    private readonly channelService: ChannelService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  @Post()
  async create(@Body() dto: CreateChannelDto) {
    const data = await this.channelService.createChannel(
      this.req.user.sub,
      dto,
    );
    return { message: 'OK', data };
  }

  @Get()
  async list() {
    const data = await this.channelService.getMyChannels(this.req.user.sub);
    return { message: 'OK', data };
  }

  @Get('explore/popular')
  async explore() {
    const data = await this.channelService.getExploreChannels(
      this.req.user.sub,
      20,
    );
    return { message: 'OK', data };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.channelService.getChannel(this.req.user.sub, id);
    return { message: 'OK', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChannelDto) {
    const data = await this.channelService.updateChannel(
      this.req.user.sub,
      id,
      dto,
    );
    return { message: 'OK', data };
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string) {
    const data = await this.channelService.getMessages(this.req.user.sub, id);
    return { message: 'OK', data };
  }

  @Post(':id/messages')
  async sendText(@Param('id') id: string, @Body() dto: SendChannelTextDto) {
    const data = await this.channelService.sendText(
      this.req.user.sub,
      id,
      dto.text,
    );
    return { message: 'OK', data };
  }

  @Post(':id/voice')
  async sendVoice(@Param('id') id: string, @Body() dto: SendChannelVoiceDto) {
    const data = await this.channelService.sendVoice(
      this.req.user.sub,
      id,
      dto.audioUrl,
      dto.duration,
    );
    return { message: 'OK', data };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string) {
    const data = await this.channelService.markChannelRead(
      this.req.user.sub,
      id,
    );
    return { message: 'OK', data };
  }

  @Post(':id/follow')
  async follow(@Param('id') id: string) {
    const data = await this.channelService.follow(this.req.user.sub, id);
    return { message: 'OK', data };
  }

  @Delete(':id/follow')
  async unfollow(@Param('id') id: string) {
    const data = await this.channelService.unfollow(this.req.user.sub, id);
    return { message: 'OK', data };
  }
}
