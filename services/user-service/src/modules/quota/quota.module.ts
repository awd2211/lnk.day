import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamQuota, QuotaUsageLog } from './quota.entity';
import { QuotaService } from './quota.service';
import { QuotaController } from './quota.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeamQuota, QuotaUsageLog])],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
