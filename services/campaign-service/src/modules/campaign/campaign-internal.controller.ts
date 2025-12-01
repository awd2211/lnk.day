import { Controller, Get, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';

/**
 * Internal API endpoints for admin console
 * These endpoints are called by console-service proxy
 */
@ApiTags('internal')
@Controller('internal')
export class CampaignInternalController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取平台营销活动统计 (内部API)' })
  async getGlobalStats() {
    return this.campaignService.getGlobalStats();
  }
}
