import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringService } from './services/monitoring.service';
import { MonitoringController } from './controllers/monitoring.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class CommonModule {}