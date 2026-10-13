import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikeController } from './like.controller';
import { LikeService } from './like.service';
import { LikeGateway } from './like.gateway';
import { Likes } from 'src/app/entity/like.entity';
import { Posts } from 'src/app/entity/posts.entity';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Likes, Posts]),
    NotificationModule,
  ],
  controllers: [LikeController],
  providers: [LikeService, LikeGateway],
})
export class LikeModule {}
