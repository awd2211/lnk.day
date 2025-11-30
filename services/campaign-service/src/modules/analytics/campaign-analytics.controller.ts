import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { Response } from 'express';
import { CampaignAnalyticsService } from './campaign-analytics.service';

@ApiTags('campaign-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignAnalyticsController {
  constructor(private readonly analyticsService: CampaignAnalyticsService) {}

  @Get(':id/analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取营销活动详细分析' })
  @ApiQuery({ name: 'range', required: false, enum: ['7d', '30d', '90d', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAnalytics(
    @Param('id') campaignId: string,
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAnalytics(campaignId, {
      range,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id/analytics/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '导出营销活动分析数据' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiQuery({ name: 'range', required: false })
  async exportAnalytics(
    @Param('id') campaignId: string,
    @Res() res: Response,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('range') range?: string,
  ) {
    const data = await this.analyticsService.exportAnalytics(campaignId, format, { range });

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `campaign-${campaignId}-analytics.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  @Post('compare')
  @ApiBearerAuth()
  @ApiOperation({ summary: '比较多个营销活动' })
  compareAnalytics(@Body() body: { campaignIds: string[] }) {
    return this.analyticsService.getComparison(body.campaignIds);
  }

  @Post(':id/clicks')
  @ApiOperation({ summary: '记录点击（内部 API）' })
  recordClick(
    @Param('id') campaignId: string,
    @Body()
    body: {
      linkId: string;
      channel?: string;
      country?: string;
      device?: string;
      os?: string;
      referrer?: string;
    },
  ) {
    return this.analyticsService.recordClick(campaignId, body);
  }

  @Post(':id/conversions')
  @ApiOperation({ summary: '记录转化（内部 API）' })
  recordConversion(
    @Param('id') campaignId: string,
    @Body()
    body: {
      linkId?: string;
      value?: number;
      orderId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.analyticsService.recordConversion(campaignId, body);
  }
}

@ApiTags('team-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('analytics')
export class TeamAnalyticsController {
  constructor(private readonly analyticsService: CampaignAnalyticsService) {}

  @Get('overview')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: '获取团队营销活动总览' })
  @ApiQuery({ name: 'range', required: false })
  getTeamOverview(
    @ScopedTeamId() teamId: string,
    @Query('range') range?: string,
  ) {
    return this.analyticsService.getTeamOverview(teamId, { range });
  }
}
