import { Module, Global } from '@nestjs/common';
import { HealthIndicators } from './health-indicators';
import { EnhancedHealthService } from './enhanced-health.service';

@Global()
@Module({
  providers: [HealthIndicators, EnhancedHealthService],
  exports: [HealthIndicators, EnhancedHealthService],
})
export class HealthIndicatorsModule {}
