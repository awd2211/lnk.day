import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import {
  DynamicQrService,
  CreateDynamicQrDto,
  UpdateDynamicQrDto,
  DynamicQrListOptions,
} from './dynamic-qr.service';

@ApiTags('dynamic-qr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('dynamic-qr')
export class DynamicQrController {
  private readonly defaultBaseUrl: string;

  constructor(
    private readonly dynamicQrService: DynamicQrService,
    private readonly configService: ConfigService,
  ) {
    const brandDomain = this.configService.get('BRAND_DOMAIN', 'lnk.day');
    this.defaultBaseUrl = this.configService.get('BASE_URL', `https://${brandDomain}`);
  }

  @Post()
  @RequirePermissions(Permission.QR_CREATE)
  @ApiOperation({ summary: '创建动态二维码' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'destinationUrl'],
      properties: {
        name: { type: 'string', description: '二维码名称' },
        description: { type: 'string', description: '描述' },
        destinationUrl: { type: 'string', description: '目标 URL' },
        customCode: { type: 'string', description: '自定义短码' },
        qrOptions: {
          type: 'object',
          properties: {
            size: { type: 'number' },
            foregroundColor: { type: 'string' },
            backgroundColor: { type: 'string' },
            logoUrl: { type: 'string' },
            logoSize: { type: 'number' },
          },
        },
        tags: { type: 'array', items: { type: 'string' } },
        folderId: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        schedule: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  days: { type: 'array', items: { type: 'number' } },
                  startTime: { type: 'string' },
                  endTime: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
            defaultUrl: { type: 'string' },
          },
        },
      },
    },
  })
  async create(
    @Body() dto: CreateDynamicQrDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dynamicQrService.create(teamId, user.sub, dto);
  }

  @Get()
  @RequirePermissions(Permission.QR_VIEW)
  @ApiOperation({ summary: '获取动态二维码列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'tags', required: false, type: String, description: '逗号分隔的标签' })
  @ApiQuery({ name: 'folderId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'totalScans', 'name'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('tags') tags?: string,
    @Query('folderId') folderId?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt' | 'totalScans' | 'name',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const options: DynamicQrListOptions = {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      folderId,
      sortBy,
      sortOrder,
    };
    return this.dynamicQrService.findAll(teamId, options);
  }

  @Get('stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取动态二维码统计' })
  async getStats(@ScopedTeamId() teamId: string) {
    return this.dynamicQrService.getStats(teamId);
  }

  @Get(':id')
  @RequirePermissions(Permission.QR_VIEW)
  @ApiOperation({ summary: '获取单个动态二维码详情' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.dynamicQrService.findOne(id, teamId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.QR_EDIT)
  @ApiOperation({ summary: '更新动态二维码' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDynamicQrDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dynamicQrService.update(id, teamId, user.sub, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.QR_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除动态二维码' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.dynamicQrService.delete(id, teamId);
  }

  @Post(':id/activate')
  @RequirePermissions(Permission.QR_EDIT)
  @ApiOperation({ summary: '激活动态二维码' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.dynamicQrService.activate(id, teamId);
  }

  @Post(':id/deactivate')
  @RequirePermissions(Permission.QR_EDIT)
  @ApiOperation({ summary: '停用动态二维码' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.dynamicQrService.deactivate(id, teamId);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.QR_VIEW)
  @ApiOperation({ summary: '获取 URL 变更历史' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async getUrlHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    return this.dynamicQrService.getUrlHistory(id, teamId);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.QR_CREATE)
  @ApiOperation({ summary: '复制动态二维码' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newName: { type: 'string', description: '新名称（可选）' },
      },
    },
  })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { newName?: string },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dynamicQrService.duplicateQr(id, teamId, user.sub, body.newName);
  }

  @Get(':id/image')
  @RequirePermissions(Permission.QR_VIEW)
  @ApiOperation({ summary: '生成动态二维码图片' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  @ApiQuery({ name: 'baseUrl', required: false, description: '重定向服务基础 URL' })
  async generateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Res() res: Response,
    @Query('baseUrl') baseUrl?: string,
  ) {
    const buffer = await this.dynamicQrService.generateQrImage(id, teamId, baseUrl || this.defaultBaseUrl);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename=dynamic-qr.png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(buffer);
  }

  @Post(':id/record-scan')
  @ApiOperation({ summary: '记录扫描（内部使用）' })
  @ApiParam({ name: 'id', description: '动态二维码 ID' })
  async recordScan(@Param('id', ParseUUIDPipe) id: string) {
    await this.dynamicQrService.recordScan(id);
    return { success: true };
  }

  // 批量操作

  @Post('bulk/update-destination')
  @RequirePermissions(Permission.QR_EDIT)
  @ApiOperation({ summary: '批量更新目标 URL' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids', 'newUrl'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: '动态二维码 ID 列表' },
        newUrl: { type: 'string', description: '新目标 URL' },
        reason: { type: 'string', description: '变更原因' },
      },
    },
  })
  async bulkUpdateDestination(
    @Body() body: { ids: string[]; newUrl: string; reason?: string },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const updated = await this.dynamicQrService.bulkUpdateDestination(
      teamId,
      user.sub,
      body.ids,
      body.newUrl,
      body.reason,
    );
    return { updated, total: body.ids.length };
  }

  @Post('bulk/deactivate')
  @RequirePermissions(Permission.QR_EDIT)
  @ApiOperation({ summary: '批量停用' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: '动态二维码 ID 列表' },
      },
    },
  })
  async bulkDeactivate(
    @Body() body: { ids: string[] },
    @ScopedTeamId() teamId: string,
  ) {
    const affected = await this.dynamicQrService.bulkDeactivate(teamId, body.ids);
    return { affected, total: body.ids.length };
  }

  // 公开端点（用于重定向服务）

  @Get('resolve/:shortCode')
  @ApiOperation({ summary: '解析短码获取目标 URL（公开）' })
  @ApiParam({ name: 'shortCode', description: '短码' })
  @ApiResponse({ status: 200, description: '返回目标 URL' })
  @ApiResponse({ status: 404, description: '短码不存在或已过期' })
  async resolveShortCode(@Param('shortCode') shortCode: string) {
    const url = await this.dynamicQrService.getDestinationUrl(shortCode);
    if (!url) {
      return { error: 'QR code not found or expired', statusCode: 404 };
    }
    return { url };
  }
}
