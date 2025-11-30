import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { SearchService, LinkDocument } from './search.service';

class SearchDto {
  query: string;
  filters?: {
    domains?: string[];
    tags?: string[];
    status?: string[];
    minClicks?: number;
    maxClicks?: number;
    startDate?: string;
    endDate?: string;
  };
  sort?: { field: string; order: 'asc' | 'desc' };
  page?: number;
  limit?: number;
}

@ApiTags('search')
@Controller('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '搜索链接' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'domain', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'status', required: false })
  async search(
    @Query('q') query: string,
    @ScopedTeamId() teamId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('domain') domain?: string,
    @Query('tag') tag?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    const filters: any = {};

    if (domain) {
      filters.domains = domain.split(',');
    }
    if (tag) {
      filters.tags = tag.split(',');
    }
    if (status) {
      filters.status = status.split(',');
    }

    const sortOption = sort
      ? { field: sort, order: (order as 'asc' | 'desc') || 'desc' }
      : undefined;

    return this.searchService.search(teamId, query, {
      filters,
      sort: sortOption,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('advanced')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '高级搜索' })
  async advancedSearch(
    @Body() searchDto: SearchDto,
    @ScopedTeamId() teamId: string,
  ) {
    const filters = searchDto.filters
      ? {
          ...searchDto.filters,
          startDate: searchDto.filters.startDate
            ? new Date(searchDto.filters.startDate)
            : undefined,
          endDate: searchDto.filters.endDate
            ? new Date(searchDto.filters.endDate)
            : undefined,
        }
      : undefined;

    return this.searchService.search(teamId, searchDto.query, {
      filters,
      sort: searchDto.sort,
      page: searchDto.page,
      limit: searchDto.limit,
    });
  }
}
