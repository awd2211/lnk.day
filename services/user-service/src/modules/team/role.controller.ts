import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
} from '@lnk/nestjs-common';
import { RoleService, CreateRoleDto, UpdateRoleDto } from './role.service';

@ApiTags('roles')
@Controller('teams/:teamId/roles')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@ApiBearerAuth()
@ApiParam({ name: 'teamId', description: '团队 ID' })
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiOperation({ summary: '获取团队所有角色' })
  async findAll(@Param('teamId') teamId: string) {
    const roles = await this.roleService.findAll(teamId);
    return { roles };
  }

  @Post()
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '创建自定义角色' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'permissions'],
      properties: {
        name: { type: 'string', example: '内容编辑' },
        description: { type: 'string', example: '可以创建和编辑链接和页面' },
        color: { type: 'string', example: '#8B5CF6' },
        permissions: { type: 'array', items: { type: 'string' } },
        isDefault: { type: 'boolean' },
      },
    },
  })
  async create(@Param('teamId') teamId: string, @Body() dto: CreateRoleDto) {
    const role = await this.roleService.create(teamId, dto);
    return { role };
  }

  @Get('permissions')
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiOperation({ summary: '获取所有可用权限' })
  async getAvailablePermissions() {
    return this.roleService.getAvailablePermissions();
  }

  @Get(':id')
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiOperation({ summary: '获取单个角色' })
  async findOne(@Param('teamId') teamId: string, @Param('id') id: string) {
    const role = await this.roleService.findOne(id, teamId);
    return { role };
  }

  @Put(':id')
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '更新角色' })
  async update(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const role = await this.roleService.update(id, teamId, dto);
    return { role };
  }

  @Delete(':id')
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '删除角色' })
  async delete(@Param('teamId') teamId: string, @Param('id') id: string) {
    await this.roleService.delete(id, teamId);
    return { success: true };
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '复制角色' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: '内容编辑 (副本)' },
      },
    },
  })
  async duplicate(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const role = await this.roleService.duplicateRole(id, teamId, body.name);
    return { role };
  }

  @Post('initialize')
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '初始化默认角色' })
  async initializeDefaults(@Param('teamId') teamId: string) {
    await this.roleService.initializeDefaultRoles(teamId);
    return { success: true };
  }

  @Get('default')
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiOperation({ summary: '获取默认角色' })
  async getDefaultRole(@Param('teamId') teamId: string) {
    const role = await this.roleService.getDefaultRole(teamId);
    return { role };
  }

  @Post(':id/set-default')
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '设置为默认角色' })
  async setDefault(@Param('teamId') teamId: string, @Param('id') id: string) {
    const role = await this.roleService.update(id, teamId, { isDefault: true });
    return { role };
  }
}
