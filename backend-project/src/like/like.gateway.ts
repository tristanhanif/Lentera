import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:6700'],
    credentials: true,
  },
  namespace: '/like',
})
export class LikeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[LikeGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[LikeGateway] Client disconnected: ${client.id}`);
  }

  emitLikeToggled(data: {
    postId: string;
    totalLikes: number;
    action: 'liked' | 'unliked';
    userId: string;
  }) {
    this.server.emit('likeToggled', data);
  }
}
