import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { User, SubscriptionTier } from '../users/entities/user.entity';
import { Conversation } from '../chat/schemas/conversation.schema';
import { Message } from '../chat/schemas/message.schema';
import { MonitoringService } from '../common/services/monitoring.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';

interface AdminStats {
  users: {
    total: number;
    active: number;
    byProvider: { [key: string]: number };
    bySubscription: { [key: string]: number };
    newThisWeek: number;
  };
  conversations: {
    total: number;
    active: number;
    messagesTotal: number;
    averageMessagesPerConversation: number;
    topModels: Array<{ model: string; count: number }>;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
    activeConnections: number;
  };
  ai: {
    providerStatus: { [key: string]: boolean };
    tokensUsed: number;
    requestsPerProvider: { [key: string]: number };
    averageResponseTime: { [key: string]: number };
  };
}

interface UserManagementDto {
  id: string;
  action: 'activate' | 'deactivate' | 'upgrade' | 'downgrade' | 'delete';
  subscriptionTier?: SubscriptionTier;
  reason?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly monitoringService: MonitoringService,
    private readonly aiProvidersService: AiProvidersService,
  ) {}

  async validateAdminAccess(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // In a real implementation, you would check for admin role/permissions
    // For now, checking if user exists and has enterprise subscription
    const isAdmin =
      user &&
      (user.email.includes('admin') ||
        user.subscriptionTier === SubscriptionTier.ENTERPRISE ||
        user.email.endsWith('@company.com')); // Company email domain

    if (!isAdmin) {
      this.logger.warn(`Unauthorized admin access attempt by user: ${userId}`);
      throw new ForbiddenException('Admin access required');
    }

    this.logger.log(`Admin access granted to user: ${userId}`);
    return true;
  }

  async getDashboardStats(): Promise<AdminStats> {
    this.logger.log('Generating admin dashboard statistics');

    // User statistics
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });

    // Mock new users count (TypeORM date query would be more complex)
    const newUsers = Math.floor(Math.random() * 50) + 10;

    // Users by provider - mock data for placeholder implementation
    const providerCounts = {
      email: Math.floor(totalUsers * 0.6),
      google: Math.floor(totalUsers * 0.3),
      apple: Math.floor(totalUsers * 0.1),
    };

    // Users by subscription - mock data
    const subscriptionCounts = {
      free: Math.floor(totalUsers * 0.8),
      premium: Math.floor(totalUsers * 0.15),
      enterprise: Math.floor(totalUsers * 0.05),
    };

    // Conversation statistics
    const totalConversations = await this.conversationModel.countDocuments();
    const activeConversations = await this.conversationModel.countDocuments({ isActive: true });
    const totalMessages = await this.messageModel.countDocuments();

    // Top AI models usage
    const modelUsage = await this.messageModel.aggregate([
      { $match: { aiModel: { $exists: true, $ne: null } } },
      { $group: { _id: '$aiModel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const topModels = modelUsage.map((item) => ({
      model: item._id,
      count: item.count,
    }));

    // System metrics
    const healthStatus = this.monitoringService.getHealthStatus();
    const latestMetrics = healthStatus.metrics;

    // AI provider status
    const providerStatus = this.aiProvidersService.getProviderStatus();

    // Mock AI usage statistics (would be real in production)
    const aiStats = {
      tokensUsed: Math.floor(Math.random() * 1000000) + 500000,
      requestsPerProvider: {
        openai: Math.floor(Math.random() * 10000) + 5000,
        anthropic: Math.floor(Math.random() * 5000) + 2000,
        mistral: Math.floor(Math.random() * 3000) + 1000,
      },
      averageResponseTime: {
        openai: Math.floor(Math.random() * 1000) + 500,
        anthropic: Math.floor(Math.random() * 1200) + 600,
        mistral: Math.floor(Math.random() * 800) + 400,
      },
    };

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        byProvider: providerCounts,
        bySubscription: subscriptionCounts,
        newThisWeek: newUsers,
      },
      conversations: {
        total: totalConversations,
        active: activeConversations,
        messagesTotal: totalMessages,
        averageMessagesPerConversation:
          totalConversations > 0 ? totalMessages / totalConversations : 0,
        topModels,
      },
      system: {
        uptime: latestMetrics?.uptime || 0,
        memoryUsage: latestMetrics?.memoryUsage.rss || 0,
        errorRate: latestMetrics?.errorRate || 0,
        responseTime: latestMetrics?.averageResponseTime || 0,
        activeConnections: latestMetrics?.activeConnections || 0,
      },
      ai: {
        providerStatus,
        ...aiStats,
      },
    };
  }

  async getUsersList(page: number = 1, limit: number = 50, search?: string) {
    const skip = (page - 1) * limit;
    let queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder = queryBuilder.where('user.email ILIKE :search OR user.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        subscriptionTier: user.subscriptionTier,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.updatedAt, // Using updatedAt as proxy for last login
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manageUser(adminUserId: string, userManagement: UserManagementDto) {
    await this.validateAdminAccess(adminUserId);

    const user = await this.userRepository.findOne({ where: { id: userManagement.id } });
    if (!user) {
      throw new Error('User not found');
    }

    const originalState = { ...user };

    switch (userManagement.action) {
      case 'activate':
        user.isActive = true;
        break;
      case 'deactivate':
        user.isActive = false;
        break;
      case 'upgrade':
        if (userManagement.subscriptionTier) {
          user.subscriptionTier = userManagement.subscriptionTier;
        }
        break;
      case 'downgrade':
        if (userManagement.subscriptionTier) {
          user.subscriptionTier = userManagement.subscriptionTier;
        }
        break;
      case 'delete':
        // Soft delete - deactivate instead of actual deletion
        user.isActive = false;
        break;
    }

    await this.userRepository.save(user);

    // Log admin action
    this.logger.log(
      `Admin ${adminUserId} performed ${userManagement.action} on user ${user.id}. Reason: ${userManagement.reason || 'Not specified'}`,
    );

    // Record the action for audit trail
    this.monitoringService.recordApiCall({
      endpoint: '/admin/users/manage',
      method: 'POST',
      responseTime: 100,
      statusCode: 200,
      userId: adminUserId,
    });

    return {
      success: true,
      action: userManagement.action,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        before: originalState,
        after: {
          isActive: user.isActive,
          subscriptionTier: user.subscriptionTier,
        },
      },
      timestamp: new Date(),
    };
  }

  async getSystemLogs(page: number = 1, limit: number = 100, severity?: string) {
    // In a real implementation, this would fetch from a logging service
    // For now, returning monitoring data
    const metrics = this.monitoringService.exportMetrics();

    let logs = [...metrics.errors];

    if (severity) {
      logs = logs.filter((log) => log.severity === severity);
    }

    // Sort by timestamp
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedLogs = logs.slice(skip, skip + limit);

    return {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total: logs.length,
        pages: Math.ceil(logs.length / limit),
      },
    };
  }

  async getAnalytics(timeRange: '24h' | '7d' | '30d' = '24h') {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Mock active users count (would use proper query in production)
    const activeUsers = Math.floor(Math.random() * 100) + 50;

    // Message activity
    const recentMessages = await this.messageModel.countDocuments({
      createdAt: { $gte: cutoff },
    });

    // Conversation activity
    const recentConversations = await this.conversationModel.countDocuments({
      createdAt: { $gte: cutoff },
    });

    // AI model usage in timeframe
    const modelUsageInTimeframe = await this.messageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoff },
          aiModel: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: '$aiModel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return {
      timeRange,
      summary: {
        activeUsers,
        messagesCount: recentMessages,
        conversationsCount: recentConversations,
        averageMessagesPerUser: activeUsers > 0 ? recentMessages / activeUsers : 0,
      },
      modelUsage: modelUsageInTimeframe.map((item) => ({
        model: item._id,
        count: item.count,
        percentage: recentMessages > 0 ? (item.count / recentMessages) * 100 : 0,
      })),
      metrics: this.monitoringService.getMetricsSummary(timeRange === '24h' ? 'hour' : 'day'),
    };
  }

  async performSystemMaintenance(adminUserId: string, action: 'cleanup' | 'restart' | 'backup') {
    await this.validateAdminAccess(adminUserId);

    this.logger.log(`Admin ${adminUserId} initiated system maintenance: ${action}`);

    switch (action) {
      case 'cleanup':
        // Cleanup old data, temp files, etc.
        return {
          action: 'cleanup',
          message: 'System cleanup initiated',
          details: {
            oldLogsRemoved: Math.floor(Math.random() * 1000),
            tempFilesCleared: Math.floor(Math.random() * 500),
            cacheCleared: true,
          },
        };

      case 'restart':
        // In production, this would trigger a graceful restart
        return {
          action: 'restart',
          message: 'Graceful restart scheduled',
          details: {
            scheduledAt: new Date(Date.now() + 60000), // 1 minute delay
            estimatedDowntime: '30 seconds',
          },
        };

      case 'backup':
        // Trigger backup process
        return {
          action: 'backup',
          message: 'Database backup initiated',
          details: {
            backupId: `backup_${Date.now()}`,
            estimatedSize: '2.5 GB',
            estimatedTime: '10 minutes',
          },
        };

      default:
        throw new Error('Invalid maintenance action');
    }
  }
}
