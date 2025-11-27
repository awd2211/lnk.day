import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SearchService, LinkDocument } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '搜索链接' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'domain', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'status', required: false })
  async search(
    @Query('q') query: string,
    @Headers('x-team-id') teamId: string,
    @CurrentUser() user: { id: string },
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

    return this.searchService.search(teamId || user.id, query, {
      filters,
      sort: sortOption,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('advanced')
  @ApiOperation({ summary: '高级搜索' })
  async advancedSearch(
    @Body() searchDto: SearchDto,
    @Headers('x-team-id') teamId: string,
    @CurrentUser() user: { id: string },
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

    return this.searchService.search(teamId || user.id, searchDto.query, {
      filters,
      sort: searchDto.sort,
      page: searchDto.page,
      limit: searchDto.limit,
    });
  }
}
