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
  ForbiddenException,
} from '@nestjs/common';
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
} from '@lnk/nestjs-common';
import { TagService } from './tag.service';

interface CreateTagDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  groupId?: string;
  autoApplyRules?: Array<{
    type: 'url_pattern' | 'utm_source' | 'utm_campaign' | 'domain';
    value: string;
  }>;
}

interface CreateTagGroupDto {
  name: string;
  description?: string;
  color?: string;
  isExclusive?: boolean;
}

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  // ==================== Tag Endpoints ====================

  @Post()
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '创建标签' })
  createTag(
    @Body() dto: CreateTagDto,
    @ScopedTeamId() teamId: string,
  ) {
    return this.tagService.createTag(dto, teamId);
  }

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取标签列表' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'groupId', required: false, description: '按组筛选' })
  @ApiQuery({ name: 'parentId', required: false, description: '按父标签筛选' })
  @ApiQuery({ name: 'includeStats', required: false, description: '是否包含统计' })
  findAllTags(
    @ScopedTeamId() teamId: string,
    @Query('search') search?: string,
    @Query('groupId') groupId?: string,
    @Query('parentId') parentId?: string,
    @Query('includeStats') includeStats?: string,
  ) {
    return this.tagService.findAllTags(teamId, {
      search,
      groupId,
      parentId,
      includeStats: includeStats === 'true',
    });
  }

  @Get('colors')
  @ApiOperation({ summary: '获取可用颜色列表' })
  getColors() {
    return this.tagService.getAvailableColors();
  }

  @Get('stats')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取标签统计' })
  getStats(@ScopedTeamId() teamId: string) {
    return this.tagService.getTagStats(teamId);
  }

  @Get('suggestions')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取标签建议' })
  @ApiQuery({ name: 'url', required: true, description: '目标 URL' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制' })
  getSuggestions(
    @ScopedTeamId() teamId: string,
    @Query('url') url: string,
    @Query('limit') limit?: string,
  ) {
    return this.tagService.getSuggestedTags(
      teamId,
      url,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get('auto-apply')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取自动应用的标签' })
  @ApiQuery({ name: 'url', required: false })
  @ApiQuery({ name: 'utmSource', required: false })
  @ApiQuery({ name: 'utmCampaign', required: false })
  @ApiQuery({ name: 'domain', required: false })
  getAutoApplyTags(
    @ScopedTeamId() teamId: string,
    @Query('url') url?: string,
    @Query('utmSource') utmSource?: string,
    @Query('utmCampaign') utmCampaign?: string,
    @Query('domain') domain?: string,
  ) {
    return this.tagService.getAutoApplyTags(teamId, {
      url,
      utmSource,
      utmCampaign,
      domain,
    });
  }

  @Get('export')
  @RequirePermissions(Permission.ANALYTICS_EXPORT)
  @ApiOperation({ summary: '导出标签' })
  exportTags(@ScopedTeamId() teamId: string) {
    return this.tagService.exportTags(teamId);
  }

  @Get(':id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取单个标签' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tag = await this.tagService.findTagById(id);
    if (!isPlatformAdmin(user) && tag.teamId !== teamId) {
      throw new ForbiddenException('无权访问此标签');
    }
    return tag;
  }

  @Put(':id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新标签' })
  async updateTag(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTagDto>,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tag = await this.tagService.findTagById(id);
    if (!isPlatformAdmin(user) && tag.teamId !== teamId) {
      throw new ForbiddenException('无权修改此标签');
    }
    return this.tagService.updateTag(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除标签' })
  async deleteTag(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tag = await this.tagService.findTagById(id);
    if (!isPlatformAdmin(user) && tag.teamId !== teamId) {
      throw new ForbiddenException('无权删除此标签');
    }
    await this.tagService.deleteTag(id);
    return { success: true };
  }

  @Post('bulk')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '批量创建标签' })
  bulkCreate(
    @Body() body: { names: string[] },
    @ScopedTeamId() teamId: string,
  ) {
    return this.tagService.bulkCreateTags(body.names, teamId);
  }

  @Post('merge')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '合并标签' })
  mergeTags(
    @Body() body: { sourceTagIds: string[]; targetTagId: string },
    @ScopedTeamId() teamId: string,
  ) {
    return this.tagService.mergeTags(
      body.sourceTagIds,
      body.targetTagId,
      teamId,
    );
  }

  @Post('reorder')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '重新排序标签' })
  reorderTags(
    @Body() body: { tagOrders: Array<{ id: string; order: number }> },
    @ScopedTeamId() teamId: string,
  ) {
    return this.tagService.reorderTags(teamId, body.tagOrders);
  }

  // ==================== Tag Group Endpoints ====================

  @Post('groups')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '创建标签组' })
  createGroup(
    @Body() dto: CreateTagGroupDto,
    @ScopedTeamId() teamId: string,
  ) {
    return this.tagService.createTagGroup(dto, teamId);
  }

  @Get('groups')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取标签组列表' })
  findAllGroups(@ScopedTeamId() teamId: string) {
    return this.tagService.findAllTagGroups(teamId);
  }

  @Get('groups/:id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取单个标签组' })
  async findGroup(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const group = await this.tagService.findTagGroupById(id);
    if (!isPlatformAdmin(user) && group.teamId !== teamId) {
      throw new ForbiddenException('无权访问此标签组');
    }
    return group;
  }

  @Get('groups/:id/tags')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取标签组内的标签' })
  async getGroupTags(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const group = await this.tagService.findTagGroupById(id);
    if (!isPlatformAdmin(user) && group.teamId !== teamId) {
      throw new ForbiddenException('无权访问此标签组');
    }
    return this.tagService.getTagsInGroup(id);
  }

  @Put('groups/:id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新标签组' })
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTagGroupDto>,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const group = await this.tagService.findTagGroupById(id);
    if (!isPlatformAdmin(user) && group.teamId !== teamId) {
      throw new ForbiddenException('无权修改此标签组');
    }
    return this.tagService.updateTagGroup(id, dto);
  }

  @Delete('groups/:id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除标签组' })
  async deleteGroup(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const group = await this.tagService.findTagGroupById(id);
    if (!isPlatformAdmin(user) && group.teamId !== teamId) {
      throw new ForbiddenException('无权删除此标签组');
    }
    await this.tagService.deleteTagGroup(id);
    return { success: true };
  }

  @Post('groups/:groupId/tags/:tagId')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '将标签添加到组' })
  async addTagToGroup(
    @Param('groupId') groupId: string,
    @Param('tagId') tagId: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const group = await this.tagService.findTagGroupById(groupId);
    if (!isPlatformAdmin(user) && group.teamId !== teamId) {
      throw new ForbiddenException('无权操作此标签组');
    }
    return this.tagService.addTagToGroup(tagId, groupId);
  }

  @Delete('groups/:groupId/tags/:tagId')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '从组中移除标签' })
  async removeTagFromGroup(
    @Param('groupId') groupId: string,
    @Param('tagId') tagId: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const group = await this.tagService.findTagGroupById(groupId);
    if (!isPlatformAdmin(user) && group.teamId !== teamId) {
      throw new ForbiddenException('无权操作此标签组');
    }
    return this.tagService.removeTagFromGroup(tagId);
  }
}
