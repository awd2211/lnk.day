import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import {
  Tenant,
  TenantMember,
  TenantInvitation,
  TenantAuditLog,
  TenantApiKey,
} from './entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantMember,
      TenantInvitation,
      TenantAuditLog,
      TenantApiKey,
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
