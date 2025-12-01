import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeepLinkService } from './deeplink.service';

/**
 * Internal API endpoints for admin console
 * These endpoints are called by console-service proxy
 */
@ApiTags('internal')
@Controller('internal')
export class DeepLinkInternalController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取平台深度链接统计 (内部API)' })
  async getGlobalStats() {
    return this.deepLinkService.getGlobalStats();
  }
}
