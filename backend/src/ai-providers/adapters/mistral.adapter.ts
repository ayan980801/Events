import { Injectable } from '@nestjs/common';
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

// Since @mistralai/mistralai might have compatibility issues, let's use fetch for now
@Injectable()
export class MistralAdapter implements AIModelProvider {
  readonly name = 'mistral';
  readonly models: ModelInfo[] = [
    {
      id: 'mistral-large-latest',
      name: 'Mistral Large',
      provider: 'mistral',
      maxTokens: 32000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.008, output: 0.024 },
    },
    {
      id: 'mistral-medium-latest',
      name: 'Mistral Medium',
      provider: 'mistral',
      maxTokens: 32000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.0025, output: 0.0075 },
    },
    {
      id: 'mistral-small-latest',
      name: 'Mistral Small',
      provider: 'mistral',
      maxTokens: 32000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.002, output: 0.006 },
    },
  ];

  private readonly apiKey: string | null;
  private readonly baseURL = 'https://api.mistral.ai/v1';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLoggerService,
  ) {
    const config = this.configService.ai.mistral;
    this.apiKey = config?.apiKey || null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getModels(): Promise<ModelInfo[]> {
    if (!this.isConfigured()) {
      return [];
    }
    return this.models;
  }

  private async makeRequest(endpoint: string, body: any, stream = false): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('Mistral API key is not configured');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw { status: response.status, message: error };
    }

    return response;
  }

  async complete(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.debug({
        provider: 'mistral',
        model: options.model,
        messageCount: options.messages.length,
      }, 'Starting Mistral completion request');

      const requestBody = {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        stream: false,
      };

      const response = await this.makeRequest('/chat/completions', requestBody);
      const data = await response.json();

      const choice = data.choices[0];
      const result: ChatCompletionResponse = {
        id: data.id,
        model: data.model,
        content: choice?.message?.content || '',
        finishReason: choice?.finish_reason === 'stop' ? 'stop' : 
                     choice?.finish_reason === 'length' ? 'length' : 'stop',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };

      const duration = Date.now() - startTime;
      this.logger.logPerformance('mistral_completion', duration, {
        model: options.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = ProviderErrorMapper.mapMistralError(error);
      
      this.logger.logError(error, 'Mistral completion error', {
        provider: 'mistral',
        model: options.model,
        duration,
        errorCode: mappedError.code,
      });
      
      throw mappedError;
    }
  }

  async* stream(options: ChatCompletionOptions): AsyncIterable<StreamChunk> {
    const startTime = Date.now();
    
    try {
      this.logger.debug({
        provider: 'mistral',
        model: options.model,
        messageCount: options.messages.length,
        streaming: true,
      }, 'Starting Mistral streaming request');

      const requestBody = {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        stream: true,
      };

      const response = await this.makeRequest('/chat/completions', requestBody, true);
      
      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];
                
                if (choice) {
                  const streamChunk: StreamChunk = {
                    id: parsed.id,
                    model: parsed.model,
                    delta: {
                      role: choice.delta?.role === 'assistant' ? 'assistant' : undefined,
                      content: choice.delta?.content || undefined,
                    },
                    finishReason: choice.finish_reason === 'stop' ? 'stop' : 
                                 choice.finish_reason === 'length' ? 'length' : undefined,
                  };

                  yield streamChunk;
                }
              } catch (parseError) {
                // Skip invalid JSON chunks
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const duration = Date.now() - startTime;
      this.logger.logPerformance('mistral_stream', duration, {
        model: options.model,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = ProviderErrorMapper.mapMistralError(error);
      
      this.logger.logError(error, 'Mistral streaming error', {
        provider: 'mistral',
        model: options.model,
        duration,
        errorCode: mappedError.code,
      });
      
      throw mappedError;
    }
  }

  async healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { status: 'down', error: 'Mistral client not configured' };
    }

    const startTime = Date.now();
    
    try {
      // Simple health check using a minimal completion
      const requestBody = {
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
        temperature: 0,
      };

      await this.makeRequest('/chat/completions', requestBody);

      const latency = Date.now() - startTime;
      return { status: 'up', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.warn({
        provider: 'mistral',
        latency,
        error: error.message,
      }, 'Mistral health check failed');
      
      return { status: 'down', latency, error: error.message };
    }
  }
}