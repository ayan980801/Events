import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProviderSelectionService, ProviderSelectionOptions } from './provider-selection.service';
import { TokenAccountingService } from './token-accounting.service';
import { ChatCompletionOptions, ModelInfo } from './interfaces/ai-model-provider.interface';
import { SimpleJwtAuthGuard } from '../common/guards/simple-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class TestCompletionDto {
  model?: string;
  message: string;
  temperature?: number;
  maxTokens?: number;
}

@ApiTags('ai-providers')
@Controller('ai-providers')
export class AiProvidersController {
  constructor(
    private readonly providerSelectionService: ProviderSelectionService,
    private readonly tokenAccountingService: TokenAccountingService,
  ) {}

  @Get('models')
  @ApiOperation({ summary: 'Get all available AI models from all providers' })
  @ApiResponse({ status: 200, description: 'List of available models' })
  async getAvailableModels(): Promise<ModelInfo[]> {
    return this.providerSelectionService.getAllModels();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get all configured AI providers' })
  @ApiResponse({ status: 200, description: 'List of configured providers' })
  async getAvailableProviders(): Promise<{ name: string; configured: boolean; models: ModelInfo[] }[]> {
    const providers = this.providerSelectionService.getAvailableProviders();
    const providerInfo = await Promise.all(
      providers.map(async (provider) => ({
        name: provider.name,
        configured: provider.isConfigured(),
        models: await provider.getModels(),
      }))
    );
    return providerInfo;
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for all AI providers' })
  @ApiResponse({ status: 200, description: 'Health status of all providers' })
  async healthCheck(): Promise<Record<string, any>> {
    return this.providerSelectionService.healthCheckAll();
  }

  @Post('test-completion')
  @UseGuards(SimpleJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test completion with a simple message (for development)' })
  @ApiResponse({ status: 200, description: 'Completion response' })
  async testCompletion(
    @Body() dto: TestCompletionDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    const options: ChatCompletionOptions = {
      model: dto.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: dto.message },
      ],
      temperature: dto.temperature ?? 0.7,
      maxTokens: dto.maxTokens ?? 150,
      userId: user.id,
    };

    const selectionOptions: ProviderSelectionOptions = {
      preferredModel: dto.model,
      retryAttempts: 2,
    };

    try {
      const response = await this.providerSelectionService.complete(options, selectionOptions);
      
      // Record token usage
      const allModels = await this.providerSelectionService.getAllModels();
      const modelInfo = allModels.find(m => m.id === response.model);
      
      this.tokenAccountingService.recordUsage(
        user.id,
        response,
        modelInfo,
        'test-completion',
      );

      return {
        response: response.content,
        model: response.model,
        usage: response.usage,
        estimatedCost: modelInfo?.costPer1kTokens ? 
          ((response.usage.promptTokens / 1000) * modelInfo.costPer1kTokens.input) +
          ((response.usage.completionTokens / 1000) * modelInfo.costPer1kTokens.output) : 0,
      };
    } catch (error) {
      throw new BadRequestException(`AI completion failed: ${error.message}`);
    }
  }

  @Get('usage/daily')
  @UseGuards(SimpleJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get daily token usage for current user' })
  @ApiResponse({ status: 200, description: 'Daily usage statistics' })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format (defaults to today)' })
  async getDailyUsage(
    @CurrentUser() user: any,
    @Query('date') dateStr?: string,
  ): Promise<any> {
    const date = dateStr ? new Date(dateStr) : new Date();
    const usage = this.tokenAccountingService.getDailyUsage(user.id, date);
    
    // Mock subscription tier for now - in real implementation, get from user entity
    const subscriptionTier = 'free';
    const limitCheck = this.tokenAccountingService.checkDailyLimit(user.id, subscriptionTier);

    return {
      date: date.toISOString().split('T')[0],
      usage,
      limits: {
        subscriptionTier,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        withinLimit: limitCheck.withinLimit,
      },
    };
  }

  @Get('usage/conversation/:conversationId')
  @UseGuards(SimpleJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get token usage for a specific conversation' })
  @ApiResponse({ status: 200, description: 'Conversation usage statistics' })
  async getConversationUsage(
    @Query('conversationId') conversationId: string,
  ): Promise<any> {
    const usage = this.tokenAccountingService.getConversationUsage(conversationId);
    return { conversationId, usage };
  }

  @Get('providers/:providerName/models')
  @ApiOperation({ summary: 'Get models for a specific provider' })
  @ApiResponse({ status: 200, description: 'Provider models' })
  async getProviderModels(
    @Query('providerName') providerName: string,
  ): Promise<ModelInfo[]> {
    const provider = this.providerSelectionService.getProvider(providerName);
    if (!provider) {
      throw new BadRequestException(`Provider '${providerName}' not found`);
    }
    if (!provider.isConfigured()) {
      throw new BadRequestException(`Provider '${providerName}' is not configured`);
    }
    return provider.getModels();
  }
}