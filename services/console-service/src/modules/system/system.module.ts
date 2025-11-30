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

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemConfig, AdminRoleEntity]),
    HttpModule,
  ],
  controllers: [SystemController, SystemInternalController, AdminRoleController, PresetRoleController, PresetRoleInternalController],
  providers: [SystemService, SystemConfigService, AdminRoleService, PresetRoleService],
  exports: [SystemService, SystemConfigService, AdminRoleService, PresetRoleService],
})
export class SystemModule implements OnModuleInit {
  constructor(private readonly adminRoleService: AdminRoleService) {}

  async onModuleInit() {
    // 自动初始化默认角色
    await this.adminRoleService.initializeDefaultRoles();
  }
}
