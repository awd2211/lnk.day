import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';

/**
 * Internal API endpoints for admin console
 * These endpoints are called by console-service proxy
 */
@ApiTags('internal')
@Controller('internal')
export class TrackingInternalController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取平台二维码统计 (内部API)' })
  async getGlobalStats() {
    return this.trackingService.getGlobalStats();
  }
}
