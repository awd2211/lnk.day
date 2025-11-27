import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取统计数据' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('activity')
  @ApiOperation({ summary: '获取最近活动' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecentActivity(@Query('limit') limit?: number) {
    return this.dashboardService.getRecentActivity(limit);
  }

  @Get('top-links')
  @ApiOperation({ summary: '获取热门链接' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopLinks(@Query('limit') limit?: number) {
    return this.dashboardService.getTopLinks(limit);
  }

  @Get('health')
  @ApiOperation({ summary: '获取系统健康状态' })
  getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: '获取使用指标' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  getUsageMetrics(@Query('period') period?: 'day' | 'week' | 'month') {
    return this.dashboardService.getUsageMetrics(period);
  }
}
