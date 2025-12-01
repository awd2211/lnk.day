import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { GoalsService, CreateGoalDto } from './goals.service';
import { GoalType, GoalStatus, NotificationChannels } from './entities/campaign-goal.entity';

@ApiTags('campaign-goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('campaigns/:campaignId/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '创建营销活动目标' })
  create(
    @Param('campaignId') campaignId: string,
    @ScopedTeamId() teamId: string,
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
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取营销活动所有目标' })
  findAll(@Param('campaignId') campaignId: string) {
    return this.goalsService.findByCampaign(campaignId);
  }

  @Get('summary')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取营销活动目标汇总' })
  getSummary(@Param('campaignId') campaignId: string) {
    return this.goalsService.getCampaignGoalsSummary(campaignId);
  }

  @Get(':goalId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取单个目标详情' })
  findOne(@Param('goalId') goalId: string) {
    return this.goalsService.findOne(goalId);
  }

  @Get(':goalId/progress')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标进度详情（包含预测）' })
  getProgress(@Param('goalId') goalId: string) {
    return this.goalsService.getGoalProgress(goalId);
  }

  @Get(':goalId/notifications')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标通知历史' })
  getNotifications(@Param('goalId') goalId: string) {
    return this.goalsService.getNotificationHistory(goalId);
  }

  @Put(':goalId')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
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
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
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
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '删除目标' })
  delete(@Param('goalId') goalId: string) {
    return this.goalsService.delete(goalId);
  }

  @Post('defaults')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '创建默认目标集' })
  createDefaults(
    @Param('campaignId') campaignId: string,
    @ScopedTeamId() teamId: string,
    @Body() body: { notifications: NotificationChannels },
  ) {
    return this.goalsService.createDefaultGoals(campaignId, teamId, body.notifications);
  }
}

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('goals')
export class GoalsStandaloneController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标列表' })
  @ApiQuery({ name: 'campaignId', required: false, description: '按活动筛选' })
  @ApiQuery({ name: 'status', required: false, description: '按状态筛选 (active, reached, failed, paused)' })
  @ApiQuery({ name: 'type', required: false, description: '按目标类型筛选' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段 (createdAt, updatedAt, name, target, current, deadline)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向 (ASC, DESC)' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  async findAll(
    @ScopedTeamId() teamId: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: GoalStatus,
    @Query('type') type?: GoalType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ) {
    return this.goalsService.findAllWithPagination(teamId, {
      campaignId,
      status,
      type,
      page,
      limit,
      sortBy,
      sortOrder,
      search,
    });
  }

  @Get('stats')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标统计数据' })
  async getStats(@ScopedTeamId() teamId: string) {
    return this.goalsService.getTeamGoalStats(teamId);
  }

  @Get('team-stats')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取团队目标统计汇总' })
  async getTeamStats(@ScopedTeamId() teamId: string) {
    return this.goalsService.getTeamGoalStats(teamId);
  }

  @Get('compare')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '比较两个目标' })
  async compareGoals(
    @Query('goal1') goalId1: string,
    @Query('goal2') goalId2: string,
  ) {
    return this.goalsService.compareGoals(goalId1, goalId2);
  }

  @Post()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '创建目标' })
  async create(
    @ScopedTeamId() teamId: string,
    @Body()
    body: {
      name: string;
      campaignId: string;
      type: GoalType;
      target: number;
      currency?: string;
      thresholds?: number[];
      notifications?: NotificationChannels;
      deadline?: string;
      metadata?: Record<string, any>;
      startValue?: number;
      baselineValue?: number;
    },
  ) {
    return this.goalsService.create({
      campaignId: body.campaignId,
      teamId,
      name: body.name,
      type: body.type,
      target: body.target,
      currency: body.currency,
      thresholds: body.thresholds,
      notifications: body.notifications || {},
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      metadata: body.metadata,
    });
  }

  @Post('bulk-update')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
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

  @Get(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取单个目标' })
  async findOne(@Param('id') id: string) {
    return this.goalsService.findOne(id);
  }

  @Put(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新目标 (PUT)' })
  async updatePut(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      target?: number;
      currency?: string;
      deadline?: string;
      enabled?: boolean;
      thresholds?: number[];
      notifications?: NotificationChannels;
      metadata?: Record<string, any>;
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
    return this.goalsService.update(id, updateData);
  }

  @Patch(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新目标 (PATCH)' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      target?: number;
      currency?: string;
      deadline?: string;
      enabled?: boolean;
      thresholds?: number[];
      notifications?: NotificationChannels;
      metadata?: Record<string, any>;
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
    return this.goalsService.update(id, updateData);
  }

  @Delete(':id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '删除目标' })
  async delete(@Param('id') id: string) {
    await this.goalsService.delete(id);
    return { success: true };
  }

  @Post(':id/pause')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '暂停目标' })
  async pause(@Param('id') id: string) {
    return this.goalsService.update(id, { status: GoalStatus.PAUSED, enabled: false });
  }

  @Post(':id/resume')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '恢复目标' })
  async resume(@Param('id') id: string) {
    return this.goalsService.update(id, { status: GoalStatus.ACTIVE, enabled: true });
  }

  @Get(':id/history')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标历史记录' })
  async getHistory(@Param('id') id: string) {
    const goal = await this.goalsService.findOne(id);
    return goal.history || [];
  }

  @Get(':id/projection')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标预测' })
  async getProjection(@Param('id') id: string) {
    return this.goalsService.calculateProjection(id);
  }

  @Post(':id/projection/recalculate')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '重新计算目标预测' })
  async recalculateProjection(@Param('id') id: string) {
    return this.goalsService.calculateProjection(id);
  }

  @Get(':id/trends')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取目标趋势' })
  async getTrends(
    @Param('id') id: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.goalsService.getGoalTrends(id, period);
  }

  @Post(':id/progress')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新目标进度' })
  async updateProgress(
    @Param('id') id: string,
    @Body() body: { value?: number; source?: string },
  ) {
    return this.goalsService.updateProgress({
      goalId: id,
      setValue: body.value,
    });
  }
}
