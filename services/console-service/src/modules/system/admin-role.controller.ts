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
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleService, CreateAdminRoleDto, UpdateAdminRoleDto } from './admin-role.service';

@ApiTags('system/roles')
@Controller('system/roles')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AdminRoleController {
  constructor(private readonly roleService: AdminRoleService) {}

  @Get()
  @ApiOperation({ summary: '获取所有管理员角色' })
  async findAll() {
    const roles = await this.roleService.findAll();
    return { roles };
  }

  @Get('permissions')
  @ApiOperation({ summary: '获取所有可用权限' })
  getAvailablePermissions() {
    return this.roleService.getAvailablePermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个角色' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  async findOne(@Param('id') id: string) {
    const role = await this.roleService.findOne(id);
    return { role };
  }

  @Post()
  @ApiOperation({ summary: '创建自定义角色' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'permissions'],
      properties: {
        name: { type: 'string', example: '内容审核员' },
        description: { type: 'string', example: '负责审核链接和页面内容' },
        color: { type: 'string', example: '#8B5CF6' },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['admin:links:view', 'admin:links:manage', 'admin:pages:view', 'admin:pages:manage'],
        },
        priority: { type: 'number', example: 20 },
      },
    },
  })
  async create(@Body() dto: CreateAdminRoleDto) {
    const role = await this.roleService.create(dto);
    return { role };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新角色' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateAdminRoleDto) {
    const role = await this.roleService.update(id, dto);
    return { role };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  async delete(@Param('id') id: string) {
    await this.roleService.delete(id);
    return { success: true };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制角色' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: '内容审核员 (副本)' },
      },
    },
  })
  async duplicate(@Param('id') id: string, @Body() body: { name: string }) {
    const role = await this.roleService.duplicate(id, body.name);
    return { role };
  }

  @Post('initialize')
  @ApiOperation({ summary: '初始化默认角色（仅在首次设置时使用）' })
  async initializeDefaults() {
    await this.roleService.initializeDefaultRoles();
    return { success: true, message: '默认角色初始化完成' };
  }
}
