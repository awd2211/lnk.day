import { Module, Global } from '@nestjs/common';
import { HealthIndicators } from './health-indicators';

@Global()
@Module({
  providers: [HealthIndicators],
  exports: [HealthIndicators],
})
export class HealthIndicatorsModule {}
