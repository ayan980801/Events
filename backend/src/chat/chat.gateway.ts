import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SimpleJwtAuthGuard } from '../common/guards/simple-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  @UseGuards(SimpleJwtAuthGuard)
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.conversationId);
    client.emit('joinedConversation', { conversationId: data.conversationId });
  }

  @UseGuards(SimpleJwtAuthGuard)
  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(data.conversationId);
    client.emit('leftConversation', { conversationId: data.conversationId });
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
    client.to(data.conversationId).emit('userTyping', {
      userId: client.id,
      isTyping: data.isTyping,
    });
  }
}
