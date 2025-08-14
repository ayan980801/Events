import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubscriptionTier } from '../users/entities/user.entity';

class UserManagementDto {
  id: string;
  action: 'activate' | 'deactivate' | 'upgrade' | 'downgrade' | 'delete';
  subscriptionTier?: SubscriptionTier;
  reason?: string;
}

class MaintenanceDto {
  action: 'cleanup' | 'restart' | 'backup';
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns comprehensive admin dashboard data',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getDashboard(@CurrentUser() user: any) {
    await this.adminService.validateAdminAccess(user.id);
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get paginated list of users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated user list',
  })
  async getUsers(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('search') search?: string,
  ) {
    await this.adminService.validateAdminAccess(user.id);
    return this.adminService.getUsersList(page, limit, search);
  }

  @Post('users/manage')
  @ApiOperation({ summary: 'Manage user account (activate, deactivate, upgrade, etc.)' })
  @ApiBody({ type: UserManagementDto })
  @ApiResponse({
    status: 200,
    description: 'User management action completed successfully',
  })
  async manageUser(@CurrentUser() user: any, @Body() userManagement: UserManagementDto) {
    return this.adminService.manageUser(user.id, userManagement);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get system logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated system logs',
  })
  async getLogs(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 100,
    @Query('severity') severity?: string,
  ) {
    await this.adminService.validateAdminAccess(user.id);
    return this.adminService.getSystemLogs(page, limit, severity);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get system analytics' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: ['24h', '7d', '30d'],
    description: 'Time range for analytics data',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns comprehensive analytics data',
  })
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('timeRange', new ParseEnumPipe(['24h', '7d', '30d'], { optional: true }))
    timeRange: '24h' | '7d' | '30d' = '24h',
  ) {
    await this.adminService.validateAdminAccess(user.id);
    return this.adminService.getAnalytics(timeRange);
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Perform system maintenance actions' })
  @ApiBody({ type: MaintenanceDto })
  @ApiResponse({
    status: 200,
    description: 'Maintenance action initiated successfully',
  })
  async performMaintenance(@CurrentUser() user: any, @Body() maintenance: MaintenanceDto) {
    return this.adminService.performSystemMaintenance(user.id, maintenance.action);
  }

  @Get('health/detailed')
  @ApiOperation({ summary: 'Get detailed system health information' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed system health and metrics',
  })
  async getDetailedHealth(@CurrentUser() user: any) {
    await this.adminService.validateAdminAccess(user.id);

    const [dashboardStats, analytics] = await Promise.all([
      this.adminService.getDashboardStats(),
      this.adminService.getAnalytics('24h'),
    ]);

    return {
      system: dashboardStats.system,
      ai: dashboardStats.ai,
      users: dashboardStats.users,
      conversations: dashboardStats.conversations,
      recentActivity: analytics.summary,
      timestamp: new Date(),
    };
  }

  @Get('reports/usage')
  @ApiOperation({ summary: 'Generate usage reports' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly'],
  })
  @ApiResponse({
    status: 200,
    description: 'Returns usage report data',
  })
  async getUsageReport(
    @CurrentUser() user: any,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    await this.adminService.validateAdminAccess(user.id);

    const timeRange = period === 'daily' ? '24h' : period === 'weekly' ? '7d' : '30d';
    const analytics = await this.adminService.getAnalytics(timeRange);
    const dashboardStats = await this.adminService.getDashboardStats();

    return {
      period,
      generatedAt: new Date(),
      summary: {
        totalUsers: dashboardStats.users.total,
        activeUsers: analytics.summary.activeUsers,
        totalConversations: dashboardStats.conversations.total,
        messagesInPeriod: analytics.summary.messagesCount,
        topModels: analytics.modelUsage,
      },
      metrics: {
        userGrowth: dashboardStats.users.newThisWeek,
        engagementRate: analytics.summary.averageMessagesPerUser,
        systemPerformance: {
          uptime: dashboardStats.system.uptime,
          errorRate: dashboardStats.system.errorRate,
          responseTime: dashboardStats.system.responseTime,
        },
      },
      aiUsage: {
        providerDistribution: dashboardStats.ai.requestsPerProvider,
        tokenConsumption: dashboardStats.ai.tokensUsed,
        performanceByProvider: dashboardStats.ai.averageResponseTime,
      },
    };
  }

  @Post('bulk-actions/users')
  @ApiOperation({ summary: 'Perform bulk actions on users' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userIds: { type: 'array', items: { type: 'string' } },
        action: { type: 'string', enum: ['activate', 'deactivate', 'upgrade', 'downgrade'] },
        subscriptionTier: { type: 'string', enum: Object.values(SubscriptionTier) },
        reason: { type: 'string' },
      },
      required: ['userIds', 'action'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk action completed',
  })
  async bulkUserActions(
    @CurrentUser() user: any,
    @Body()
    bulkAction: {
      userIds: string[];
      action: 'activate' | 'deactivate' | 'upgrade' | 'downgrade';
      subscriptionTier?: SubscriptionTier;
      reason?: string;
    },
  ) {
    await this.adminService.validateAdminAccess(user.id);

    const results = [];
    for (const userId of bulkAction.userIds) {
      try {
        const result = await this.adminService.manageUser(user.id, {
          id: userId,
          action: bulkAction.action,
          subscriptionTier: bulkAction.subscriptionTier,
          reason: bulkAction.reason,
        });
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      action: bulkAction.action,
      totalProcessed: bulkAction.userIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      timestamp: new Date(),
    };
  }
}
