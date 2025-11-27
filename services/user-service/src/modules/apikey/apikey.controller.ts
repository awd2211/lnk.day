import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { ApiKeyService } from './apikey.service';
import { ApiKeyScope } from './apikey.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: '创建 API 密钥' })
  @ApiResponse({
    status: 201,
    description: '返回新创建的 API 密钥，注意：明文密钥只显示一次',
  })
  async create(
    @Body() createDto: CreateApiKeyDto,
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
  ) {
    const { apiKey, plainKey } = await this.apiKeyService.create(
      createDto.name,
      user.id,
      teamId || user.id,
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
  @ApiOperation({ summary: '获取 API 密钥列表' })
  findAll(
    @Headers('x-team-id') teamId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.apiKeyService.findAll(teamId || user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 API 密钥详情' })
  findOne(@Param('id') id: string) {
    return this.apiKeyService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 API 密钥' })
  update(@Param('id') id: string, @Body() updateDto: UpdateApiKeyDto) {
    return this.apiKeyService.update(id, updateDto);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: '撤销 API 密钥' })
  revoke(@Param('id') id: string) {
    return this.apiKeyService.revoke(id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: '重新生成 API 密钥' })
  @ApiResponse({
    status: 200,
    description: '返回新的 API 密钥，旧密钥将失效',
  })
  async regenerate(@Param('id') id: string) {
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
  @ApiOperation({ summary: '删除 API 密钥' })
  delete(@Param('id') id: string) {
    return this.apiKeyService.delete(id);
  }

  @Get('scopes/list')
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
}
