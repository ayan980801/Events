import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: 'gpt-3.5-turbo' })
  aiModel: string;

  @Prop({ default: 0.7, min: 0, max: 2 })
  temperature: number;

  @Prop({ default: 1000, min: 1, max: 4000 })
  maxTokens: number;

  @Prop()
  systemPrompt?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastMessageAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
