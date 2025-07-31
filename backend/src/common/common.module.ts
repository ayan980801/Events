import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringService } from './services/monitoring.service';
import { ModerationService } from './services/moderation.service';
import { MonitoringController } from './controllers/monitoring.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, ModerationService],
  exports: [MonitoringService, ModerationService],
})
export class CommonModule {}
