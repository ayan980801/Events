import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { PinoLoggerService } from '../common/logger/pino-logger.service';
import {
  AIModelProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  ModelInfo,
  ProviderError,
} from './interfaces/ai-model-provider.interface';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { MistralAdapter } from './adapters/mistral.adapter';

export interface ProviderSelectionOptions {
  preferredProvider?: string;
  preferredModel?: string;
  fallbackProviders?: string[];
  retryAttempts?: number;
}

@Injectable()
export class ProviderSelectionService {
  private readonly providers = new Map<string, AIModelProvider>();
  private readonly defaultFallbackChain = ['openai', 'anthropic', 'mistral'];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLoggerService,
    private readonly openaiAdapter: OpenAIAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly mistralAdapter: MistralAdapter,
  ) {
    // Register all available providers
    this.providers.set('openai', openaiAdapter);
    this.providers.set('anthropic', anthropicAdapter);
    this.providers.set('mistral', mistralAdapter);
  }

  /**
   * Get a provider by name
   */
  getProvider(providerName: string): AIModelProvider | null {
    return this.providers.get(providerName.toLowerCase()) || null;
  }

  /**
   * Get all available (configured) providers
   */
  getAvailableProviders(): AIModelProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isConfigured());
  }

  /**
   * Get all available models from all providers
   */
  async getAllModels(): Promise<ModelInfo[]> {
    const availableProviders = this.getAvailableProviders();
    const modelPromises = availableProviders.map(provider => provider.getModels());
    const modelArrays = await Promise.all(modelPromises);
    return modelArrays.flat();
  }

  /**
   * Resolve the best provider and model based on preferences and availability
   */
  async resolveProvider(
    requestedModel?: string,
    options: ProviderSelectionOptions = {},
  ): Promise<{ provider: AIModelProvider; model: string }> {
    // If a specific model is requested, find the provider that supports it
    if (requestedModel) {
      const allModels = await this.getAllModels();
      const targetModel = allModels.find(m => m.id === requestedModel);
      
      if (targetModel) {
        const provider = this.getProvider(targetModel.provider);
        if (provider?.isConfigured()) {
          return { provider, model: requestedModel };
        }
      }
    }

    // Try preferred provider first
    if (options.preferredProvider) {
      const provider = this.getProvider(options.preferredProvider);
      if (provider?.isConfigured()) {
        const models = await provider.getModels();
        const model = options.preferredModel || models[0]?.id;
        if (model) {
          return { provider, model };
        }
      }
    }

    // Fallback through provider chain
    const fallbackChain = options.fallbackProviders || this.defaultFallbackChain;
    
    for (const providerName of fallbackChain) {
      const provider = this.getProvider(providerName);
      if (provider?.isConfigured()) {
        const models = await provider.getModels();
        if (models.length > 0) {
          return { provider, model: models[0].id };
        }
      }
    }

    throw new Error('No available AI providers configured');
  }

  /**
   * Complete a chat with automatic provider selection and fallback
   */
  async complete(
    options: ChatCompletionOptions,
    selectionOptions: ProviderSelectionOptions = {},
  ): Promise<ChatCompletionResponse> {
    const retryAttempts = selectionOptions.retryAttempts || 2;
    let lastError: ProviderError | Error | null = null;

    // Get the fallback chain
    const fallbackChain = selectionOptions.fallbackProviders || this.defaultFallbackChain;
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      for (const providerName of fallbackChain) {
        try {
          const { provider, model } = await this.resolveProvider(options.model, {
            ...selectionOptions,
            preferredProvider: providerName,
          });

          this.logger.debug({
            provider: providerName,
            model,
            attempt: attempt + 1,
            fallbackChain,
          }, 'Attempting chat completion with provider');

          const result = await provider.complete({ ...options, model });
          
          // Log successful completion
          this.logger.log({
            provider: providerName,
            model,
            attempt: attempt + 1,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
          }, 'Chat completion successful');

          return result;
        } catch (error) {
          lastError = error;
          const isRetryable = error instanceof Error && 
            'retryable' in error && error.retryable;

          this.logger.warn({
            provider: providerName,
            model: options.model,
            attempt: attempt + 1,
            error: error.message,
            retryable: isRetryable,
          }, 'Provider completion failed');

          // If error is not retryable, try next provider
          if (!isRetryable) {
            continue;
          }

          // If retryable and we have more attempts, wait before retry
          if (attempt < retryAttempts - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await this.delay(delay);
          }
        }
      }
    }

    // All providers and attempts failed
    this.logger.error({
      fallbackChain,
      attempts: retryAttempts,
      lastError: lastError?.message,
    }, 'All provider completion attempts failed');

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Stream a chat with automatic provider selection and fallback
   */
  async* stream(
    options: ChatCompletionOptions,
    selectionOptions: ProviderSelectionOptions = {},
  ): AsyncIterable<StreamChunk> {
    try {
      const { provider, model } = await this.resolveProvider(options.model, selectionOptions);

      this.logger.debug({
        provider: provider.name,
        model,
      }, 'Starting streaming with provider');

      yield* provider.stream({ ...options, model });

    } catch (error) {
      this.logger.error({
        error: error.message,
      }, 'Streaming failed');
      
      throw error;
    }
  }

  /**
   * Health check for all providers
   */
  async healthCheckAll(): Promise<Record<string, any>> {
    const providers = this.getAvailableProviders();
    const healthPromises = providers.map(async (provider) => {
      try {
        const health = await provider.healthCheck();
        return [provider.name, health];
      } catch (error) {
        return [provider.name, { status: 'down', error: error.message }];
      }
    });

    const results = await Promise.all(healthPromises);
    return Object.fromEntries(results);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}