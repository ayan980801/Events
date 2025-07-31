import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Conversation, ConversationSchema } from '../chat/schemas/conversation.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';
import { CommonModule } from '../common/common.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    CommonModule,
    AiProvidersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
