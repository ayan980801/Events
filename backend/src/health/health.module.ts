import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [TerminusModule, AiProvidersModule],
  controllers: [HealthController],
})
export class HealthModule {}