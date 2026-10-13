import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostController } from './posts.controller';
import { Posts } from '../entity/posts.entity';
import { Media } from '../entity/media.entity';
import { User } from '../entity/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { BlocksModule } from 'src/blocks/blocks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Posts, Media, User]), NotificationModule, BlocksModule],
  providers: [PostsService],
  controllers: [PostController],
  exports: [PostsService],
})
export class PostsModule {}
