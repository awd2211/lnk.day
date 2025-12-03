import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PresetRoleService, UpdatePresetRoleDto } from './preset-role.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('system/preset-roles')
@Controller('system/preset-roles')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@UseInterceptors(AuditLogInterceptor)
export class PresetRoleController {
  constructor(private readonly presetRoleService: PresetRoleService) {}

  @Get()
  @ApiOperation({ summary: '获取所有预设团队角色及其权限' })
  async findAll() {
    const presets = await this.presetRoleService.findAll();
    return { presets };
  }

  @Get('permissions')
  @ApiOperation({ summary: '获取所有可用权限及分组' })
  getAvailablePermissions() {
    return this.presetRoleService.getAvailablePermissions();
  }

  @Get(':role')
  @ApiOperation({ summary: '获取单个预设角色的权限' })
  @ApiParam({ name: 'role', description: '角色名称 (OWNER, ADMIN, MEMBER, VIEWER)' })
  async findOne(@Param('role') role: string) {
    const preset = await this.presetRoleService.findOne(role);
    return { preset };
  }

  @Put(':role')
  @ApiOperation({ summary: '更新预设角色的权限' })
  @ApiParam({ name: 'role', description: '角色名称 (ADMIN, MEMBER, VIEWER)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['permissions'],
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['links:view', 'links:create', 'analytics:view'],
        },
      },
    },
  })
  @LogAudit({
    action: 'preset.role.update',
    targetType: 'preset_role',
    targetIdParam: 'role',
    detailFields: ['permissions'],
  })
  async update(@Param('role') role: string, @Body() dto: UpdatePresetRoleDto) {
    const preset = await this.presetRoleService.update(role, dto);
    return { preset };
  }

  @Post(':role/reset')
  @ApiOperation({ summary: '将预设角色权限恢复为系统默认' })
  @ApiParam({ name: 'role', description: '角色名称 (ADMIN, MEMBER, VIEWER)' })
  @LogAudit({
    action: 'preset.role.reset',
    targetType: 'preset_role',
    targetIdParam: 'role',
  })
  async reset(@Param('role') role: string) {
    const preset = await this.presetRoleService.reset(role);
    return { preset, message: '角色权限已恢复为默认配置' };
  }
}

// 内部 API（无需认证，供其他服务调用）
@ApiTags('system/preset-roles-internal')
@Controller('system/preset-roles-internal')
export class PresetRoleInternalController {
  constructor(private readonly presetRoleService: PresetRoleService) {}

  @Get()
  @ApiOperation({ summary: '获取所有预设团队角色及其权限（内部）' })
  async findAll() {
    const presets = await this.presetRoleService.findAll();
    return { presets };
  }

  @Get(':role')
  @ApiOperation({ summary: '获取单个预设角色的权限（内部）' })
  async findOne(@Param('role') role: string) {
    const preset = await this.presetRoleService.findOne(role);
    return { preset };
  }
}
