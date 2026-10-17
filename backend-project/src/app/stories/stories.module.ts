import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story, StoryMedia, StoryView, StoryLike } from '../entity/story.entity';
import { User } from '../entity/user.entity';
import { CloseFriend } from '../entity/close-friend.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { StoriesCleanupService } from './stories.cron';
import { ChatModule } from 'src/chat/chat.module';
import { NotificationModule } from 'src/notification/notification.module';
import { BlocksModule } from 'src/blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Story,
      StoryMedia,
      StoryView,
      StoryLike,
      User,
      CloseFriend,
    ]),
    ChatModule,
    NotificationModule,
    BlocksModule,
  ],
  providers: [StoriesService, StoriesCleanupService],
  controllers: [StoriesController],
  exports: [StoriesService],
})
export class StoriesModule {}
