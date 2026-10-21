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
import { Notification } from '../app/entity/notification.entity';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'https://lentera-snowy.vercel.app'],
    credentials: true,
  },
  namespace: '/notification',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[NotificationGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[NotificationGateway] Client disconnected: ${client.id}`);
  }

  emitNotification(notif: Notification) {
    // Emit hanya ke room user yang dituju (bukan broadcast ke semua)
    this.server.to(notif.user.id).emit('notification', notif);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(userId);
  }
}
