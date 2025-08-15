import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AIModelProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  ModelInfo,
  ChatMessage,
} from '../interfaces/ai-model-provider.interface';
import { ConfigService } from '../../config/config.service';
import { ProviderErrorMapper } from '../utils/error-mapper';
import { PinoLoggerService } from '../../common/logger/pino-logger.service';

@Injectable()
export class OpenAIAdapter implements AIModelProvider {
  readonly name = 'openai';
  readonly models: ModelInfo[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      maxTokens: 8192,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.03, output: 0.06 },
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      maxTokens: 128000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.01, output: 0.03 },
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      maxTokens: 4096,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.0015, output: 0.002 },
    },
  ];

  private readonly client: OpenAI | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLoggerService,
  ) {
    const config = this.configService.ai.openai;
    this.client = config ? new OpenAI({ apiKey: config.apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async getModels(): Promise<ModelInfo[]> {
    if (!this.isConfigured()) {
      return [];
    }
    return this.models;
  }

  async complete(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI client is not configured');
    }

    const startTime = Date.now();
    
    try {
      this.logger.debug({
        provider: 'openai',
        model: options.model,
        messageCount: options.messages.length,
      }, 'Starting OpenAI completion request');

      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        stream: false,
        user: options.userId,
      });

      const choice = response.choices[0];
      const result: ChatCompletionResponse = {
        id: response.id,
        model: response.model,
        content: choice?.message?.content || '',
        finishReason: choice?.finish_reason === 'stop' ? 'stop' : 
                     choice?.finish_reason === 'length' ? 'length' : 
                     choice?.finish_reason === 'content_filter' ? 'content_filter' : 'stop',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };

      const duration = Date.now() - startTime;
      this.logger.logPerformance('openai_completion', duration, {
        model: options.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = ProviderErrorMapper.mapOpenAIError(error);
      
      this.logger.logError(error, 'OpenAI completion error', {
        provider: 'openai',
        model: options.model,
        duration,
        errorCode: mappedError.code,
      });
      
      throw mappedError;
    }
  }

  async* stream(options: ChatCompletionOptions): AsyncIterable<StreamChunk> {
    if (!this.client) {
      throw new Error('OpenAI client is not configured');
    }

    const startTime = Date.now();
    
    try {
      this.logger.debug({
        provider: 'openai',
        model: options.model,
        messageCount: options.messages.length,
        streaming: true,
      }, 'Starting OpenAI streaming request');

      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        stream: true,
        user: options.userId,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const streamChunk: StreamChunk = {
          id: chunk.id,
          model: chunk.model,
          delta: {
            role: choice.delta.role === 'assistant' ? 'assistant' : undefined,
            content: choice.delta.content || undefined,
          },
          finishReason: choice.finish_reason === 'stop' ? 'stop' : 
                       choice.finish_reason === 'length' ? 'length' : 
                       choice.finish_reason === 'content_filter' ? 'content_filter' : undefined,
        };

        yield streamChunk;
      }

      const duration = Date.now() - startTime;
      this.logger.logPerformance('openai_stream', duration, {
        model: options.model,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = ProviderErrorMapper.mapOpenAIError(error);
      
      this.logger.logError(error, 'OpenAI streaming error', {
        provider: 'openai',
        model: options.model,
        duration,
        errorCode: mappedError.code,
      });
      
      throw mappedError;
    }
  }

  async healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { status: 'down', error: 'OpenAI client not configured' };
    }

    const startTime = Date.now();
    
    try {
      // Simple health check using a minimal completion
      await this.client!.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
        temperature: 0,
      });

      const latency = Date.now() - startTime;
      return { status: 'up', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.warn({
        provider: 'openai',
        latency,
        error: error.message,
      }, 'OpenAI health check failed');
      
      return { status: 'down', latency, error: error.message };
    }
  }
}