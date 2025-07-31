import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SystemMetrics {
  timestamp: Date;
  totalUsers: number;
  activeConnections: number;
  totalConversations: number;
  messagesPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

interface ApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
}

interface ErrorMetrics {
  error: string;
  stack?: string;
  context: string;
  timestamp: Date;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly metrics: {
    api: ApiMetrics[];
    errors: ErrorMetrics[];
    system: SystemMetrics[];
  } = {
    api: [],
    errors: [],
    system: [],
  };

  private readonly maxMetricsHistory = 10000; // Keep last 10k entries
  private startTime = Date.now();

  constructor(private configService: ConfigService) {
    // Collect system metrics every 30 seconds
    setInterval(() => this.collectSystemMetrics(), 30000);
    
    // Clean up old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 3600000);
  }

  recordApiCall(metrics: Omit<ApiMetrics, 'timestamp'>) {
    const apiMetric: ApiMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.metrics.api.push(apiMetric);
    
    // Log slow requests
    if (metrics.responseTime > 1000) {
      this.logger.warn(`Slow API request: ${metrics.method} ${metrics.endpoint} - ${metrics.responseTime}ms`);
    }

    // Log error responses
    if (metrics.statusCode >= 400) {
      this.logger.error(`API error: ${metrics.method} ${metrics.endpoint} - ${metrics.statusCode}`);
    }

    this.trimMetricsArray(this.metrics.api);
  }

  recordError(error: Omit<ErrorMetrics, 'timestamp'>) {
    const errorMetric: ErrorMetrics = {
      ...error,
      timestamp: new Date(),
    };

    this.metrics.errors.push(errorMetric);
    
    // Log based on severity
    switch (error.severity) {
      case 'critical':
        this.logger.error(`CRITICAL ERROR in ${error.context}: ${error.error}`, error.stack);
        break;
      case 'high':
        this.logger.error(`HIGH SEVERITY ERROR in ${error.context}: ${error.error}`);
        break;
      case 'medium':
        this.logger.warn(`MEDIUM SEVERITY ERROR in ${error.context}: ${error.error}`);
        break;
      case 'low':
        this.logger.debug(`LOW SEVERITY ERROR in ${error.context}: ${error.error}`);
        break;
    }

    this.trimMetricsArray(this.metrics.errors);
  }

  private collectSystemMetrics() {
    const now = new Date();
    const lastMinute = new Date(now.getTime() - 60000);
    
    // Calculate metrics for the last minute
    const recentApiCalls = this.metrics.api.filter(m => m.timestamp >= lastMinute);
    const messagesPerMinute = recentApiCalls.filter(m => 
      m.endpoint.includes('/chat/') && m.method === 'POST'
    ).length;
    
    const averageResponseTime = recentApiCalls.length > 0
      ? recentApiCalls.reduce((sum, m) => sum + m.responseTime, 0) / recentApiCalls.length
      : 0;
    
    const recentErrors = this.metrics.errors.filter(e => e.timestamp >= lastMinute);
    const errorRate = recentApiCalls.length > 0 
      ? recentErrors.length / recentApiCalls.length * 100 
      : 0;

    const systemMetric: SystemMetrics = {
      timestamp: now,
      totalUsers: 0, // Would be populated from database in real implementation
      activeConnections: 0, // Would be populated from WebSocket gateway
      totalConversations: 0, // Would be populated from database
      messagesPerMinute,
      averageResponseTime,
      errorRate,
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
    };

    this.metrics.system.push(systemMetric);
    this.trimMetricsArray(this.metrics.system);

    // Log system health
    this.logger.debug(`System Metrics: ${JSON.stringify({
      messagesPerMinute,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      memoryMB: Math.round(systemMetric.memoryUsage.rss / 1024 / 1024),
    })}`);
  }

  private cleanupOldMetrics() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    this.metrics.api = this.metrics.api.filter(m => m.timestamp > cutoffTime);
    this.metrics.errors = this.metrics.errors.filter(m => m.timestamp > cutoffTime);
    this.metrics.system = this.metrics.system.filter(m => m.timestamp > cutoffTime);
    
    this.logger.log('Cleaned up old metrics');
  }

  private trimMetricsArray<T>(array: T[]) {
    if (array.length > this.maxMetricsHistory) {
      array.splice(0, array.length - this.maxMetricsHistory);
    }
  }

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: SystemMetrics | null;
    checks: { [key: string]: boolean };
  } {
    const latestMetrics = this.metrics.system[this.metrics.system.length - 1];
    
    const checks = {
      lowErrorRate: !latestMetrics || latestMetrics.errorRate < 5,
      acceptableResponseTime: !latestMetrics || latestMetrics.averageResponseTime < 2000,
      memoryUsage: !latestMetrics || latestMetrics.memoryUsage.rss < 512 * 1024 * 1024, // 512MB
      uptime: Date.now() - this.startTime > 60000, // Running for at least 1 minute
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      metrics: latestMetrics || null,
      checks,
    };
  }

  getMetricsSummary(timeWindow: 'hour' | 'day' = 'hour') {
    const now = new Date();
    const cutoff = new Date(now.getTime() - (timeWindow === 'hour' ? 3600000 : 86400000));
    
    const recentApiCalls = this.metrics.api.filter(m => m.timestamp >= cutoff);
    const recentErrors = this.metrics.errors.filter(m => m.timestamp >= cutoff);
    const recentSystemMetrics = this.metrics.system.filter(m => m.timestamp >= cutoff);
    
    return {
      timeWindow,
      totalApiCalls: recentApiCalls.length,
      totalErrors: recentErrors.length,
      errorsByEndpoint: this.groupBy(
        recentErrors.filter(e => e.error.includes('API')), 
        'context'
      ),
      responseTimePercentiles: this.calculatePercentiles(
        recentApiCalls.map(m => m.responseTime)
      ),
      errorRateTrend: recentSystemMetrics.map(m => ({
        timestamp: m.timestamp,
        errorRate: m.errorRate,
      })),
      memoryUsageTrend: recentSystemMetrics.map(m => ({
        timestamp: m.timestamp,
        memoryMB: Math.round(m.memoryUsage.rss / 1024 / 1024),
      })),
    };
  }

  private groupBy<T>(array: T[], key: keyof T): { [key: string]: number } {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = (groups[groupKey] || 0) + 1;
      return groups;
    }, {} as { [key: string]: number });
  }

  private calculatePercentiles(values: number[]): { p50: number; p90: number; p95: number; p99: number } {
    if (values.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Public methods for external monitoring integration
  exportMetrics() {
    return {
      api: this.metrics.api,
      errors: this.metrics.errors,
      system: this.metrics.system,
      summary: this.getMetricsSummary(),
    };
  }

  getAlerts(): Array<{
    type: 'error_rate' | 'response_time' | 'memory_usage' | 'uptime';
    severity: 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }> {
    const alerts = [];
    const latestMetrics = this.metrics.system[this.metrics.system.length - 1];
    
    if (latestMetrics) {
      if (latestMetrics.errorRate > 10) {
        alerts.push({
          type: 'error_rate',
          severity: 'critical',
          message: `High error rate: ${latestMetrics.errorRate.toFixed(2)}%`,
          timestamp: new Date(),
        });
      } else if (latestMetrics.errorRate > 5) {
        alerts.push({
          type: 'error_rate',
          severity: 'warning',
          message: `Elevated error rate: ${latestMetrics.errorRate.toFixed(2)}%`,
          timestamp: new Date(),
        });
      }
      
      if (latestMetrics.averageResponseTime > 3000) {
        alerts.push({
          type: 'response_time',
          severity: 'critical',
          message: `High response time: ${Math.round(latestMetrics.averageResponseTime)}ms`,
          timestamp: new Date(),
        });
      } else if (latestMetrics.averageResponseTime > 2000) {
        alerts.push({
          type: 'response_time',
          severity: 'warning',
          message: `Elevated response time: ${Math.round(latestMetrics.averageResponseTime)}ms`,
          timestamp: new Date(),
        });
      }
      
      const memoryMB = latestMetrics.memoryUsage.rss / 1024 / 1024;
      if (memoryMB > 1024) {
        alerts.push({
          type: 'memory_usage',
          severity: 'critical',
          message: `High memory usage: ${Math.round(memoryMB)}MB`,
          timestamp: new Date(),
        });
      } else if (memoryMB > 512) {
        alerts.push({
          type: 'memory_usage',
          severity: 'warning',
          message: `Elevated memory usage: ${Math.round(memoryMB)}MB`,
          timestamp: new Date(),
        });
      }
    }
    
    return alerts;
  }
}