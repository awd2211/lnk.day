import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { QuotaService } from './quota.service';
import { PlanType, PlanLimits } from './quota.entity';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
  AdminOnly,
} from '@lnk/nestjs-common';

@ApiTags('quota')
@Controller('quota')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取团队配额和使用情况' })
  getUsage(@ScopedTeamId() teamId: string) {
    return this.quotaService.getUsage(teamId);
  }

  @Get('limits')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取团队配额限制' })
  getLimits(@ScopedTeamId() teamId: string) {
    return this.quotaService.getLimits(teamId);
  }

  @Get('check')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '检查是否有足够配额' })
  @ApiQuery({ name: 'type', enum: ['links', 'clicks', 'qrCodes', 'apiRequests'] })
  @ApiQuery({ name: 'amount', required: false })
  async checkQuota(
    @ScopedTeamId() teamId: string,
    @Query('type') type: 'links' | 'clicks' | 'qrCodes' | 'apiRequests',
    @Query('amount') amount?: string,
  ) {
    const canUse = await this.quotaService.checkQuota(teamId, type, amount ? parseInt(amount) : 1);
    return { allowed: canUse };
  }

  @Get('feature')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '检查功能是否可用' })
  @ApiQuery({ name: 'feature' })
  async checkFeature(
    @ScopedTeamId() teamId: string,
    @Query('feature') feature: keyof PlanLimits['features'],
  ) {
    const enabled = await this.quotaService.checkFeature(teamId, feature);
    return { enabled };
  }

  @Post('increment')
  @ApiOperation({ summary: '增加配额使用量（内部调用）' })
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  incrementUsage(
    @Query('teamId') teamId: string,
    @Body()
    body: {
      type: 'links' | 'clicks' | 'qrCodes' | 'apiRequests';
      amount?: number;
      resourceId?: string;
    },
  ) {
    return this.quotaService.incrementUsage(teamId, body.type, body.amount, body.resourceId);
  }

  @Post('decrement')
  @ApiOperation({ summary: '减少配额使用量（内部调用）' })
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  decrementUsage(
    @Query('teamId') teamId: string,
    @Body()
    body: {
      type: 'links' | 'qrCodes';
      amount?: number;
      resourceId?: string;
    },
  ) {
    return this.quotaService.decrementUsage(teamId, body.type, body.amount, body.resourceId);
  }

  @Put('plan')
  @AdminOnly()
  @ApiOperation({ summary: '更新订阅计划（管理员）' })
  updatePlan(
    @Query('teamId') teamId: string,
    @Body() body: { plan: PlanType },
  ) {
    return this.quotaService.updatePlan(teamId, body.plan);
  }

  @Put('custom-limits')
  @AdminOnly()
  @ApiOperation({ summary: '设置自定义配额限制（管理员）' })
  setCustomLimits(
    @Query('teamId') teamId: string,
    @Body() customLimits: Partial<PlanLimits>,
  ) {
    return this.quotaService.setCustomLimits(teamId, customLimits);
  }

  @Post('reset')
  @AdminOnly()
  @ApiOperation({ summary: '重置月度使用量（管理员）' })
  resetMonthlyUsage(@Query('teamId') teamId: string) {
    return this.quotaService.resetMonthlyUsage(teamId);
  }

  @Get('logs')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取配额使用日志' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUsageLogs(
    @ScopedTeamId() teamId: string,
    @Query('type') resourceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quotaService.getUsageLogs(teamId, {
      resourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('plans')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: '获取所有可用计划' })
  getPlans() {
    return this.quotaService.getPlans();
  }
}
