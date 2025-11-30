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

import { SavedSearchService } from './saved-search.service';
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
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  SavedSearchResponseDto,
} from './dto/saved-search.dto';
import { SavedSearch, SavedSearchVisibility } from './entities/saved-search.entity';

@ApiTags('saved-searches')
@Controller('saved-searches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Post()
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '创建保存的搜索' })
  @ApiResponse({ status: 201, type: SavedSearchResponseDto })
  async create(
    @Body() dto: CreateSavedSearchDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.create(dto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取保存的搜索列表' })
  @ApiQuery({ name: 'includeTeam', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [SavedSearchResponseDto] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Query('includeTeam') includeTeam?: string,
  ): Promise<SavedSearch[]> {
    return this.savedSearchService.findAll(user.id, teamId, {
      includeTeam: includeTeam !== 'false',
    });
  }

  @Get('popular')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取团队热门搜索' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [SavedSearchResponseDto] })
  async getPopular(
    @ScopedTeamId() teamId: string,
    @Query('limit') limit?: number,
  ): Promise<SavedSearch[]> {
    return this.savedSearchService.getPopular(teamId, limit || 10);
  }

  @Get(':id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取保存的搜索详情' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.findOne(id, user.id, teamId);
  }

  @Put(':id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.update(id, dto, user.id, teamId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<{ message: string }> {
    await this.savedSearchService.remove(id, user.id, teamId);
    return { message: 'Saved search deleted successfully' };
  }

  @Post(':id/execute')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '执行保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.savedSearchService.execute(id, user.id, teamId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '复制保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiResponse({ status: 201, type: SavedSearchResponseDto })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Query('name') newName?: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.duplicate(id, user.id, teamId, newName);
  }

  @Post(':id/pin')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '切换置顶状态' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async togglePin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.togglePin(id, user.id, teamId);
  }

  @Post(':id/share')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '分享/取消分享搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'visibility', enum: SavedSearchVisibility })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async share(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Query('visibility') visibility: SavedSearchVisibility,
  ): Promise<SavedSearch> {
    return this.savedSearchService.share(id, user.id, teamId, visibility);
  }

  @Post(':id/test-notification')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '测试通知配置' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async testNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<{ success: boolean; errors: string[] }> {
    return this.savedSearchService.testNotification(id, user.id, teamId);
  }
}
