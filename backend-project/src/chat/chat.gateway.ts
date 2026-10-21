import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message } from '../app/entity/message.entity';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:6700', 'https://lentera-snowy.vercel.app'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, number>();
  private jwtService = new JwtService();

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      let payload: any;
      try {
        payload = this.jwtService.verify(token, {
          secret: process.env.ACCESS_TOKEN_SECRET || 'sdhfbsdhbfhefsd',
        });
      } catch {
        client.disconnect();
        return;
      }

      const userId: string = payload.sub;
      client.data.userId = userId;

      // Room pribadi per user, supaya event seperti "pesan dibaca"
      // sampai ke pengirim walau ia tidak sedang membuka obrolannya.
      client.join(`user:${userId}`);

      const count = (this.onlineUsers.get(userId) ?? 0) + 1;
      this.onlineUsers.set(userId, count);

      client.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
      client.broadcast.emit('presenceUpdate', { userId, online: true });

      console.log(`[ChatGateway] ${userId} connected (${client.id})`);
    } catch (err) {
      console.error('[ChatGateway] Connection error:', err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;

    const count = (this.onlineUsers.get(userId) ?? 1) - 1;
    if (count <= 0) {
      this.onlineUsers.delete(userId);
      this.server.emit('presenceUpdate', { userId, online: false });
    } else {
      this.onlineUsers.set(userId, count);
    }

    console.log(`[ChatGateway] ${userId} disconnected`);
  }

  @SubscribeMessage('requestOnlineUsers')
  handleRequestOnlineUsers(@ConnectedSocket() client: Socket) {
    client.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
    console.log(`[ChatGateway] Client ${client.id} joined conversation ${conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(conversationId);
    console.log(`[ChatGateway] Client ${client.id} left conversation ${conversationId}`);
  }

  emitNewMessage(conversationId: string, message: Message) {
    this.server.to(conversationId).emit('newMessage', message);
  }

  emitMessageUpdated(conversationId: string, message: Message | null) {
    this.server.to(conversationId).emit('messageUpdated', message);
  }

  emitConversationUpdated(conversationId: string, conversation: any) {
    this.server.emit('conversationUpdated', conversation);
  }

  emitMessagesRead(
    conversationId: string,
    readerId: string,
    senderId: string,
    readAt: Date,
  ) {
    const payload = { conversationId, readerId, readAt };
    // Ke yang sedang membuka obrolan + ke room pribadi pengirim
    // (pengirim bisa saja sedang di daftar chat / halaman lain).
    this.server.to(conversationId).emit('messagesRead', payload);
    this.server.to(`user:${senderId}`).emit('messagesRead', payload);
  }
}
