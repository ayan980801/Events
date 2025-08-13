import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';

@ApiTags('ai-providers')
@Controller('ai-providers')
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Get('models')
  @ApiOperation({ summary: 'Get available AI models' })
  @ApiResponse({
    status: 200,
    description: 'List of available AI models',
    type: [String],
  })
  getAvailableModels(): string[] {
    return this.aiProvidersService.getAvailableModels();
  }
}
