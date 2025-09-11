import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import MistralClient from '@mistralai/mistralai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AiProvidersService {
  private readonly logger = new Logger(AiProvidersService.name);
  private openai: OpenAI;
  private anthropic: Anthropic;
  private mistral: MistralClient;

  constructor(private configService: ConfigService) {
    const openaiApiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiApiKey && openaiApiKey !== 'your-openai-api-key') {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
      });
    }

    const anthropicApiKey = this.configService.get('ANTHROPIC_API_KEY');
    if (anthropicApiKey && anthropicApiKey !== 'your-anthropic-api-key') {
      this.anthropic = new Anthropic({
        apiKey: anthropicApiKey,
      });
    }

    const mistralApiKey = this.configService.get('MISTRAL_API_KEY');
    if (mistralApiKey && mistralApiKey !== 'your-mistral-api-key') {
      this.mistral = new MistralClient(mistralApiKey);
    }
  }

  async generateResponse(model: string, messages: ChatMessage[]): Promise<string> {
    try {
      switch (true) {
        case model.includes('gpt'):
          return await this.generateOpenAIResponse(model, messages);
        case model.includes('claude'):
          return await this.generateClaudeResponse(model, messages);
        case model.includes('mistral'):
          return await this.generateMistralResponse(model, messages);
        default:
          return await this.generateOpenAIResponse('gpt-3.5-turbo', messages);
      }
    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  async generateStreamingResponse(model: string, messages: ChatMessage[]): Promise<AsyncIterable<string>> {
    try {
      switch (true) {
        case model.includes('gpt'):
          return this.generateOpenAIStreamingResponse(model, messages);
        case model.includes('claude'):
          return this.generateClaudeStreamingResponse(model, messages);
        case model.includes('mistral'):
          return this.generateMistralStreamingResponse(model, messages);
        default:
          return this.generateOpenAIStreamingResponse('gpt-3.5-turbo', messages);
      }
    } catch (error) {
      this.logger.error('Error generating streaming AI response:', error);
      throw new InternalServerErrorException('Failed to generate AI response');
    }
  }

  private async generateOpenAIResponse(model: string, messages: ChatMessage[]): Promise<string> {
    if (!this.openai) {
      return 'OpenAI is not configured. Please check your API key.';
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'No response generated.';
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw new InternalServerErrorException('OpenAI API request failed');
    }
  }

  private async *generateOpenAIStreamingResponse(model: string, messages: ChatMessage[]): AsyncIterable<string> {
    if (!this.openai) {
      yield 'OpenAI is not configured. Please check your API key.';
      return;
    }

    try {
      const stream = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error('OpenAI streaming API error:', error);
      throw new InternalServerErrorException('OpenAI streaming API request failed');
    }
  }

  private async generateClaudeResponse(model: string, messages: ChatMessage[]): Promise<string> {
    if (!this.anthropic) {
      return 'Claude is not configured. Please check your Anthropic API key.';
    }

    try {
      // For now, return a mock response until we fix the API call
      void model;
      void messages;
      return 'Claude integration is working but API call is temporarily mocked. Real implementation coming soon.';
    } catch (error) {
      this.logger.error('Claude API error:', error);
      throw new InternalServerErrorException('Claude API request failed');
    }
  }

  private async *generateClaudeStreamingResponse(model: string, messages: ChatMessage[]): AsyncIterable<string> {
    if (!this.anthropic) {
      yield 'Claude is not configured. Please check your Anthropic API key.';
      return;
    }

    try {
      // For now, yield a mock response until we fix the API call
      void model;
      void messages;
      yield 'Claude streaming is working but API call is temporarily mocked. Real implementation coming soon.';
    } catch (error) {
      this.logger.error('Claude streaming API error:', error);
      throw new InternalServerErrorException('Claude streaming API request failed');
    }
  }

  private async generateMistralResponse(model: string, messages: ChatMessage[]): Promise<string> {
    if (!this.mistral) {
      return 'Mistral AI is not configured. Please check your Mistral API key.';
    }

    try {
      // For now, return a mock response until we fix the API call
      void model;
      void messages;
      return 'Mistral AI integration is working but API call is temporarily mocked. Real implementation coming soon.';
    } catch (error) {
      this.logger.error('Mistral API error:', error);
      throw new InternalServerErrorException('Mistral API request failed');
    }
  }

  private async *generateMistralStreamingResponse(model: string, messages: ChatMessage[]): AsyncIterable<string> {
    if (!this.mistral) {
      yield 'Mistral AI is not configured. Please check your Mistral API key.';
      return;
    }

    try {
      // For now, yield a mock response until we fix the API call
      void model;
      void messages;
      yield 'Mistral AI streaming is working but API call is temporarily mocked. Real implementation coming soon.';
    } catch (error) {
      this.logger.error('Mistral streaming API error:', error);
      throw new InternalServerErrorException('Mistral streaming API request failed');
    }
  }

  getAvailableModels(): { provider: string; models: string[] }[] {
    const providers = [];
    
    if (this.openai) {
      providers.push({
        provider: 'OpenAI',
        models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      });
    }
    
    if (this.anthropic) {
      providers.push({
        provider: 'Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      });
    }
    
    if (this.mistral) {
      providers.push({
        provider: 'Mistral',
        models: ['mistral-large', 'mistral-medium', 'mistral-small'],
      });
    }

    return providers;
  }

  isProviderAvailable(provider: string): boolean {
    switch (provider.toLowerCase()) {
      case 'openai':
        return !!this.openai;
      case 'anthropic':
      case 'claude':
        return !!this.anthropic;
      case 'mistral':
        return !!this.mistral;
      default:
        return false;
    }
  }
}
