import { Injectable } from '@nestjs/common';
import { PinoLoggerService } from '../common/logger/pino-logger.service';
import { ChatCompletionResponse, ModelInfo } from './interfaces/ai-model-provider.interface';

export interface TokenUsage {
  userId: string;
  conversationId?: string;
  messageId?: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  timestamp: Date;
}

export interface UsageSummary {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  requestCount: number;
  timeRange: {
    from: Date;
    to: Date;
  };
}

@Injectable()
export class TokenAccountingService {
  private readonly usageRecords: TokenUsage[] = [];
  private readonly dailyLimits = {
    free: 10000,     // 10k tokens per day
    premium: 100000, // 100k tokens per day
    enterprise: -1,  // unlimited
  };

  constructor(private readonly logger: PinoLoggerService) {}

  /**
   * Record token usage from a completion response
   */
  recordUsage(
    userId: string,
    response: ChatCompletionResponse,
    modelInfo?: ModelInfo,
    conversationId?: string,
    messageId?: string,
  ): TokenUsage {
    const estimatedCost = this.calculateCost(response.usage, modelInfo);

    const usage: TokenUsage = {
      userId,
      conversationId,
      messageId,
      provider: modelInfo?.provider || 'unknown',
      model: response.model,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      estimatedCost,
      timestamp: new Date(),
    };

    this.usageRecords.push(usage);

    this.logger.debug({
      userId,
      conversationId,
      messageId,
      provider: usage.provider,
      model: usage.model,
      totalTokens: usage.totalTokens,
      estimatedCost,
    }, 'Token usage recorded');

    return usage;
  }

  /**
   * Calculate estimated cost based on token usage and model pricing
   */
  private calculateCost(
    usage: { promptTokens: number; completionTokens: number },
    modelInfo?: ModelInfo,
  ): number {
    if (!modelInfo?.costPer1kTokens) {
      return 0;
    }

    const inputCost = (usage.promptTokens / 1000) * modelInfo.costPer1kTokens.input;
    const outputCost = (usage.completionTokens / 1000) * modelInfo.costPer1kTokens.output;

    return inputCost + outputCost;
  }

  /**
   * Get usage summary for a user within a time range
   */
  getUserUsage(
    userId: string,
    fromDate: Date,
    toDate: Date = new Date(),
  ): UsageSummary {
    const userRecords = this.usageRecords.filter(
      record =>
        record.userId === userId &&
        record.timestamp >= fromDate &&
        record.timestamp <= toDate,
    );

    const summary: UsageSummary = {
      totalTokens: userRecords.reduce((sum, record) => sum + record.totalTokens, 0),
      promptTokens: userRecords.reduce((sum, record) => sum + record.promptTokens, 0),
      completionTokens: userRecords.reduce((sum, record) => sum + record.completionTokens, 0),
      estimatedCost: userRecords.reduce((sum, record) => sum + (record.estimatedCost || 0), 0),
      requestCount: userRecords.length,
      timeRange: { from: fromDate, to: toDate },
    };

    return summary;
  }

  /**
   * Get daily usage for a user
   */
  getDailyUsage(userId: string, date: Date = new Date()): UsageSummary {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getUserUsage(userId, startOfDay, endOfDay);
  }

  /**
   * Check if user has exceeded daily token limit
   */
  checkDailyLimit(userId: string, subscriptionTier: 'free' | 'premium' | 'enterprise'): {
    withinLimit: boolean;
    usage: UsageSummary;
    limit: number;
    remaining: number;
  } {
    const dailyUsage = this.getDailyUsage(userId);
    const limit = this.dailyLimits[subscriptionTier];
    
    // Enterprise has unlimited usage
    if (limit === -1) {
      return {
        withinLimit: true,
        usage: dailyUsage,
        limit: -1,
        remaining: -1,
      };
    }

    const remaining = Math.max(0, limit - dailyUsage.totalTokens);
    const withinLimit = dailyUsage.totalTokens < limit;

    return {
      withinLimit,
      usage: dailyUsage,
      limit,
      remaining,
    };
  }

  /**
   * Get usage by conversation
   */
  getConversationUsage(conversationId: string): UsageSummary {
    const conversationRecords = this.usageRecords.filter(
      record => record.conversationId === conversationId,
    );

    if (conversationRecords.length === 0) {
      const now = new Date();
      return {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0,
        requestCount: 0,
        timeRange: { from: now, to: now },
      };
    }

    const timestamps = conversationRecords.map(r => r.timestamp);
    const fromDate = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const toDate = new Date(Math.max(...timestamps.map(t => t.getTime())));

    return {
      totalTokens: conversationRecords.reduce((sum, record) => sum + record.totalTokens, 0),
      promptTokens: conversationRecords.reduce((sum, record) => sum + record.promptTokens, 0),
      completionTokens: conversationRecords.reduce((sum, record) => sum + record.completionTokens, 0),
      estimatedCost: conversationRecords.reduce((sum, record) => sum + (record.estimatedCost || 0), 0),
      requestCount: conversationRecords.length,
      timeRange: { from: fromDate, to: toDate },
    };
  }

  /**
   * Get top users by token usage
   */
  getTopUsers(limit = 10, fromDate?: Date, toDate?: Date): Array<{
    userId: string;
    usage: UsageSummary;
  }> {
    const userUsageMap = new Map<string, TokenUsage[]>();
    
    // Filter records by date range if provided
    let filteredRecords = this.usageRecords;
    if (fromDate || toDate) {
      filteredRecords = this.usageRecords.filter(record => {
        const timestamp = record.timestamp;
        return (!fromDate || timestamp >= fromDate) && (!toDate || timestamp <= toDate);
      });
    }

    // Group by user
    for (const record of filteredRecords) {
      if (!userUsageMap.has(record.userId)) {
        userUsageMap.set(record.userId, []);
      }
      userUsageMap.get(record.userId)!.push(record);
    }

    // Calculate summaries and sort
    const userSummaries = Array.from(userUsageMap.entries()).map(([userId, records]) => {
      const timestamps = records.map(r => r.timestamp);
      const from = fromDate || new Date(Math.min(...timestamps.map(t => t.getTime())));
      const to = toDate || new Date(Math.max(...timestamps.map(t => t.getTime())));

      return {
        userId,
        usage: {
          totalTokens: records.reduce((sum, record) => sum + record.totalTokens, 0),
          promptTokens: records.reduce((sum, record) => sum + record.promptTokens, 0),
          completionTokens: records.reduce((sum, record) => sum + record.completionTokens, 0),
          estimatedCost: records.reduce((sum, record) => sum + (record.estimatedCost || 0), 0),
          requestCount: records.length,
          timeRange: { from, to },
        },
      };
    });

    return userSummaries
      .sort((a, b) => b.usage.totalTokens - a.usage.totalTokens)
      .slice(0, limit);
  }

  /**
   * Clear old usage records (for memory management)
   */
  clearOldRecords(olderThanDays = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialLength = this.usageRecords.length;
    
    // Remove records older than cutoff
    for (let i = this.usageRecords.length - 1; i >= 0; i--) {
      if (this.usageRecords[i].timestamp < cutoffDate) {
        this.usageRecords.splice(i, 1);
      }
    }

    const removedCount = initialLength - this.usageRecords.length;
    
    if (removedCount > 0) {
      this.logger.log({
        removedCount,
        remainingCount: this.usageRecords.length,
        cutoffDate,
      }, 'Cleared old token usage records');
    }

    return removedCount;
  }
}