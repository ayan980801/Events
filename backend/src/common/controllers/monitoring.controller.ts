import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonitoringService } from '../services/monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({
    status: 200,
    description: 'Returns system health status and checks',
  })
  getHealthStatus() {
    return this.monitoringService.getHealthStatus();
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system metrics summary' })
  @ApiQuery({
    name: 'timeWindow',
    enum: ['hour', 'day'],
    required: false,
    description: 'Time window for metrics aggregation',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns comprehensive system metrics',
  })
  getMetrics(@Query('timeWindow') timeWindow: 'hour' | 'day' = 'hour') {
    return this.monitoringService.getMetricsSummary(timeWindow);
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active system alerts' })
  @ApiResponse({
    status: 200,
    description: 'Returns active alerts and warnings',
  })
  getAlerts() {
    return {
      alerts: this.monitoringService.getAlerts(),
      timestamp: new Date(),
    };
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all metrics data' })
  @ApiResponse({
    status: 200,
    description: 'Returns complete metrics export for external analysis',
  })
  exportMetrics() {
    return this.monitoringService.exportMetrics();
  }

  @Get('status')
  @ApiOperation({ summary: 'Simple status check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns basic service status',
  })
  getStatus() {
    return {
      status: 'operational',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
