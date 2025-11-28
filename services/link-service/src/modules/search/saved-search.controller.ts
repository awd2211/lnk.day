import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  SavedSearchResponseDto,
} from './dto/saved-search.dto';
import { SavedSearch, SavedSearchVisibility } from './entities/saved-search.entity';

@ApiTags('saved-searches')
@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Post()
  @ApiOperation({ summary: '创建保存的搜索' })
  @ApiResponse({ status: 201, type: SavedSearchResponseDto })
  async create(
    @Body() dto: CreateSavedSearchDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.create(dto, userId, teamId || userId);
  }

  @Get()
  @ApiOperation({ summary: '获取保存的搜索列表' })
  @ApiQuery({ name: 'includeTeam', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [SavedSearchResponseDto] })
  async findAll(
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
    @Query('includeTeam') includeTeam?: string,
  ): Promise<SavedSearch[]> {
    return this.savedSearchService.findAll(userId, teamId || userId, {
      includeTeam: includeTeam !== 'false',
    });
  }

  @Get('popular')
  @ApiOperation({ summary: '获取团队热门搜索' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [SavedSearchResponseDto] })
  async getPopular(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: number,
  ): Promise<SavedSearch[]> {
    return this.savedSearchService.getPopular(teamId || userId, limit || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取保存的搜索详情' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.findOne(id, userId, teamId || userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.update(id, dto, userId, teamId || userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<{ message: string }> {
    await this.savedSearchService.remove(id, userId, teamId || userId);
    return { message: 'Saved search deleted successfully' };
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.savedSearchService.execute(id, userId, teamId || userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: '复制保存的搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiResponse({ status: 201, type: SavedSearchResponseDto })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
    @Query('name') newName?: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.duplicate(id, userId, teamId || userId, newName);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: '切换置顶状态' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async togglePin(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<SavedSearch> {
    return this.savedSearchService.togglePin(id, userId, teamId || userId);
  }

  @Post(':id/share')
  @ApiOperation({ summary: '分享/取消分享搜索' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'visibility', enum: SavedSearchVisibility })
  @ApiResponse({ status: 200, type: SavedSearchResponseDto })
  async share(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
    @Query('visibility') visibility: SavedSearchVisibility,
  ): Promise<SavedSearch> {
    return this.savedSearchService.share(id, userId, teamId || userId, visibility);
  }
}
