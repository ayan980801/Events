import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProvidersService } from './ai-providers.service';

@Module({
  imports: [ConfigModule],
  providers: [AiProvidersService],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
