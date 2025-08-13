import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth(): { message: string; timestamp: string; uptime: number } {
    return this.appService.getHealth();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version' })
  @ApiResponse({ status: 200, description: 'API version information' })
  getVersion(): { version: string; environment: string } {
    return this.appService.getVersion();
  }
}
