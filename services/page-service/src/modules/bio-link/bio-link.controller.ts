import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';

import { BioLinkService } from './bio-link.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  Public,
} from '@lnk/nestjs-common';
import {
  CreateBioLinkDto,
  UpdateBioLinkDto,
  CreateBioLinkItemDto,
  UpdateBioLinkItemDto,
  BioLinkResponseDto,
  BioLinkAnalyticsDto,
} from './dto/bio-link.dto';
import { BioLink, BioLinkItem, BioLinkStatus } from './entities/bio-link.entity';

@ApiTags('bio-links')
@Controller('bio-links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class BioLinkController {
  constructor(private readonly bioLinkService: BioLinkService) {}

  // ==================== Bio Link Management ====================

  @Post()
  @RequirePermissions(Permission.PAGES_CREATE)
  @ApiOperation({ summary: '创建 Bio Link 页面' })
  @ApiResponse({ status: 201, type: BioLinkResponseDto })
  async create(
    @Body() dto: CreateBioLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<BioLink> {
    return this.bioLinkService.create(dto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '获取 Bio Link 列表' })
  @ApiQuery({ name: 'status', enum: BioLinkStatus, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('status') status?: BioLinkStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bioLinkService.findAll(teamId, { status, page, limit });
  }

  @Get('check-username/:username')
  @Public()
  @ApiOperation({ summary: '检查用户名是否可用' })
  async checkUsername(@Param('username') username: string) {
    const available = await this.bioLinkService.checkUsernameAvailability(username);
    return { username, available };
  }

  @Get(':id')
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '获取 Bio Link 详情' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BioLink> {
    return this.bioLinkService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '更新 Bio Link' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBioLinkDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<BioLink> {
    return this.bioLinkService.update(id, dto, user.id, teamId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PAGES_DELETE)
  @ApiOperation({ summary: '删除 Bio Link' })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ): Promise<{ message: string }> {
    await this.bioLinkService.remove(id, teamId);
    return { message: 'Bio link deleted successfully' };
  }

  @Post(':id/publish')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '发布 Bio Link' })
  @ApiParam({ name: 'id', type: String })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ): Promise<BioLink> {
    return this.bioLinkService.publish(id, teamId);
  }

  @Post(':id/unpublish')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '取消发布 Bio Link' })
  @ApiParam({ name: 'id', type: String })
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ): Promise<BioLink> {
    return this.bioLinkService.unpublish(id, teamId);
  }

  // ==================== Bio Link Items ====================

  @Get(':id/items')
  @RequirePermissions(Permission.PAGES_VIEW)
  @ApiOperation({ summary: '获取 Bio Link 的链接列表' })
  @ApiParam({ name: 'id', type: String })
  async getItems(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BioLinkItem[]> {
    return this.bioLinkService.getItems(id);
  }

  @Post(':id/items')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '添加链接到 Bio Link' })
  @ApiParam({ name: 'id', type: String })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBioLinkItemDto,
  ): Promise<BioLinkItem> {
    return this.bioLinkService.addItem(id, dto);
  }

  @Put(':id/items/:itemId')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '更新链接' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'itemId', type: String })
  async updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateBioLinkItemDto,
  ): Promise<BioLinkItem> {
    return this.bioLinkService.updateItem(itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions(Permission.PAGES_DELETE)
  @ApiOperation({ summary: '删除链接' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'itemId', type: String })
  async removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<{ message: string }> {
    await this.bioLinkService.removeItem(itemId);
    return { message: 'Link item deleted successfully' };
  }

  @Post(':id/items/reorder')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '重新排序链接' })
  @ApiParam({ name: 'id', type: String })
  async reorderItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { itemIds: string[] },
  ): Promise<BioLinkItem[]> {
    return this.bioLinkService.reorderItems(id, body.itemIds);
  }

  @Post(':id/items/:itemId/toggle-visibility')
  @RequirePermissions(Permission.PAGES_EDIT)
  @ApiOperation({ summary: '切换链接显示/隐藏状态' })
  async toggleItemVisibility(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<BioLinkItem> {
    return this.bioLinkService.toggleItemVisibility(itemId);
  }

  @Post(':id/items/:itemId/duplicate')
  @RequirePermissions(Permission.PAGES_CREATE)
  @ApiOperation({ summary: '复制链接' })
  async duplicateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<BioLinkItem> {
    return this.bioLinkService.duplicateItem(itemId);
  }

  // ==================== Analytics ====================

  @Get(':id/analytics')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取 Bio Link 分析数据' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'days', required: false, description: '统计天数，默认30天' })
  async getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: number,
  ): Promise<BioLinkAnalyticsDto> {
    return this.bioLinkService.getAnalytics(id, days || 30);
  }
}

// Public controller for viewing bio pages
@ApiTags('bio-links-public')
@Controller()
export class BioLinkPublicController {
  constructor(private readonly bioLinkService: BioLinkService) {}

  @Get('u/:username')
  @ApiOperation({ summary: '获取公开的 Bio Link 页面数据' })
  @ApiParam({ name: 'username', type: String })
  async getPublicPage(
    @Param('username') username: string,
    @Req() req: Request,
  ) {
    const result = await this.bioLinkService.getPublicPage(username);

    // Track view (async)
    this.bioLinkService.trackView(result.bioLink.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] as string,
    }).catch(() => {});

    // Filter sensitive data
    const { settings, ...bioLink } = result.bioLink;
    const safeSettings = {
      sensitiveContent: settings.sensitiveContent,
      sensitiveWarningMessage: settings.sensitiveWarningMessage,
    };

    return {
      bioLink: { ...bioLink, settings: safeSettings },
      items: result.items,
    };
  }

  @Post('u/:username/click/:itemId')
  @ApiOperation({ summary: '记录链接点击' })
  async trackClick(
    @Param('username') username: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    const bioLink = await this.bioLinkService.findByUsername(username);
    await this.bioLinkService.trackClick(bioLink.id, itemId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] as string,
    });
    return { success: true };
  }

  @Post('u/:username/social/:platform')
  @ApiOperation({ summary: '记录社交媒体点击' })
  async trackSocialClick(
    @Param('username') username: string,
    @Param('platform') platform: string,
    @Req() req: Request,
  ) {
    const bioLink = await this.bioLinkService.findByUsername(username);
    await this.bioLinkService.trackSocialClick(bioLink.id, platform, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
