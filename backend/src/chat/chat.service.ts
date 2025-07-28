import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from './schemas/conversation.schema';
import { Message, MessageRole } from './schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AiProvidersService } from '../ai-providers/ai-providers.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
    private aiProvidersService: AiProvidersService,
  ) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const conversation = new this.conversationModel({
      userId,
      ...createConversationDto,
    });
    return conversation.save();
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationModel
      .find({ userId, isActive: true })
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    return this.conversationModel
      .findOne({ _id: conversationId, userId })
      .exec();
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    // Verify user owns the conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<{ userMessage: Message; aiResponse: Message }> {
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Save user message
    const userMessage = new this.messageModel({
      conversationId,
      userId,
      role: MessageRole.USER,
      content: sendMessageDto.content,
    });
    await userMessage.save();

    // Get conversation history for context
    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();

    // Generate AI response
    const aiResponseContent = await this.aiProvidersService.generateResponse(
      conversation.aiModel || 'gpt-3.5-turbo',
      messages.map(msg => ({
        role: msg.role as any,
        content: msg.content,
      })),
    );

    // Save AI response
    const aiResponse = new this.messageModel({
      conversationId,
      userId,
      role: MessageRole.ASSISTANT,
      content: aiResponseContent,
      aiModel: conversation.aiModel,
    });
    await aiResponse.save();

    // Update conversation last message time
    conversation.lastMessageAt = new Date();
    if (!conversation.title || conversation.title === 'New Conversation') {
      // Generate a title based on the first message
      conversation.title = this.generateConversationTitle(sendMessageDto.content);
    }
    await conversation.save();

    return { userMessage, aiResponse };
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Soft delete
    conversation.isActive = false;
    await conversation.save();
  }

  private generateConversationTitle(firstMessage: string): string {
    // Simple title generation - take first 50 characters
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 47) + '...'
      : firstMessage;
    return title;
  }
}