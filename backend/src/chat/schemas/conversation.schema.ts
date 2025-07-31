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

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastMessageAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
