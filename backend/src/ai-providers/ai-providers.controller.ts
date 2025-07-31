import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI Providers')
@Controller('ai-providers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Get('models')
  @ApiOperation({ summary: 'Get available AI models and their providers' })
  @ApiResponse({
    status: 200,
    description: 'Returns available AI models grouped by provider',
  })
  getAvailableModels() {
    return this.aiProvidersService.getAvailableModels();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get AI provider status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the status of all AI providers',
  })
  getProviderStatus() {
    return this.aiProvidersService.getProviderStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Perform health check on all AI providers' })
  @ApiResponse({
    status: 200,
    description: 'Returns health status after testing each provider',
  })
  async healthCheck() {
    return this.aiProvidersService.healthCheck();
  }
}
