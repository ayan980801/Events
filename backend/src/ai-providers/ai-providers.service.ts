import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AiProvidersService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const openaiApiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
      });
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
      console.error('Error generating AI response:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private async generateOpenAIResponse(model: string, messages: ChatMessage[]): Promise<string> {
    if (!this.openai) {
      return 'OpenAI is not configured. Please check your API key.';
    }

    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'No response generated.';
  }

  private async generateClaudeResponse(model: string, messages: ChatMessage[]): Promise<string> {
    // TODO: Implement Anthropic Claude integration
    return 'Claude integration is not yet implemented. This is a mock response from Claude.';
  }

  private async generateMistralResponse(model: string, messages: ChatMessage[]): Promise<string> {
    // TODO: Implement Mistral AI integration
    return 'Mistral AI integration is not yet implemented. This is a mock response from Mistral.';
  }

  getAvailableModels(): string[] {
    return [
      'gpt-4',
      'gpt-3.5-turbo',
      'claude-3-sonnet',
      'claude-3-haiku',
      'mistral-7b-instruct',
      'mistral-medium',
    ];
  }
}