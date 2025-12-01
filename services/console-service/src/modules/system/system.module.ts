import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SystemController, SystemInternalController } from './system.controller';
import { SystemService } from './system.service';
import { SystemConfigService } from './config.service';
import { SystemConfig } from './entities/system-config.entity';
import { AdminRoleEntity } from './entities/admin-role.entity';
import { AdminRoleService } from './admin-role.service';
import { AdminRoleController } from './admin-role.controller';
import { PresetRoleController, PresetRoleInternalController } from './preset-role.controller';
import { PresetRoleService } from './preset-role.service';
import { IntegrationConfig } from './entities/integration-config.entity';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationConfigController } from './integration-config.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemConfig, AdminRoleEntity, IntegrationConfig]),
    HttpModule,
  ],
  controllers: [
    SystemController,
    SystemInternalController,
    AdminRoleController,
    PresetRoleController,
    PresetRoleInternalController,
    IntegrationConfigController,
  ],
  providers: [
    SystemService,
    SystemConfigService,
    AdminRoleService,
    PresetRoleService,
    IntegrationConfigService,
  ],
  exports: [
    SystemService,
    SystemConfigService,
    AdminRoleService,
    PresetRoleService,
    IntegrationConfigService,
  ],
})
export class SystemModule implements OnModuleInit {
  constructor(
    private readonly adminRoleService: AdminRoleService,
    private readonly integrationConfigService: IntegrationConfigService,
  ) {}

  async onModuleInit() {
    // 自动初始化默认角色
    await this.adminRoleService.initializeDefaultRoles();
  }
}
