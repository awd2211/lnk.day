import { Controller, Get, Post, Put, Delete, Body, Param, Headers, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  Public,
} from '@lnk/nestjs-common';
import { DeepLinkService } from './deeplink.service';

@ApiTags('deeplinks')
@Controller('deeplinks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class DeepLinkController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @Get()
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  @ApiOperation({ summary: '获取深度链接列表' })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: '管理员模式，返回所有团队的深度链接' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, description: '按状态筛选 (enabled, disabled)' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段 (createdAt, updatedAt, name, enabled, clicks, installs)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向 (ASC, DESC)' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  findAll(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('all') all?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ) {
    // 平台管理员可以查看所有深度链接
    const shouldQueryAll = all === 'true' && isPlatformAdmin(user);
    return this.deepLinkService.findAll(shouldQueryAll ? undefined : teamId, {
      page,
      limit,
      status,
      sortBy,
      sortOrder,
      search,
    });
  }

  @Post()
  @RequirePermissions(Permission.DEEPLINKS_CREATE)
  @ApiOperation({ summary: '创建深度链接配置' })
  create(
    @Body() data: any,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.deepLinkService.create({ ...data, userId: user.id, teamId });
  }

  @Get('link/:linkId')
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  @ApiOperation({ summary: '通过linkId获取深度链接配置' })
  async findByLinkId(
    @Param('linkId') linkId: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const deepLink = await this.deepLinkService.findByLinkId(linkId);
    if (deepLink && !isPlatformAdmin(user) && deepLink.teamId !== teamId) {
      throw new ForbiddenException('无权访问此深度链接配置');
    }
    return deepLink;
  }

  @Get('resolve/:linkId')
  @Public()
  @ApiOperation({ summary: '解析深度链接跳转URL' })
  async resolveUrl(
    @Param('linkId') linkId: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const deepLink = await this.deepLinkService.findByLinkId(linkId);
    if (!deepLink) {
      return { url: null };
    }
    const result = this.deepLinkService.resolveRedirect(deepLink, userAgent);
    const url = result.url;
    return { url };
  }

  @Put(':id')
  @RequirePermissions(Permission.DEEPLINKS_EDIT)
  @ApiOperation({ summary: '更新深度链接配置' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const deepLink = await this.deepLinkService.findOne(id);
    if (!isPlatformAdmin(user) && deepLink.teamId !== teamId) {
      throw new ForbiddenException('无权修改此深度链接配置');
    }
    return this.deepLinkService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DEEPLINKS_DELETE)
  @ApiOperation({ summary: '删除深度链接配置' })
  async remove(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const deepLink = await this.deepLinkService.findOne(id);
    if (!isPlatformAdmin(user) && deepLink.teamId !== teamId) {
      throw new ForbiddenException('无权删除此深度链接配置');
    }
    return this.deepLinkService.remove(id);
  }
}
