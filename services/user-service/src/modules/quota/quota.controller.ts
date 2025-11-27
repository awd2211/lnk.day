import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotaService } from './quota.service';
import { PlanType, PlanLimits } from './quota.entity';

@ApiTags('quota')
@Controller('quota')
@ApiBearerAuth()
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get()
  @ApiOperation({ summary: '获取团队配额和使用情况' })
  getUsage(@Headers('x-team-id') teamId: string) {
    return this.quotaService.getUsage(teamId);
  }

  @Get('limits')
  @ApiOperation({ summary: '获取团队配额限制' })
  getLimits(@Headers('x-team-id') teamId: string) {
    return this.quotaService.getLimits(teamId);
  }

  @Get('check')
  @ApiOperation({ summary: '检查是否有足够配额' })
  @ApiQuery({ name: 'type', enum: ['links', 'clicks', 'qrCodes', 'apiRequests'] })
  @ApiQuery({ name: 'amount', required: false })
  async checkQuota(
    @Headers('x-team-id') teamId: string,
    @Query('type') type: 'links' | 'clicks' | 'qrCodes' | 'apiRequests',
    @Query('amount') amount?: string,
  ) {
    const canUse = await this.quotaService.checkQuota(teamId, type, amount ? parseInt(amount) : 1);
    return { allowed: canUse };
  }

  @Get('feature')
  @ApiOperation({ summary: '检查功能是否可用' })
  @ApiQuery({ name: 'feature' })
  async checkFeature(
    @Headers('x-team-id') teamId: string,
    @Query('feature') feature: keyof PlanLimits['features'],
  ) {
    const enabled = await this.quotaService.checkFeature(teamId, feature);
    return { enabled };
  }

  @Post('increment')
  @ApiOperation({ summary: '增加配额使用量' })
  incrementUsage(
    @Headers('x-team-id') teamId: string,
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
  @ApiOperation({ summary: '减少配额使用量' })
  decrementUsage(
    @Headers('x-team-id') teamId: string,
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
  @ApiOperation({ summary: '更新订阅计划' })
  updatePlan(
    @Headers('x-team-id') teamId: string,
    @Body() body: { plan: PlanType },
  ) {
    return this.quotaService.updatePlan(teamId, body.plan);
  }

  @Put('custom-limits')
  @ApiOperation({ summary: '设置自定义配额限制 (管理员)' })
  setCustomLimits(
    @Headers('x-team-id') teamId: string,
    @Body() customLimits: Partial<PlanLimits>,
  ) {
    return this.quotaService.setCustomLimits(teamId, customLimits);
  }

  @Post('reset')
  @ApiOperation({ summary: '重置月度使用量' })
  resetMonthlyUsage(@Headers('x-team-id') teamId: string) {
    return this.quotaService.resetMonthlyUsage(teamId);
  }

  @Get('logs')
  @ApiOperation({ summary: '获取配额使用日志' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUsageLogs(
    @Headers('x-team-id') teamId: string,
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
  @ApiOperation({ summary: '获取所有可用计划' })
  getPlans() {
    return this.quotaService.getPlans();
  }
}
