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
    description: 'List of available AI models grouped by provider',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string', example: 'OpenAI' },
          models: {
            type: 'array',
            items: { type: 'string' },
            example: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
          },
        },
      },
    },
  })
  getAvailableModels() {
    return this.aiProvidersService.getAvailableModels();
  }

  @Get('providers/status')
  @ApiOperation({ summary: 'Get status of AI providers' })
  @ApiResponse({
    status: 200,
    description: 'Status of AI providers',
    schema: {
      type: 'object',
      properties: {
        openai: { type: 'boolean' },
        anthropic: { type: 'boolean' },
        mistral: { type: 'boolean' },
      },
    },
  })
  getProvidersStatus() {
    return {
      openai: this.aiProvidersService.isProviderAvailable('openai'),
      anthropic: this.aiProvidersService.isProviderAvailable('anthropic'),
      mistral: this.aiProvidersService.isProviderAvailable('mistral'),
    };
  }
}