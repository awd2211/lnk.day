import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { TrackingService } from './tracking.service';
import { QrType, QrContentType } from './qr-record.entity';

@ApiTags('qr-tracking')
@Controller('qr-records')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建二维码记录' })
  create(
    @Body()
    body: {
      content: string;
      contentType?: QrContentType;
      type?: QrType;
      name?: string;
      linkId?: string;
      targetUrl?: string;
      style?: any;
      campaignId?: string;
      tags?: string[];
    },
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ) {
    return this.trackingService.createQrRecord({
      ...body,
      userId,
      teamId,
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取二维码列表' })
  findAll(@Headers('x-team-id') teamId: string) {
    return this.trackingService.findAllByTeam(teamId);
  }

  @Get('top')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取扫码量最高的二维码' })
  @ApiQuery({ name: 'limit', required: false })
  getTop(@Headers('x-team-id') teamId: string, @Query('limit') limit?: string) {
    return this.trackingService.getTopQrCodes(teamId, limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取二维码详情' })
  findOne(@Param('id') id: string) {
    return this.trackingService.findById(id);
  }

  @Get('code/:shortCode')
  @ApiOperation({ summary: '通过短码获取二维码' })
  findByShortCode(@Param('shortCode') shortCode: string) {
    return this.trackingService.findByShortCode(shortCode);
  }

  @Put(':id/target')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新动态二维码目标URL' })
  updateTarget(@Param('id') id: string, @Body() body: { targetUrl: string }) {
    return this.trackingService.updateTargetUrl(id, body.targetUrl);
  }

  @Put(':id/style')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新二维码样式' })
  updateStyle(@Param('id') id: string, @Body() style: any) {
    return this.trackingService.updateStyle(id, style);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除二维码' })
  delete(@Param('id') id: string) {
    return this.trackingService.delete(id);
  }

  // Scan tracking
  @Post(':id/scan')
  @ApiOperation({ summary: '记录扫码事件' })
  recordScan(
    @Param('id') id: string,
    @Body()
    body: {
      visitorId?: string;
      country?: string;
      region?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      referer?: string;
      language?: string;
    },
    @Req() req: Request,
  ) {
    return this.trackingService.recordScan(id, {
      ...body,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id/scans')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取扫码记录' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getScans(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trackingService.getScans(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取扫码统计' })
  @ApiQuery({ name: 'days', required: false, description: '统计天数，默认30' })
  getStats(@Param('id') id: string, @Query('days') days?: string) {
    return this.trackingService.getScanStats(id, days ? parseInt(days) : 30);
  }
}
