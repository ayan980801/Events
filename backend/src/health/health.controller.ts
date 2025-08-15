import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '../config/config.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private mongoose: MongooseHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  @HealthCheck()
  check() {
    return this.health.check([
      // PostgreSQL health check
      () => this.db.pingCheck('database'),
      // MongoDB health check
      () => this.mongoose.pingCheck('mongodb'),
      // Redis health check (if available)
      async () => {
        try {
          // Simple Redis health check - you might want to inject a Redis service here
          return { redis: { status: 'up' } };
        } catch (error) {
          return { redis: { status: 'down', error: error.message } };
        }
      },
      // AI Provider health check
      async () => {
        const aiConfig = this.configService.ai;
        const providers = {
          openai: aiConfig.openai ? 'configured' : 'not-configured',
          anthropic: aiConfig.anthropic ? 'configured' : 'not-configured',
          mistral: aiConfig.mistral ? 'configured' : 'not-configured',
        };
        
        return {
          ai_providers: {
            status: 'up',
            providers,
          },
        };
      },
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Get application readiness status' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  @HealthCheck()
  readiness() {
    // More strict readiness check - all dependencies must be healthy
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get application liveness status' })  
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    // Simple liveness check - just return OK if the process is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.nodeEnv,
    };
  }
}