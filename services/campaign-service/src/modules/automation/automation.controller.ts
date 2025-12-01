import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';
import { AutomationService } from './automation.service';
import {
  AutomationStatus,
  AutomationTriggerType,
  TriggerCondition,
  ActionConfig,
} from './entities/automation-rule.entity';

// DTOs
interface CreateAutomationRuleDto {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerCondition: TriggerCondition;
  actions: ActionConfig[];
  priority?: number;
  campaignId?: string;
  campaignIds?: string[];
  maxExecutions?: number;
  settings?: {
    cooldownMinutes?: number;
    executeOnce?: boolean;
    notifyOnExecution?: boolean;
    notifyOnError?: boolean;
  };
}

interface UpdateAutomationRuleDto extends Partial<CreateAutomationRuleDto> {
  status?: AutomationStatus;
  isEnabled?: boolean;
}

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '创建自动化规则' })
  create(
    @Body() data: CreateAutomationRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.automationService.create({
      ...data,
      teamId,
      createdBy: user.id,
    });
  }

  @Get()
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取自动化规则列表' })
  @ApiQuery({ name: 'status', required: false, enum: AutomationStatus })
  @ApiQuery({ name: 'triggerType', required: false, enum: AutomationTriggerType })
  @ApiQuery({ name: 'campaignId', required: false, description: '关联的活动 ID' })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: '管理员模式，返回所有团队的规则' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: AutomationStatus,
    @Query('triggerType') triggerType?: AutomationTriggerType,
    @Query('campaignId') campaignId?: string,
    @Query('all') all?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const shouldQueryAll = all === 'true' && isPlatformAdmin(user);
    return this.automationService.findAll(shouldQueryAll ? undefined : teamId, {
      status,
      triggerType,
      campaignId,
      page,
      limit,
    });
  }

  @Get('stats')
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取自动化规则统计' })
  getStats(@ScopedTeamId() teamId: string) {
    return this.automationService.getStats(teamId);
  }

  @Get('trigger-types')
  @ApiOperation({ summary: '获取可用的触发器类型' })
  getTriggerTypes() {
    return {
      triggerTypes: [
        {
          category: '时间触发器',
          types: [
            { value: AutomationTriggerType.SCHEDULE, label: '定时执行', description: '按设定时间执行' },
            { value: AutomationTriggerType.TIME_BASED, label: '基于时间条件', description: '满足时间条件时执行' },
          ],
        },
        {
          category: '事件触发器',
          types: [
            { value: AutomationTriggerType.GOAL_REACHED, label: '达成目标', description: '活动达成设定目标时触发' },
            { value: AutomationTriggerType.CLICKS_THRESHOLD, label: '点击数阈值', description: '点击数达到阈值时触发' },
            { value: AutomationTriggerType.CONVERSION_THRESHOLD, label: '转化阈值', description: '转化数达到阈值时触发' },
            { value: AutomationTriggerType.BUDGET_THRESHOLD, label: '预算阈值', description: '预算消耗达到阈值时触发' },
          ],
        },
        {
          category: '活动触发器',
          types: [
            { value: AutomationTriggerType.CAMPAIGN_START, label: '活动开始', description: '营销活动开始时触发' },
            { value: AutomationTriggerType.CAMPAIGN_END, label: '活动结束', description: '营销活动结束时触发' },
            { value: AutomationTriggerType.CAMPAIGN_STATUS_CHANGE, label: '状态变更', description: '活动状态变化时触发' },
          ],
        },
        {
          category: '性能触发器',
          types: [
            { value: AutomationTriggerType.CTR_THRESHOLD, label: '点击率阈值', description: 'CTR 达到阈值时触发' },
            { value: AutomationTriggerType.LOW_PERFORMANCE, label: '低表现', description: '活动表现不佳时触发' },
            { value: AutomationTriggerType.HIGH_PERFORMANCE, label: '高表现', description: '活动表现优秀时触发' },
          ],
        },
      ],
    };
  }

  @Get('action-types')
  @ApiOperation({ summary: '获取可用的动作类型' })
  getActionTypes() {
    return {
      actionTypes: [
        {
          category: '通知动作',
          types: [
            { value: 'send_email', label: '发送邮件', description: '发送邮件通知' },
            { value: 'send_webhook', label: '发送 Webhook', description: '调用外部 Webhook' },
            { value: 'send_slack', label: '发送 Slack 消息', description: '发送 Slack 通知' },
          ],
        },
        {
          category: '活动动作',
          types: [
            { value: 'pause_campaign', label: '暂停活动', description: '暂停营销活动' },
            { value: 'resume_campaign', label: '恢复活动', description: '恢复营销活动' },
            { value: 'end_campaign', label: '结束活动', description: '结束营销活动' },
            { value: 'archive_campaign', label: '归档活动', description: '归档营销活动' },
          ],
        },
        {
          category: '链接动作',
          types: [
            { value: 'pause_links', label: '暂停链接', description: '暂停活动下的链接' },
            { value: 'update_links', label: '更新链接', description: '批量更新链接属性' },
            { value: 'redirect_links', label: '重定向链接', description: '修改链接目标地址' },
          ],
        },
        {
          category: '预算动作',
          types: [
            { value: 'adjust_budget', label: '调整预算', description: '调整活动预算' },
            { value: 'reallocate_budget', label: '重新分配预算', description: '在活动间重新分配预算' },
          ],
        },
        {
          category: '标签动作',
          types: [
            { value: 'add_tags', label: '添加标签', description: '为活动添加标签' },
            { value: 'remove_tags', label: '移除标签', description: '移除活动标签' },
          ],
        },
        {
          category: '创建动作',
          types: [
            { value: 'create_report', label: '创建报告', description: '生成活动报告' },
            { value: 'duplicate_campaign', label: '复制活动', description: '复制营销活动' },
          ],
        },
      ],
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取单个自动化规则' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权访问此自动化规则');
    }
    return rule;
  }

  @Get(':id/history')
  @RequirePermissions(Permission.CAMPAIGNS_VIEW)
  @ApiOperation({ summary: '获取规则执行历史' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getExecutionHistory(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权访问此自动化规则');
    }
    return this.automationService.getExecutionHistory(id, limit);
  }

  @Put(':id')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '更新自动化规则' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateAutomationRuleDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权修改此自动化规则');
    }
    return this.automationService.update(id, data);
  }

  @Post(':id/enable')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '启用自动化规则' })
  async enable(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权启用此自动化规则');
    }
    return this.automationService.enable(id);
  }

  @Post(':id/disable')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '禁用自动化规则' })
  async disable(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权禁用此自动化规则');
    }
    return this.automationService.disable(id);
  }

  @Post(':id/execute')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '手动执行规则' })
  async execute(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权执行此自动化规则');
    }
    return this.automationService.executeRule(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.CAMPAIGNS_CREATE)
  @ApiOperation({ summary: '复制自动化规则' })
  async duplicate(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权复制此自动化规则');
    }
    return this.automationService.duplicateRule(id, user.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CAMPAIGNS_DELETE)
  @ApiOperation({ summary: '删除自动化规则' })
  async remove(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rule = await this.automationService.findOne(id);
    if (!isPlatformAdmin(user) && rule.teamId !== teamId) {
      throw new ForbiddenException('无权删除此自动化规则');
    }
    return this.automationService.delete(id);
  }

  // 批量操作
  @Post('bulk/enable')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '批量启用规则' })
  async bulkEnable(
    @Body() body: { ruleIds: string[] },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const results = [];
    for (const id of body.ruleIds) {
      try {
        const rule = await this.automationService.findOne(id);
        if (isPlatformAdmin(user) || rule.teamId === teamId) {
          await this.automationService.enable(id);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: '无权操作' });
        }
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return { results };
  }

  @Post('bulk/disable')
  @RequirePermissions(Permission.CAMPAIGNS_EDIT)
  @ApiOperation({ summary: '批量禁用规则' })
  async bulkDisable(
    @Body() body: { ruleIds: string[] },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const results = [];
    for (const id of body.ruleIds) {
      try {
        const rule = await this.automationService.findOne(id);
        if (isPlatformAdmin(user) || rule.teamId === teamId) {
          await this.automationService.disable(id);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: '无权操作' });
        }
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return { results };
  }

  @Delete('bulk')
  @RequirePermissions(Permission.CAMPAIGNS_DELETE)
  @ApiOperation({ summary: '批量删除规则' })
  async bulkDelete(
    @Body() body: { ruleIds: string[] },
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const results = [];
    for (const id of body.ruleIds) {
      try {
        const rule = await this.automationService.findOne(id);
        if (isPlatformAdmin(user) || rule.teamId === teamId) {
          await this.automationService.delete(id);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: '无权操作' });
        }
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return { results };
  }

  // 触发事件检查 (内部 API)
  @Post('check-event')
  @ApiOperation({ summary: '检查事件触发器 (内部 API)' })
  async checkEventTrigger(
    @Body()
    body: {
      eventType: AutomationTriggerType;
      eventData: {
        campaignId?: string;
        teamId?: string;
        metric?: string;
        value?: number;
        fromStatus?: string;
        toStatus?: string;
      };
    },
  ) {
    return this.automationService.checkEventTrigger(body.eventType, body.eventData);
  }
}
