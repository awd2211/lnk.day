import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamQuota, QuotaUsageLog } from './quota.entity';
import { QuotaService } from './quota.service';
import { QuotaController } from './quota.controller';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamQuota, QuotaUsageLog]),
    forwardRef(() => PlanModule),
  ],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
