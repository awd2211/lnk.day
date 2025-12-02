import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader, ApiParam } from '@nestjs/swagger';
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

  // ==================== Admin Endpoints ====================

  @Get('stats')
  @AdminOnly()
  @ApiOperation({ summary: '获取配额统计信息（管理员）' })
  getQuotaStats() {
    return this.quotaService.getQuotaStats();
  }

  @Get('teams')
  @AdminOnly()
  @ApiOperation({ summary: '获取所有团队配额列表（管理员）' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'plan', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  getAllTeamQuotas(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.quotaService.getAllTeamQuotas({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      plan: plan as PlanType,
      sortBy,
      sortOrder,
    });
  }

  @Get('teams/:teamId')
  @AdminOnly()
  @ApiOperation({ summary: '获取指定团队配额详情（管理员）' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  getTeamQuotaById(@Param('teamId') teamId: string) {
    return this.quotaService.getUsage(teamId);
  }

  @Put('teams/:teamId')
  @AdminOnly()
  @ApiOperation({ summary: '更新团队配额（管理员）' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  updateTeamQuotaById(
    @Param('teamId') teamId: string,
    @Body() body: { plan?: PlanType; customLimits?: Partial<PlanLimits> },
  ) {
    return this.quotaService.updateTeamQuotaById(teamId, body);
  }

  @Post('teams/:teamId/reset')
  @AdminOnly()
  @ApiOperation({ summary: '重置团队月度使用量（管理员）' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  resetTeamQuotaById(@Param('teamId') teamId: string) {
    return this.quotaService.resetMonthlyUsage(teamId);
  }
}
