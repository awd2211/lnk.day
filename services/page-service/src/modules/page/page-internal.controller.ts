import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PageService } from './page.service';

/**
 * Internal API endpoints for admin console
 * These endpoints are called by console-service proxy
 */
@ApiTags('internal')
@Controller('internal')
export class PageInternalController {
  constructor(private readonly pageService: PageService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取平台页面统计 (内部API)' })
  async getGlobalStats() {
    return this.pageService.getGlobalStats();
  }
}
