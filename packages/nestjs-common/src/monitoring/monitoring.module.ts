import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
