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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lnk/nestjs-common';
import { GoalsService, CreateGoalDto } from './goals.service';
import { GoalType, GoalStatus, NotificationChannels } from './entities/campaign-goal.entity';

@ApiTags('campaign-goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns/:campaignId/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建营销活动目标' })
  create(
    @Param('campaignId') campaignId: string,
    @Headers('x-team-id') teamId: string,
    @Body()
    body: {
      name: string;
      type: GoalType;
      target: number;
      currency?: string;
      thresholds?: number[];
      notifications: NotificationChannels;
      deadline?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.goalsService.create({
      campaignId,
      teamId,
      name: body.name,
      type: body.type,
      target: body.target,
      currency: body.currency,
      thresholds: body.thresholds,
      notifications: body.notifications,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      metadata: body.metadata,
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取营销活动所有目标' })
  findAll(@Param('campaignId') campaignId: string) {
    return this.goalsService.findByCampaign(campaignId);
  }

  @Get('summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取营销活动目标汇总' })
  getSummary(@Param('campaignId') campaignId: string) {
    return this.goalsService.getCampaignGoalsSummary(campaignId);
  }

  @Get(':goalId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个目标详情' })
  findOne(@Param('goalId') goalId: string) {
    return this.goalsService.findOne(goalId);
  }

  @Get(':goalId/progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取目标进度详情（包含预测）' })
  getProgress(@Param('goalId') goalId: string) {
    return this.goalsService.getGoalProgress(goalId);
  }

  @Get(':goalId/notifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取目标通知历史' })
  getNotifications(@Param('goalId') goalId: string) {
    return this.goalsService.getNotificationHistory(goalId);
  }

  @Put(':goalId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新目标设置' })
  update(
    @Param('goalId') goalId: string,
    @Body()
    body: {
      name?: string;
      target?: number;
      thresholds?: number[];
      notifications?: NotificationChannels;
      deadline?: string;
      enabled?: boolean;
    },
  ) {
    const updateData: any = { ...body };
    if (body.deadline) {
      updateData.deadline = new Date(body.deadline);
    }
    if (body.thresholds) {
      updateData.thresholds = body.thresholds.map((p) => ({
        percentage: p,
        notified: false,
      }));
    }
    return this.goalsService.update(goalId, updateData);
  }

  @Post(':goalId/progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新目标进度' })
  updateProgress(
    @Param('goalId') goalId: string,
    @Body() body: { increment?: number; setValue?: number },
  ) {
    return this.goalsService.updateProgress({
      goalId,
      increment: body.increment,
      setValue: body.setValue,
    });
  }

  @Delete(':goalId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除目标' })
  delete(@Param('goalId') goalId: string) {
    return this.goalsService.delete(goalId);
  }

  @Post('defaults')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建默认目标集' })
  createDefaults(
    @Param('campaignId') campaignId: string,
    @Headers('x-team-id') teamId: string,
    @Body() body: { notifications: NotificationChannels },
  ) {
    return this.goalsService.createDefaultGoals(campaignId, teamId, body.notifications);
  }
}

@ApiTags('goals')
@Controller('goals')
export class GoalsStandaloneController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post('bulk-update')
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量更新活动目标进度' })
  bulkUpdate(
    @Body()
    body: {
      campaignId: string;
      clicks?: number;
      conversions?: number;
      revenue?: number;
      uniqueVisitors?: number;
    },
  ) {
    return this.goalsService.bulkUpdateProgress(body.campaignId, {
      clicks: body.clicks,
      conversions: body.conversions,
      revenue: body.revenue,
      uniqueVisitors: body.uniqueVisitors,
    });
  }
}
