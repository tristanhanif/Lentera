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
import { ChatService } from './chat.service';
import { AtGuard } from '../common/guards/at.guard';
import {
  CreateConversationDto,
  PinMessageDto,
  SendMessageDto,
} from './dto/chat.dto';

@UseGuards(AtGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  @Get('conversations')
  async getConversations() {
    const data = await this.chatService.getConversations(this.req.user.sub);
    return { message: 'OK', data };
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(@Param('conversationId') conversationId: string) {
    const data = await this.chatService.getMessages(
      this.req.user.sub,
      conversationId,
    );
    return { message: 'OK', data };
  }

  @Post('conversations')
  async createConversation(@Body() dto: CreateConversationDto) {
    const data = await this.chatService.createConversation(
      this.req.user.sub,
      dto.userId,
    );
    return { message: 'OK', data };
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendMessage(
      this.req.user.sub,
      conversationId,
      dto.text,
      dto.replyToId,
      {
        storyId: dto.storyId ?? null,
        storyMediaUrl: dto.storyMediaUrl ?? null,
        storyMediaType: dto.storyMediaType ?? null,
        storyOwnerUsername: dto.storyOwnerUsername ?? null,
      },
      {
        noteId: dto.noteId ?? null,
        noteText: dto.noteText ?? null,
        noteType: dto.noteType ?? null,
        noteMusicTitle: dto.noteMusicTitle ?? null,
        noteMusicArtist: dto.noteMusicArtist ?? null,
        noteOwnerUsername: dto.noteOwnerUsername ?? null,
        noteOwnerAvatar: dto.noteOwnerAvatar ?? null,
        noteExpiresAt: dto.noteExpiresAt ?? null,
      },
      {
        postId: dto.postId ?? null,
        postMediaUrl: dto.postMediaUrl ?? null,
        postMediaType: dto.postMediaType ?? null,
        postOwnerUsername: dto.postOwnerUsername ?? null,
        postOwnerAvatar: dto.postOwnerAvatar ?? null,
        postContent: dto.postContent ?? null,
        postMediaCount: dto.postMediaCount ?? null,
      },
      {
        fileUrl: dto.fileUrl ?? null,
        fileName: dto.fileName ?? null,
        fileSize: dto.fileSize ?? null,
        fileType: dto.fileType ?? null,
      },
    );
    return { message: 'OK', data };
  }

  @Delete('messages/:messageId')
  async unsendMessage(@Param('messageId') messageId: string) {
    const data = await this.chatService.unsendMessage(
      this.req.user.sub,
      messageId,
    );
    return { message: 'OK', data };
  }

  @Patch('messages/:messageId/star')
  async starMessage(@Param('messageId') messageId: string) {
    const data = await this.chatService.starMessage(
      this.req.user.sub,
      messageId,
    );
    return { message: 'OK', data };
  }

  @Patch('messages/:messageId/pin')
  async pinMessage(
    @Param('messageId') messageId: string,
    @Body() dto: PinMessageDto,
  ) {
    const data = await this.chatService.pinMessage(
      this.req.user.sub,
      messageId,
      dto.durationInMinutes,
    );
    return { message: 'OK', data };
  }

  @Patch('messages/:messageId/unpin')
  async unpinMessage(@Param('messageId') messageId: string) {
    const data = await this.chatService.unpinMessage(
      this.req.user.sub,
      messageId,
    );
    return { message: 'OK', data };
  }

  // Clear chat: hapus seluruh tampilan chat hanya untuk saya.
  @Delete('conversations/:conversationId/messages')
  async clearChat(@Param('conversationId') conversationId: string) {
    const data = await this.chatService.clearChat(
      this.req.user.sub,
      conversationId,
    );
    return { message: 'OK', data };
  }
}
