import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import {
  Community,
  CommunityMember,
  CommunityMessage,
} from '../app/entity/community.entity';
import { User } from '../app/entity/user.entity';
import { Follow } from '../app/entity/follow.entity';
import { NotificationModule } from '../notification/notification.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Community, CommunityMember, CommunityMessage, User, Follow]),
    NotificationModule,
    BlocksModule,
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
