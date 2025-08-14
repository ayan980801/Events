import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AnalyticsEvent {
  userId?: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export interface ConversationAnalytics {
  userId: string;
  conversationId: string;
  model: string;
  messageCount: number;
  duration: number;
  averageResponseTime: number;
}

export interface UserAnalytics {
  userId: string;
  totalConversations: number;
  totalMessages: number;
  favoriteModel: string;
  averageSessionDuration: number;
  lastActivity: Date;
}

@Injectable()
export class AnalyticsService {
  private events: AnalyticsEvent[] = []; // In-memory storage for demo
  private conversations: Map<string, ConversationAnalytics> = new Map();
  private users: Map<string, UserAnalytics> = new Map();

  constructor(private configService: ConfigService) {}

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    event.timestamp = event.timestamp || new Date();
    
    // Store event (in production, this would go to a proper analytics service)
    this.events.push(event);

    // Log for debugging
    console.log('Analytics Event:', {
      event: event.event,
      userId: event.userId,
      timestamp: event.timestamp,
      properties: event.properties,
    });

    // Keep only recent events in memory (last 1000)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  async trackUserLogin(userId: string, method: string, userAgent?: string, ip?: string): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'user_login',
      properties: {
        method,
        userAgent,
        ip,
      },
    });
  }

  async trackUserLogout(userId: string, sessionDuration?: number): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'user_logout',
      properties: {
        sessionDuration,
      },
    });
  }

  async trackConversationCreated(userId: string, conversationId: string, model: string): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'conversation_created',
      properties: {
        conversationId,
        model,
      },
    });

    // Initialize conversation analytics
    this.conversations.set(conversationId, {
      userId,
      conversationId,
      model,
      messageCount: 0,
      duration: 0,
      averageResponseTime: 0,
    });
  }

  async trackMessageSent(
    userId: string,
    conversationId: string,
    messageLength: number,
    responseTime?: number,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'message_sent',
      properties: {
        conversationId,
        messageLength,
        responseTime,
      },
    });

    // Update conversation analytics
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messageCount++;
      if (responseTime) {
        const totalResponseTime = conversation.averageResponseTime * (conversation.messageCount - 1);
        conversation.averageResponseTime = (totalResponseTime + responseTime) / conversation.messageCount;
      }
      this.conversations.set(conversationId, conversation);
    }

    // Update user analytics
    this.updateUserAnalytics(userId, conversationId);
  }

  async trackApiCall(endpoint: string, method: string, userId?: string, responseTime?: number, statusCode?: number): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'api_call',
      properties: {
        endpoint,
        method,
        responseTime,
        statusCode,
      },
    });
  }

  async trackError(error: string, userId?: string, context?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'error',
      properties: {
        error,
        context,
      },
    });
  }

  async getConversationAnalytics(conversationId: string): Promise<ConversationAnalytics | null> {
    return this.conversations.get(conversationId) || null;
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    return this.users.get(userId) || null;
  }

  async getTopModels(limit: number = 10): Promise<Array<{ model: string; usage: number }>> {
    const modelUsage = new Map<string, number>();

    this.conversations.forEach((conv) => {
      const current = modelUsage.get(conv.model) || 0;
      modelUsage.set(conv.model, current + conv.messageCount);
    });

    return Array.from(modelUsage.entries())
      .map(([model, usage]) => ({ model, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);
  }

  async getUserActivityStats(days: number = 30): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalConversations: number;
    totalMessages: number;
  }> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const recentEvents = this.events.filter(event => 
      event.timestamp && event.timestamp >= cutoffDate
    );

    const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean));
    const newUsers = recentEvents.filter(e => e.event === 'user_login').length;
    const conversationEvents = recentEvents.filter(e => e.event === 'conversation_created');
    const messageEvents = recentEvents.filter(e => e.event === 'message_sent');

    return {
      totalUsers: this.users.size,
      activeUsers: uniqueUsers.size,
      newUsers,
      totalConversations: conversationEvents.length,
      totalMessages: messageEvents.length,
    };
  }

  private updateUserAnalytics(userId: string, conversationId: string): void {
    let userAnalytics = this.users.get(userId);
    
    if (!userAnalytics) {
      userAnalytics = {
        userId,
        totalConversations: 0,
        totalMessages: 0,
        favoriteModel: 'gpt-3.5-turbo',
        averageSessionDuration: 0,
        lastActivity: new Date(),
      };
    }

    userAnalytics.totalMessages++;
    userAnalytics.lastActivity = new Date();

    // Check if this is a new conversation for the user
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId);
    
    userAnalytics.totalConversations = userConversations.length;

    // Calculate favorite model
    const modelUsage = new Map<string, number>();
    userConversations.forEach(conv => {
      const current = modelUsage.get(conv.model) || 0;
      modelUsage.set(conv.model, current + conv.messageCount);
    });

    if (modelUsage.size > 0) {
      userAnalytics.favoriteModel = Array.from(modelUsage.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    this.users.set(userId, userAnalytics);
  }
}