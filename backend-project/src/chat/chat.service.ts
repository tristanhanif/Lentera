import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Conversation } from '../app/entity/conversation.entity';
import { Message } from '../app/entity/message.entity';
import { User } from '../app/entity/user.entity';
import { ChatGateway } from './chat.gateway';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly chatGateway: ChatGateway,
    private readonly blocksService: BlocksService,
  ) {}

  private otherUserId(conv: Conversation, me: string): string {
    return conv.user1Id === me ? conv.user2Id : conv.user1Id;
  }

  async getConversations(userId: string) {
    const blockedIds = new Set(await this.blocksService.getBlockedIds(userId));
    const conversations = await this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.user1', 'user1')
      .leftJoinAndSelect('conversation.user2', 'user2')
      .leftJoinAndSelect('conversation.messages', 'lastMsg', 'lastMsg.id = conversation.id')
      .where('conversation.user1Id = :userId OR conversation.user2Id = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();

    // Ambil last message untuk setiap conversation
    // (hanya pesan setelah waktu Clear chat user tsb, lawan bicara tidak ikut).
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const clearedAt =
          conv.user1Id === userId ? conv.user1ClearedAt : conv.user2ClearedAt;
        const visibleFilter = clearedAt
          ? { createdAt: MoreThan(clearedAt) }
          : {};
        const lastMessage = await this.messageRepo.findOne({
          where: {
            conversationId: conv.id,
            isEvent: false,
            ...visibleFilter,
          },
          order: { createdAt: 'DESC' },
          relations: ['sender'],
        });

        // Hitung unread messages (hanya yang masih terlihat setelah Clear chat)
        const unreadCount = await this.messageRepo.count({
          where: {
            conversationId: conv.id,
            senderId: conv.user1Id === userId ? conv.user2Id : conv.user1Id,
            isRead: false,
            ...visibleFilter,
          },
        });

        const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;

        return {
          id: conv.id,
          otherUser: {
            id: otherUser.id,
            name: otherUser.name,
            username: otherUser.username,
            avatar: otherUser.avatar,
          },
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                senderId: lastMessage.senderId,
                isRead: lastMessage.isRead,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
          updatedAt: conv.updatedAt,
        };
      }),
    );

    // Sort by last message time or updatedAt
    result.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.updatedAt;
      const timeB = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    // Saluran chat dengan akun yang diblokir dua arah ikut dihilangkan.
    return result.filter((c) => !blockedIds.has(c.otherUser.id));
  }

  async getMessages(userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation tidak ditemukan');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new BadRequestException('Anda tidak memiliki akses ke conversation ini');
    }

    // Chat dengan akun yang diblokir dua arah ikut dihilangkan.
    if (await this.blocksService.isBlockedEitherWay(userId, this.otherUserId(conversation, userId))) {
      throw new NotFoundException('Conversation tidak ditemukan');
    }

    // Clear chat hanya untuk saya: sembunyikan pesan sebelum waktu clear user ini.
    const clearedAt =
      conversation.user1Id === userId
        ? conversation.user1ClearedAt
        : conversation.user2ClearedAt;

    const messages = await this.messageRepo.find({
      where: {
        conversationId,
        ...(clearedAt ? { createdAt: MoreThan(clearedAt) } : {}),
      },
      relations: ['sender', 'replyTo', 'replyTo.sender'],
      order: { createdAt: 'ASC' },
    });

    // Tandai semua pesan dari lawan bicara sebagai sudah dibaca
    // (hanya yang masih terlihat setelah Clear chat).
    const otherUserId =
      conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;

    const readAt = new Date();
    const updateResult = await this.messageRepo.update(
      {
        conversationId,
        senderId: otherUserId,
        isRead: false,
        ...(clearedAt ? { createdAt: MoreThan(clearedAt) } : {}),
      },
      { isRead: true, readAt },
    );

    // Kabari pengirim secara realtime supaya centangnya membiru
    if (updateResult.affected && updateResult.affected > 0) {
      for (const m of messages) {
        if (m.senderId === otherUserId && !m.isRead) {
          m.isRead = true;
          m.readAt = readAt;
        }
      }
      this.chatGateway.emitMessagesRead(
        conversationId,
        userId,
        otherUserId,
        readAt,
      );
    }

    return {
      conversation: {
        id: conversation.id,
        user1: conversation.user1Id,
        user2: conversation.user2Id,
      },
      messages,
    };
  }

  async createConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Tidak bisa membuat conversation dengan diri sendiri');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (await this.blocksService.isBlockedEitherWay(userId, targetUserId)) {
      throw new ForbiddenException('Anda tidak bisa berkirim pesan dengan akun ini');
    }

    // Cek apakah conversation sudah ada
    const existing = await this.conversationRepo
      .createQueryBuilder('conv')
      .where(
        '(conv.user1Id = :userId AND conv.user2Id = :targetUserId) OR (conv.user1Id = :targetUserId AND conv.user2Id = :userId)',
        { userId, targetUserId },
      )
      .getOne();

    if (existing) {
      return existing;
    }

    const conversation = this.conversationRepo.create({
      user1Id: userId,
      user2Id: targetUserId,
    });

    return this.conversationRepo.save(conversation);
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    text: string,
    replyToId?: string,
    storyReply?: {
      storyId?: string | null;
      storyMediaUrl?: string | null;
      storyMediaType?: string | null;
      storyOwnerUsername?: string | null;
    },
    noteReply?: {
      noteId?: string | null;
      noteText?: string | null;
      noteType?: string | null;
      noteMusicTitle?: string | null;
      noteMusicArtist?: string | null;
      noteOwnerUsername?: string | null;
      noteOwnerAvatar?: string | null;
      noteExpiresAt?: Date | string | null;
    },
    postReply?: {
      postId?: string | null;
      postMediaUrl?: string | null;
      postMediaType?: string | null;
      postOwnerUsername?: string | null;
      postOwnerAvatar?: string | null;
      postContent?: string | null;
      postMediaCount?: number | null;
    },
    fileAttachment?: {
      fileUrl?: string | null;
      fileName?: string | null;
      fileSize?: number | null;
      fileType?: string | null;
    },
  ) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation tidak ditemukan');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new BadRequestException('Anda tidak memiliki akses ke conversation ini');
    }

    if (await this.blocksService.isBlockedEitherWay(userId, this.otherUserId(conversation, userId))) {
      throw new ForbiddenException('Anda tidak bisa berkirim pesan dengan akun ini');
    }

    let validReplyToId: string | null = null;
    if (replyToId) {
      const replyTarget = await this.messageRepo.findOne({
        where: { id: replyToId, conversationId },
      });
      if (!replyTarget || replyTarget.isEvent) {
        throw new BadRequestException('Pesan yang dibalas tidak valid');
      }
      validReplyToId = replyToId;
    }

    // Validasi lampiran: 1 file per pesan, pdf/docs/gambar saja, maks 20MB.
    const ALLOWED_FILE_TYPES = [
      'image',
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
    ];
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const fileUrl = fileAttachment?.fileUrl ?? null;
    if (fileUrl) {
      const fileType = (fileAttachment?.fileType ?? '').toLowerCase();
      if (!ALLOWED_FILE_TYPES.includes(fileType)) {
        throw new BadRequestException(
          'Tipe file tidak didukung (pdf, doc, xls, ppt, txt, gambar)',
        );
      }
      const fileSize = fileAttachment?.fileSize ?? 0;
      if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
        throw new BadRequestException('Ukuran file maksimal 20MB');
      }
    }

    const message = this.messageRepo.create({
      text,
      senderId: userId,
      conversationId,
      replyToId: validReplyToId,
      storyId: storyReply?.storyId ?? null,
      storyMediaUrl: storyReply?.storyMediaUrl ?? null,
      storyMediaType: storyReply?.storyMediaType ?? null,
      storyOwnerUsername: storyReply?.storyOwnerUsername ?? null,
      noteId: noteReply?.noteId ?? null,
      noteText: noteReply?.noteText ?? null,
      noteType: noteReply?.noteType ?? null,
      noteMusicTitle: noteReply?.noteMusicTitle ?? null,
      noteMusicArtist: noteReply?.noteMusicArtist ?? null,
      noteOwnerUsername: noteReply?.noteOwnerUsername ?? null,
      noteOwnerAvatar: noteReply?.noteOwnerAvatar ?? null,
      noteExpiresAt: noteReply?.noteExpiresAt
        ? new Date(noteReply.noteExpiresAt)
        : null,
      postId: postReply?.postId ?? null,
      postMediaUrl: postReply?.postMediaUrl ?? null,
      postMediaType: postReply?.postMediaType ?? null,
      postOwnerUsername: postReply?.postOwnerUsername ?? null,
      postOwnerAvatar: postReply?.postOwnerAvatar ?? null,
      postContent: postReply?.postContent ?? null,
      postMediaCount: postReply?.postMediaCount ?? 1,
      fileUrl: fileAttachment?.fileUrl ?? null,
      fileName: fileAttachment?.fileName ?? null,
      fileSize: fileAttachment?.fileSize ?? null,
      fileType: fileAttachment?.fileType
        ? fileAttachment.fileType.toLowerCase()
        : null,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Load relasi sender
    const fullMessage = await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'replyTo', 'replyTo.sender'],
    });

    if (!fullMessage) {
      throw new Error('Gagal mengirim pesan');
    }

    // Update conversation
    await this.conversationRepo.update(conversationId, {
      lastMessage: text,
      lastMessageAt: new Date(),
    });

    // Emit via WebSocket
    this.chatGateway.emitNewMessage(conversationId, fullMessage);

    // Emit conversation updated ke kedua user
    const otherUserId =
      conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
    const currentUser = await this.userRepo.findOne({ where: { id: userId } });
    const otherUser = await this.userRepo.findOne({ where: { id: otherUserId } });

    this.chatGateway.emitConversationUpdated(conversationId, {
      id: conversationId,
      otherUser: {
        id: otherUser?.id,
        name: otherUser?.name,
        username: otherUser?.username,
        avatar: otherUser?.avatar,
      },
      lastMessage: {
        text: fullMessage.text,
        senderId: fullMessage.senderId,
        isRead: false,
        createdAt: fullMessage.createdAt,
      },
      unreadCount: 0,
      updatedAt: new Date(),
    });

    return fullMessage;
  }

  private async getMessageForUser(userId: string, messageId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Pesan tidak ditemukan');
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: message.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation tidak ditemukan');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new BadRequestException('Anda tidak memiliki akses ke pesan ini');
    }

    return { message, conversation };
  }

  async unsendMessage(userId: string, messageId: string) {
    const { message } = await this.getMessageForUser(userId, messageId);

    if (message.senderId !== userId) {
      throw new BadRequestException('Hanya pengirim yang bisa membatalkan pesan');
    }

    message.isDeleted = true;
    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    this.chatGateway.emitMessageUpdated(message.conversationId, fullMessage);
    return fullMessage;
  }

  async starMessage(userId: string, messageId: string) {
    const { message } = await this.getMessageForUser(userId, messageId);

    message.isStarred = !message.isStarred;
    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    this.chatGateway.emitMessageUpdated(message.conversationId, fullMessage);
    return fullMessage;
  }

  async pinMessage(userId: string, messageId: string, durationInMinutes: number) {
    const { message } = await this.getMessageForUser(userId, messageId);

    message.pinnedUntil = new Date(Date.now() + durationInMinutes * 60 * 1000);
    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    this.chatGateway.emitMessageUpdated(message.conversationId, fullMessage);
    return fullMessage;
  }

  async unpinMessage(userId: string, messageId: string) {
    const { message, conversation } = await this.getMessageForUser(
      userId,
      messageId,
    );

    message.pinnedUntil = null;
    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    this.chatGateway.emitMessageUpdated(message.conversationId, fullMessage);

    const eventMessage = this.messageRepo.create({
      text: 'You unpinned a message.',
      senderId: userId,
      conversationId: message.conversationId,
      isEvent: true,
      isRead: true,
    });

    const savedEvent = await this.messageRepo.save(eventMessage);

    const fullEvent = await this.messageRepo.findOne({
      where: { id: savedEvent.id },
      relations: ['sender'],
    });

    if (fullEvent) {
      this.chatGateway.emitNewMessage(message.conversationId, fullEvent);
    }

    await this.conversationRepo.update(conversation.id, {
      lastMessageAt: new Date(),
    });

    return fullEvent;
  }

  // Clear chat: hapus tampilan seluruh chat hanya untuk user yang menekan.
  // Pesan tidak dihapus dari database (lawan bicara tetap melihatnya),
  // hanya ditandai waktu clear supaya getMessages/getConversations
  // menyembunyikan pesan lama khusus untuk user ini.
  async clearChat(userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation tidak ditemukan');
    }

    if (
      conversation.user1Id !== userId &&
      conversation.user2Id !== userId
    ) {
      throw new BadRequestException(
        'Anda tidak memiliki akses ke conversation ini',
      );
    }

    const now = new Date();
    if (conversation.user1Id === userId) {
      conversation.user1ClearedAt = now;
    } else {
      conversation.user2ClearedAt = now;
    }
    await this.conversationRepo.save(conversation);

    return { conversationId, clearedAt: now };
  }
}
