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

@Injectable()
export class AnthropicAdapter implements AIModelProvider {
  readonly name = 'anthropic';
  readonly models: ModelInfo[] = [
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      maxTokens: 200000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.015, output: 0.075 },
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      maxTokens: 200000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.003, output: 0.015 },
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      maxTokens: 200000,
      supportsStreaming: true,
      costPer1kTokens: { input: 0.00025, output: 0.00125 },
    },
  ];

  private readonly apiKey: string | null;
  private readonly baseURL = 'https://api.anthropic.com/v1';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLoggerService,
  ) {
    const config = this.configService.ai.anthropic;
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

  private convertMessages(messages: ChatMessage[]): { system?: string; messages: any[] } {
    let system = '';
    const claudeMessages: any[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        system = message.content;
      } else {
        claudeMessages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return { system: system || undefined, messages: claudeMessages };
  }

  private async makeRequest(endpoint: string, body: any, stream = false): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'anthropic-version': '2023-06-01',
        'x-api-key': this.apiKey,
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
        provider: 'anthropic',
        model: options.model,
        messageCount: options.messages.length,
      }, 'Starting Anthropic completion request');

      const { system, messages } = this.convertMessages(options.messages);

      const requestBody: any = {
        model: options.model,
        messages,
        max_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7,
        stream: false,
      };

      if (system) {
        requestBody.system = system;
      }

      const response = await this.makeRequest('/messages', requestBody);
      const data = await response.json();

      const content = data.content?.[0]?.text || '';
      
      const result: ChatCompletionResponse = {
        id: data.id,
        model: data.model,
        content,
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 
                     data.stop_reason === 'max_tokens' ? 'length' : 'stop',
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      };

      const duration = Date.now() - startTime;
      this.logger.logPerformance('anthropic_completion', duration, {
        model: options.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = ProviderErrorMapper.mapAnthropicError(error);
      
      this.logger.logError(error, 'Anthropic completion error', {
        provider: 'anthropic',
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
        provider: 'anthropic',
        model: options.model,
        messageCount: options.messages.length,
        streaming: true,
      }, 'Starting Anthropic streaming request');

      const { system, messages } = this.convertMessages(options.messages);

      const requestBody: any = {
        model: options.model,
        messages,
        max_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7,
        stream: true,
      };

      if (system) {
        requestBody.system = system;
      }

      const response = await this.makeRequest('/messages', requestBody, true);
      
      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        let messageId = '';
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
                
                if (parsed.type === 'message_start') {
                  messageId = parsed.message.id;
                  yield {
                    id: messageId,
                    model: parsed.message.model,
                    delta: { role: 'assistant' },
                  };
                } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  yield {
                    id: messageId,
                    model: options.model,
                    delta: { content: parsed.delta.text },
                  };
                } else if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
                  yield {
                    id: messageId,
                    model: options.model,
                    delta: {},
                    finishReason: parsed.delta.stop_reason === 'end_turn' ? 'stop' : 
                                 parsed.delta.stop_reason === 'max_tokens' ? 'length' : 'stop',
                  };
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
      this.logger.logPerformance('anthropic_stream', duration, {
        model: options.model,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = ProviderErrorMapper.mapAnthropicError(error);
      
      this.logger.logError(error, 'Anthropic streaming error', {
        provider: 'anthropic',
        model: options.model,
        duration,
        errorCode: mappedError.code,
      });
      
      throw mappedError;
    }
  }

  async healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { status: 'down', error: 'Anthropic client not configured' };
    }

    const startTime = Date.now();
    
    try {
      // Simple health check using a minimal completion
      const { system, messages } = this.convertMessages([
        { role: 'user', content: 'Hi' }
      ]);

      const requestBody: any = {
        model: 'claude-3-haiku-20240307',
        messages,
        max_tokens: 1,
        temperature: 0,
      };

      if (system) {
        requestBody.system = system;
      }

      await this.makeRequest('/messages', requestBody);

      const latency = Date.now() - startTime;
      return { status: 'up', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.warn({
        provider: 'anthropic',
        latency,
        error: error.message,
      }, 'Anthropic health check failed');
      
      return { status: 'down', latency, error: error.message };
    }
  }
}