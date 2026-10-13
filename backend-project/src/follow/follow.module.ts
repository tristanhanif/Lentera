import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from '../app/entity/follow.entity';
import { User } from '../app/entity/user.entity';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { NotificationModule } from '../notification/notification.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, User]),
    NotificationModule,
    BlocksModule,
  ],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
