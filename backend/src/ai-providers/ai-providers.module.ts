import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';

// Services
import { AiProvidersService } from './ai-providers.service';
import { ProviderSelectionService } from './provider-selection.service';
import { TokenAccountingService } from './token-accounting.service';

// Adapters
import { OpenAIAdapter } from './adapters/openai.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { MistralAdapter } from './adapters/mistral.adapter';

// Controller
import { AiProvidersController } from './ai-providers.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AiProvidersController],
  providers: [
    // Legacy service (for backward compatibility)
    AiProvidersService,
    
    // New provider adapters
    OpenAIAdapter,
    AnthropicAdapter,
    MistralAdapter,
    
    // Provider management services
    ProviderSelectionService,
    TokenAccountingService,
  ],
  exports: [
    AiProvidersService,
    ProviderSelectionService,
    TokenAccountingService,
    OpenAIAdapter,
    AnthropicAdapter,
    MistralAdapter,
  ],
})
export class AiProvidersModule {}
