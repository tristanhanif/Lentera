import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloseFriend } from '../app/entity/close-friend.entity';
import { Follow } from '../app/entity/follow.entity';
import { User } from '../app/entity/user.entity';
import { CloseFriendsService } from './close-friends.service';
import { CloseFriendsController } from './close-friends.controller';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [TypeOrmModule.forFeature([CloseFriend, Follow, User]), BlocksModule],
  controllers: [CloseFriendsController],
  providers: [CloseFriendsService],
  exports: [CloseFriendsService],
})
export class CloseFriendsModule {}
