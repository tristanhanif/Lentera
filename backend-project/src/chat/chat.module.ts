import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { Conversation } from '../app/entity/conversation.entity';
import { Message } from '../app/entity/message.entity';
import { User } from '../app/entity/user.entity';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User]), BlocksModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
