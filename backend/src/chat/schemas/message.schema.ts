import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: MessageRole })
  role: MessageRole;

  @Prop({ required: true })
  content: string;

  @Prop()
  aiModel?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: 0 })
  tokenCount: number;
}

export const MessageSchema = SchemaFactory.createForClass(Message);