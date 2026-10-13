import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import {
  Channel,
  ChannelFollow,
  ChannelMessage,
} from '../app/entity/channel.entity';
import { User } from '../app/entity/user.entity';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelFollow, ChannelMessage, User]),
    BlocksModule,
  ],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
