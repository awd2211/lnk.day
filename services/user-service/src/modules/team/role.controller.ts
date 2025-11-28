import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleService, CreateRoleDto, UpdateRoleDto } from './role.service';
import { Permission } from './entities/custom-role.entity';

@ApiTags('roles')
@Controller('teams/:teamId/roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: '获取团队所有角色' })
  async findAll(@Param('teamId') teamId: string) {
    const roles = await this.roleService.findAll(teamId);
    return { roles };
  }

  @Post()
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
  @ApiOperation({ summary: '获取所有可用权限' })
  getAvailablePermissions() {
    return this.roleService.getAvailablePermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个角色' })
  async findOne(@Param('teamId') teamId: string, @Param('id') id: string) {
    const role = await this.roleService.findOne(id, teamId);
    return { role };
  }

  @Put(':id')
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
  @ApiOperation({ summary: '删除角色' })
  async delete(@Param('teamId') teamId: string, @Param('id') id: string) {
    await this.roleService.delete(id, teamId);
    return { success: true };
  }

  @Post(':id/duplicate')
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
  @ApiOperation({ summary: '初始化默认角色' })
  async initializeDefaults(@Param('teamId') teamId: string) {
    await this.roleService.initializeDefaultRoles(teamId);
    return { success: true };
  }

  @Get('default')
  @ApiOperation({ summary: '获取默认角色' })
  async getDefaultRole(@Param('teamId') teamId: string) {
    const role = await this.roleService.getDefaultRole(teamId);
    return { role };
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: '设置为默认角色' })
  async setDefault(@Param('teamId') teamId: string, @Param('id') id: string) {
    const role = await this.roleService.update(id, teamId, { isDefault: true });
    return { role };
  }
}
