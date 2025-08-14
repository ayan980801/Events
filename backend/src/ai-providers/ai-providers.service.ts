import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import MistralAI from '@mistralai/mistralai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AiProvidersService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private mistral: MistralAI;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI
    const openaiApiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
      });
    }

    // Initialize Anthropic Claude
    const anthropicApiKey = this.configService.get('ANTHROPIC_API_KEY');
    if (anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: anthropicApiKey,
      });
    }

    // Initialize Mistral
    const mistralApiKey = this.configService.get('MISTRAL_API_KEY');
    if (mistralApiKey) {
      this.mistral = new MistralAI(mistralApiKey);
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
    if (!this.anthropic) {
      return 'Claude is not configured. Please check your Anthropic API key.';
    }

    try {
      // For now, return a mock response as the actual Claude integration requires proper setup
      return 'This is a mock response from Claude. Claude integration is configured but requires proper API setup.';
    } catch (error) {
      console.error('Claude API error:', error);
      return 'I apologize, but I encountered an error with Claude. Please try again.';
    }
  }

  private async generateMistralResponse(model: string, messages: ChatMessage[]): Promise<string> {
    if (!this.mistral) {
      return 'Mistral is not configured. Please check your Mistral API key.';
    }

    try {
      // For now, return a mock response as the actual Mistral integration requires proper setup
      return 'This is a mock response from Mistral AI. Mistral integration is configured but requires proper API setup.';
    } catch (error) {
      console.error('Mistral API error:', error);
      return 'I apologize, but I encountered an error with Mistral. Please try again.';
    }
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
