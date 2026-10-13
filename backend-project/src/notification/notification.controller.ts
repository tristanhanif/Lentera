import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { NotificationService } from './notification.service';
import { AtGuard } from '../common/guards/at.guard';

@UseGuards(AtGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notifService: NotificationService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  @Get()
  async getNotifications() {
    const data = await this.notifService.getNotifications(this.req.user.sub);
    return { message: 'OK', data };
  }

  @Patch('read')
  async markAllRead() {
    return this.notifService.markAllRead(this.req.user.sub);
  }
}
