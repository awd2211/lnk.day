import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

import { ApiKeyService } from './apikey.service';
import { ApiKeyScope } from './apikey.entity';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';

class CreateApiKeyDto {
  name: string;
  description?: string;
  scopes?: ApiKeyScope[];
  expiresAt?: string;
  rateLimit?: number;
  allowedIps?: string[];
}

class UpdateApiKeyDto {
  name?: string;
  description?: string;
  scopes?: ApiKeyScope[];
  rateLimit?: number;
  allowedIps?: string[];
}

@ApiTags('api-keys')
@Controller('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @RequirePermissions(Permission.API_KEYS_MANAGE)
  @ApiOperation({ summary: '创建 API 密钥' })
  @ApiResponse({
    status: 201,
    description: '返回新创建的 API 密钥，注意：明文密钥只显示一次',
  })
  async create(
    @Body() createDto: CreateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    const { apiKey, plainKey } = await this.apiKeyService.create(
      createDto.name,
      user.id,
      teamId,
      {
        description: createDto.description,
        scopes: createDto.scopes,
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,
        rateLimit: createDto.rateLimit,
        allowedIps: createDto.allowedIps,
      },
    );

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: plainKey, // Only returned once!
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      message: '请立即保存此密钥，它将不会再次显示',
    };
  }

  @Get()
  @RequirePermissions(Permission.API_KEYS_VIEW)
  @ApiOperation({ summary: '获取 API 密钥列表' })
  findAll(@ScopedTeamId() teamId: string) {
    return this.apiKeyService.findAll(teamId);
  }

  @Get('scopes/list')
  @RequirePermissions(Permission.API_KEYS_VIEW)
  @ApiOperation({ summary: '获取可用的权限范围列表' })
  getScopes() {
    return {
      scopes: [
        { value: ApiKeyScope.READ, description: '读取数据' },
        { value: ApiKeyScope.WRITE, description: '创建和修改数据' },
        { value: ApiKeyScope.DELETE, description: '删除数据' },
        { value: ApiKeyScope.ADMIN, description: '完全访问权限' },
      ],
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.API_KEYS_VIEW)
  @ApiOperation({ summary: '获取单个 API 密钥详情' })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKey = await this.apiKeyService.findOne(id);
    if (!isPlatformAdmin(user) && apiKey.teamId !== teamId) {
      throw new ForbiddenException('无权访问此 API 密钥');
    }
    return apiKey;
  }

  @Put(':id')
  @RequirePermissions(Permission.API_KEYS_MANAGE)
  @ApiOperation({ summary: '更新 API 密钥' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateApiKeyDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKey = await this.apiKeyService.findOne(id);
    if (!isPlatformAdmin(user) && apiKey.teamId !== teamId) {
      throw new ForbiddenException('无权修改此 API 密钥');
    }
    return this.apiKeyService.update(id, updateDto);
  }

  @Post(':id/revoke')
  @RequirePermissions(Permission.API_KEYS_MANAGE)
  @ApiOperation({ summary: '撤销 API 密钥' })
  @ApiParam({ name: 'id', type: String })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKey = await this.apiKeyService.findOne(id);
    if (!isPlatformAdmin(user) && apiKey.teamId !== teamId) {
      throw new ForbiddenException('无权撤销此 API 密钥');
    }
    return this.apiKeyService.revoke(id);
  }

  @Post(':id/regenerate')
  @RequirePermissions(Permission.API_KEYS_MANAGE)
  @ApiOperation({ summary: '重新生成 API 密钥' })
  @ApiResponse({
    status: 200,
    description: '返回新的 API 密钥，旧密钥将失效',
  })
  @ApiParam({ name: 'id', type: String })
  async regenerate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const existingKey = await this.apiKeyService.findOne(id);
    if (!isPlatformAdmin(user) && existingKey.teamId !== teamId) {
      throw new ForbiddenException('无权重新生成此 API 密钥');
    }
    const { apiKey, plainKey } = await this.apiKeyService.regenerate(id);

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: plainKey,
      keyPrefix: apiKey.keyPrefix,
      message: '请立即保存新密钥，它将不会再次显示',
    };
  }

  @Delete(':id')
  @RequirePermissions(Permission.API_KEYS_MANAGE)
  @ApiOperation({ summary: '删除 API 密钥' })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKey = await this.apiKeyService.findOne(id);
    if (!isPlatformAdmin(user) && apiKey.teamId !== teamId) {
      throw new ForbiddenException('无权删除此 API 密钥');
    }
    return this.apiKeyService.delete(id);
  }
}
