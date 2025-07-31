import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface ActiveUser {
  socketId: string;
  userId: string;
  username: string;
  joinedAt: Date;
  lastActivity: Date;
}

interface TypingUser {
  userId: string;
  username: string;
  startedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private activeUsers = new Map<string, ActiveUser>();
  private conversationUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds
  private typingUsers = new Map<string, Map<string, TypingUser>>(); // conversationId -> userId -> TypingUser
  private userHeartbeats = new Map<string, Date>();

  constructor(private readonly chatService: ChatService) {
    // Clean up stale typing indicators every 10 seconds
    setInterval(() => this.cleanupStaleTypingIndicators(), 10000);
    // Clean up inactive users every 30 seconds
    setInterval(() => this.cleanupInactiveUsers(), 30000);
  }

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user info from token (in real implementation)
      // For now, using mock user data
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const username = `User ${Math.floor(Math.random() * 1000)}`;

      client.userId = userId;
      client.username = username;

      // Register active user
      this.activeUsers.set(client.id, {
        socketId: client.id,
        userId,
        username,
        joinedAt: new Date(),
        lastActivity: new Date(),
      });

      this.userHeartbeats.set(client.id, new Date());

      this.logger.log(`Client connected: ${client.id} (User: ${username})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to chat service',
        userId,
        username,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = this.activeUsers.get(client.id);
    if (user) {
      this.logger.log(`Client disconnected: ${client.id} (User: ${user.username})`);

      // Remove user from all conversations
      for (const [conversationId, users] of this.conversationUsers.entries()) {
        if (users.has(user.userId)) {
          users.delete(user.userId);
          this.emitUserLeftConversation(conversationId, user);

          // Clean up empty conversation user sets
          if (users.size === 0) {
            this.conversationUsers.delete(conversationId);
          }
        }
      }

      // Remove from typing indicators
      for (const [conversationId, typingUsers] of this.typingUsers.entries()) {
        if (typingUsers.has(user.userId)) {
          typingUsers.delete(user.userId);
          this.emitTypingUpdate(conversationId);
        }
      }

      // Clean up user data
      this.activeUsers.delete(client.id);
      this.userHeartbeats.delete(client.id);
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    this.userHeartbeats.set(client.id, new Date());
    const user = this.activeUsers.get(client.id);
    if (user) {
      user.lastActivity = new Date();
    }
    client.emit('heartbeat_ack', { timestamp: new Date() });
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.activeUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      await client.join(data.conversationId);

      // Add user to conversation tracking
      if (!this.conversationUsers.has(data.conversationId)) {
        this.conversationUsers.set(data.conversationId, new Set());
      }
      this.conversationUsers.get(data.conversationId).add(user.userId);

      this.logger.log(`User ${user.username} joined conversation ${data.conversationId}`);

      // Notify user they joined
      client.emit('joinedConversation', {
        conversationId: data.conversationId,
        timestamp: new Date(),
      });

      // Notify other users in conversation
      this.emitUserJoinedConversation(data.conversationId, user, client.id);

      // Send current online users in conversation
      this.emitOnlineUsers(data.conversationId);
    } catch (error) {
      this.logger.error('Error joining conversation:', error);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.activeUsers.get(client.id);
    if (!user) return;

    try {
      await client.leave(data.conversationId);

      // Remove user from conversation tracking
      const conversationUsers = this.conversationUsers.get(data.conversationId);
      if (conversationUsers) {
        conversationUsers.delete(user.userId);
        if (conversationUsers.size === 0) {
          this.conversationUsers.delete(data.conversationId);
        }
      }

      // Remove from typing indicators
      const typingUsers = this.typingUsers.get(data.conversationId);
      if (typingUsers && typingUsers.has(user.userId)) {
        typingUsers.delete(user.userId);
        this.emitTypingUpdate(data.conversationId);
      }

      this.logger.log(`User ${user.username} left conversation ${data.conversationId}`);

      client.emit('leftConversation', {
        conversationId: data.conversationId,
        timestamp: new Date(),
      });

      // Notify other users
      this.emitUserLeftConversation(data.conversationId, user);
    } catch (error) {
      this.logger.error('Error leaving conversation:', error);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.activeUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      // Stop typing indicator for this user
      this.handleStopTyping({ conversationId: data.conversationId }, client);

      // In a real implementation, this would integrate with the chat service
      // For now, creating a mock message
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: data.conversationId,
        userId: user.userId,
        username: user.username,
        content: data.content,
        timestamp: new Date(),
        type: 'user',
      };

      // Emit message to all users in conversation
      this.server.to(data.conversationId).emit('newMessage', message);

      // Update user activity
      user.lastActivity = new Date();

      this.logger.log(`Message sent by ${user.username} in conversation ${data.conversationId}`);

      // In real implementation, would also trigger AI response here
      setTimeout(
        () => {
          const aiResponse = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversationId: data.conversationId,
            userId: 'ai',
            username: 'AI Assistant',
            content: `This is a mock AI response to: "${data.content}"`,
            timestamp: new Date(),
            type: 'assistant',
          };
          this.server.to(data.conversationId).emit('newMessage', aiResponse);
        },
        1000 + Math.random() * 2000,
      ); // Random delay 1-3 seconds
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.activeUsers.get(client.id);
    if (!user) return;

    if (!this.typingUsers.has(data.conversationId)) {
      this.typingUsers.set(data.conversationId, new Map());
    }

    this.typingUsers.get(data.conversationId).set(user.userId, {
      userId: user.userId,
      username: user.username,
      startedAt: new Date(),
    });

    this.emitTypingUpdate(data.conversationId);
    user.lastActivity = new Date();
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.activeUsers.get(client.id);
    if (!user) return;

    const typingUsers = this.typingUsers.get(data.conversationId);
    if (typingUsers && typingUsers.has(user.userId)) {
      typingUsers.delete(user.userId);
      this.emitTypingUpdate(data.conversationId);
    }
  }

  // Utility methods
  private emitTypingUpdate(conversationId: string) {
    const typingUsers = this.typingUsers.get(conversationId);
    const typingList = typingUsers ? Array.from(typingUsers.values()) : [];

    this.server.to(conversationId).emit('typingUpdate', {
      conversationId,
      typingUsers: typingList,
      timestamp: new Date(),
    });
  }

  private emitUserJoinedConversation(
    conversationId: string,
    user: ActiveUser,
    excludeSocketId?: string,
  ) {
    const event = {
      conversationId,
      user: {
        userId: user.userId,
        username: user.username,
      },
      timestamp: new Date(),
    };

    if (excludeSocketId) {
      this.server.to(conversationId).except(excludeSocketId).emit('userJoined', event);
    } else {
      this.server.to(conversationId).emit('userJoined', event);
    }
  }

  private emitUserLeftConversation(conversationId: string, user: ActiveUser) {
    this.server.to(conversationId).emit('userLeft', {
      conversationId,
      user: {
        userId: user.userId,
        username: user.username,
      },
      timestamp: new Date(),
    });
  }

  private emitOnlineUsers(conversationId: string) {
    const userIds = this.conversationUsers.get(conversationId);
    if (!userIds) return;

    const onlineUsers = [];
    for (const user of this.activeUsers.values()) {
      if (userIds.has(user.userId)) {
        onlineUsers.push({
          userId: user.userId,
          username: user.username,
          joinedAt: user.joinedAt,
          lastActivity: user.lastActivity,
        });
      }
    }

    this.server.to(conversationId).emit('onlineUsers', {
      conversationId,
      users: onlineUsers,
      count: onlineUsers.length,
      timestamp: new Date(),
    });
  }

  private cleanupStaleTypingIndicators() {
    const now = new Date();
    const staleThreshold = 10000; // 10 seconds

    for (const [conversationId, typingUsers] of this.typingUsers.entries()) {
      let hasChanges = false;

      for (const [userId, typingUser] of typingUsers.entries()) {
        if (now.getTime() - typingUser.startedAt.getTime() > staleThreshold) {
          typingUsers.delete(userId);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.emitTypingUpdate(conversationId);
      }

      // Clean up empty typing user maps
      if (typingUsers.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  private cleanupInactiveUsers() {
    const now = new Date();
    const inactiveThreshold = 300000; // 5 minutes

    for (const [socketId, lastHeartbeat] of this.userHeartbeats.entries()) {
      if (now.getTime() - lastHeartbeat.getTime() > inactiveThreshold) {
        this.logger.warn(`Cleaning up inactive user: ${socketId}`);

        const user = this.activeUsers.get(socketId);
        if (user) {
          // Force disconnect
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
        }
      }
    }
  }

  // Public methods for external use
  emitMessageToConversation(conversationId: string, message: any) {
    this.server.to(conversationId).emit('newMessage', message);
  }

  emitAiTyping(conversationId: string, isTyping: boolean) {
    this.server.to(conversationId).emit('aiTyping', {
      conversationId,
      isTyping,
      timestamp: new Date(),
    });
  }

  getActiveUsersInConversation(conversationId: string): ActiveUser[] {
    const userIds = this.conversationUsers.get(conversationId);
    if (!userIds) return [];

    const activeUsers = [];
    for (const user of this.activeUsers.values()) {
      if (userIds.has(user.userId)) {
        activeUsers.push(user);
      }
    }
    return activeUsers;
  }

  getGlobalStats() {
    return {
      totalConnections: this.activeUsers.size,
      activeConversations: this.conversationUsers.size,
      totalTypingUsers: Array.from(this.typingUsers.values()).reduce(
        (sum, users) => sum + users.size,
        0,
      ),
    };
  }
}
