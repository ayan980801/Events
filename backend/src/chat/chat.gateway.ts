import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { AuthService } from '../auth/auth.service';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        this.logger.warn(`Client ${client.id} disconnected: User not found`);
        client.disconnect();
        return;
      }

      client.data.user = user;
      client.join(`user:${user.id}`);
      
      this.logger.log(`User ${user.email} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} disconnected: Authentication failed - ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.logger.log(`User ${user.email} disconnected from socket ${client.id}`);
    }
  }

  private extractTokenFromHandshake(client: Socket): string | undefined {
    // Try to get token from auth header in handshake
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : undefined;
    }

    // Try to get token from auth object in handshake
    return client.handshake.auth?.token;
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    await client.join(data.conversationId);
    client.emit('joinedConversation', { conversationId: data.conversationId });
    this.logger.log(`User ${user.email} joined conversation ${data.conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    await client.leave(data.conversationId);
    client.emit('leftConversation', { conversationId: data.conversationId });
    this.logger.log(`User ${user.email} left conversation ${data.conversationId}`);
  }

  // Emit message to all clients in a conversation
  emitMessageToConversation(conversationId: string, message: any) {
    this.server.to(conversationId).emit('newMessage', message);
  }

  // Emit typing indicator
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    client.to(data.conversationId).emit('userTyping', {
      userId: user.id,
      userName: user.name,
      isTyping: data.isTyping,
    });
  }
}
