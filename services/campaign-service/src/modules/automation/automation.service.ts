import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  AutomationRule,
  AutomationTriggerType,
  AutomationActionType,
  AutomationStatus,
  TriggerCondition,
  ActionConfig,
  ExecutionLog,
} from './entities/automation-rule.entity';

export interface CreateAutomationRuleDto {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerCondition: TriggerCondition;
  actions: ActionConfig[];
  campaignId?: string;
  campaignIds?: string[];
  priority?: number;
  maxExecutions?: number;
  settings?: AutomationRule['settings'];
}

export interface UpdateAutomationRuleDto {
  name?: string;
  description?: string;
  triggerCondition?: TriggerCondition;
  actions?: ActionConfig[];
  status?: AutomationStatus;
  isEnabled?: boolean;
  priority?: number;
  maxExecutions?: number;
  settings?: AutomationRule['settings'];
}

export interface AutomationRuleListOptions {
  page?: number;
  limit?: number;
  status?: AutomationStatus;
  triggerType?: AutomationTriggerType;
  campaignId?: string;
  isEnabled?: boolean;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationRule)
    private readonly automationRepository: Repository<AutomationRule>,
  ) {}

  async create(
    teamId: string,
    userId: string,
    dto: CreateAutomationRuleDto,
  ): Promise<AutomationRule> {
    // 验证触发器配置
    this.validateTriggerCondition(dto.triggerType, dto.triggerCondition);

    // 验证动作配置
    for (const action of dto.actions) {
      this.validateActionConfig(action);
    }

    const rule = this.automationRepository.create({
      teamId,
      createdBy: userId,
      name: dto.name,
      description: dto.description,
      triggerType: dto.triggerType,
      triggerCondition: dto.triggerCondition,
      actions: dto.actions,
      campaignId: dto.campaignId,
      campaignIds: dto.campaignIds || [],
      priority: dto.priority || 0,
      maxExecutions: dto.maxExecutions || 100,
      settings: dto.settings || {},
      nextScheduledAt: this.calculateNextSchedule(dto.triggerType, dto.triggerCondition),
    });

    return this.automationRepository.save(rule);
  }

  async findAll(
    teamId: string,
    options: AutomationRuleListOptions = {},
  ): Promise<{ data: AutomationRule[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, triggerType, campaignId, isEnabled } = options;

    const query = this.automationRepository
      .createQueryBuilder('rule')
      .where('rule.teamId = :teamId', { teamId });

    if (status) {
      query.andWhere('rule.status = :status', { status });
    }

    if (triggerType) {
      query.andWhere('rule.triggerType = :triggerType', { triggerType });
    }

    if (campaignId) {
      query.andWhere('(rule.campaignId = :campaignId OR :campaignId = ANY(rule.campaignIds))', {
        campaignId,
      });
    }

    if (isEnabled !== undefined) {
      query.andWhere('rule.isEnabled = :isEnabled', { isEnabled });
    }

    const [data, total] = await query
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, teamId: string): Promise<AutomationRule> {
    const rule = await this.automationRepository.findOne({
      where: { id, teamId },
    });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }
    return rule;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateAutomationRuleDto,
  ): Promise<AutomationRule> {
    const rule = await this.findOne(id, teamId);

    if (dto.triggerCondition) {
      this.validateTriggerCondition(rule.triggerType, dto.triggerCondition);
    }

    if (dto.actions) {
      for (const action of dto.actions) {
        this.validateActionConfig(action);
      }
    }

    Object.assign(rule, dto);

    // 重新计算下次执行时间
    if (dto.triggerCondition) {
      rule.nextScheduledAt = this.calculateNextSchedule(rule.triggerType, rule.triggerCondition);
    }

    return this.automationRepository.save(rule);
  }

  async delete(id: string, teamId: string): Promise<void> {
    const rule = await this.findOne(id, teamId);
    await this.automationRepository.remove(rule);
  }

  async enable(id: string, teamId: string): Promise<AutomationRule> {
    const rule = await this.findOne(id, teamId);
    rule.isEnabled = true;
    rule.status = AutomationStatus.ACTIVE;
    rule.nextScheduledAt = this.calculateNextSchedule(rule.triggerType, rule.triggerCondition);
    return this.automationRepository.save(rule);
  }

  async disable(id: string, teamId: string): Promise<AutomationRule> {
    const rule = await this.findOne(id, teamId);
    rule.isEnabled = false;
    rule.status = AutomationStatus.PAUSED;
    return this.automationRepository.save(rule);
  }

  async executeRule(id: string, teamId: string, force: boolean = false): Promise<ExecutionLog> {
    const rule = await this.findOne(id, teamId);

    if (!force) {
      // 检查是否可以执行
      if (!rule.isEnabled) {
        return this.createExecutionLog('skipped', 'Rule is disabled');
      }

      if (rule.maxExecutions > 0 && rule.executionCount >= rule.maxExecutions) {
        rule.status = AutomationStatus.COMPLETED;
        await this.automationRepository.save(rule);
        return this.createExecutionLog('skipped', 'Max executions reached');
      }

      // 检查冷却时间
      if (rule.settings.cooldownMinutes && rule.lastExecutedAt) {
        const cooldownMs = rule.settings.cooldownMinutes * 60 * 1000;
        const timeSinceLastExecution = Date.now() - rule.lastExecutedAt.getTime();
        if (timeSinceLastExecution < cooldownMs) {
          return this.createExecutionLog('skipped', 'Cooldown period not elapsed');
        }
      }
    }

    // 执行所有动作
    const results: any[] = [];
    let hasError = false;

    for (const action of rule.actions) {
      try {
        const result = await this.executeAction(rule, action);
        results.push({ action: action.type, status: 'success', result });
      } catch (error) {
        hasError = true;
        results.push({ action: action.type, status: 'failed', error: error.message });
        this.logger.error(`Action ${action.type} failed: ${error.message}`);
      }
    }

    // 记录执行结果
    const log = this.createExecutionLog(
      hasError ? 'failed' : 'success',
      hasError ? 'Some actions failed' : 'All actions completed',
      results,
    );

    rule.executionCount++;
    rule.lastExecutedAt = new Date();
    rule.executionHistory = [...rule.executionHistory.slice(-99), log]; // 保留最近100条

    // 如果设置为仅执行一次
    if (rule.settings.executeOnce) {
      rule.status = AutomationStatus.COMPLETED;
      rule.isEnabled = false;
    } else {
      // 计算下次执行时间
      rule.nextScheduledAt = this.calculateNextSchedule(rule.triggerType, rule.triggerCondition);
    }

    await this.automationRepository.save(rule);

    return log;
  }

  async checkAndExecuteScheduledRules(): Promise<void> {
    // 查找需要执行的定时规则
    const rules = await this.automationRepository.find({
      where: {
        isEnabled: true,
        status: AutomationStatus.ACTIVE,
        triggerType: In([AutomationTriggerType.SCHEDULE, AutomationTriggerType.TIME_BASED]),
      },
    });

    const now = new Date();

    for (const rule of rules) {
      if (rule.nextScheduledAt && rule.nextScheduledAt <= now) {
        try {
          await this.executeRule(rule.id, rule.teamId);
          this.logger.log(`Executed scheduled rule: ${rule.name}`);
        } catch (error) {
          this.logger.error(`Failed to execute scheduled rule ${rule.name}: ${error.message}`);
        }
      }
    }
  }

  async checkEventTrigger(
    teamId: string,
    triggerType: AutomationTriggerType,
    eventData: any,
  ): Promise<void> {
    // 查找匹配的规则
    const rules = await this.automationRepository.find({
      where: {
        teamId,
        triggerType,
        isEnabled: true,
        status: AutomationStatus.ACTIVE,
      },
    });

    for (const rule of rules) {
      if (this.matchesTriggerCondition(rule, eventData)) {
        try {
          await this.executeRule(rule.id, teamId);
          this.logger.log(`Executed event-triggered rule: ${rule.name}`);
        } catch (error) {
          this.logger.error(`Failed to execute rule ${rule.name}: ${error.message}`);
        }
      }
    }
  }

  async getExecutionHistory(
    id: string,
    teamId: string,
    limit: number = 20,
  ): Promise<ExecutionLog[]> {
    const rule = await this.findOne(id, teamId);
    return rule.executionHistory.slice(-limit).reverse();
  }

  async getStats(teamId: string): Promise<{
    total: number;
    active: number;
    paused: number;
    completed: number;
    totalExecutions: number;
    recentExecutions: number;
  }> {
    const stats = await this.automationRepository
      .createQueryBuilder('rule')
      .select([
        'COUNT(*) as total',
        `SUM(CASE WHEN rule.status = 'active' THEN 1 ELSE 0 END) as active`,
        `SUM(CASE WHEN rule.status = 'paused' THEN 1 ELSE 0 END) as paused`,
        `SUM(CASE WHEN rule.status = 'completed' THEN 1 ELSE 0 END) as completed`,
        'SUM(rule.executionCount) as totalExecutions',
      ])
      .where('rule.teamId = :teamId', { teamId })
      .getRawOne();

    // 最近7天的执行数
    const recentResult = await this.automationRepository
      .createQueryBuilder('rule')
      .select('SUM(rule.executionCount)', 'count')
      .where('rule.teamId = :teamId', { teamId })
      .andWhere(`rule.lastExecutedAt > NOW() - INTERVAL '7 days'`)
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      paused: parseInt(stats.paused) || 0,
      completed: parseInt(stats.completed) || 0,
      totalExecutions: parseInt(stats.totalexecutions) || 0,
      recentExecutions: parseInt(recentResult?.count) || 0,
    };
  }

  async duplicateRule(
    id: string,
    teamId: string,
    userId: string,
    newName?: string,
  ): Promise<AutomationRule> {
    const original = await this.findOne(id, teamId);

    return this.create(teamId, userId, {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      triggerType: original.triggerType,
      triggerCondition: original.triggerCondition,
      actions: original.actions,
      campaignId: original.campaignId,
      campaignIds: original.campaignIds,
      priority: original.priority,
      maxExecutions: original.maxExecutions,
      settings: original.settings,
    });
  }

  // 私有方法

  private validateTriggerCondition(
    type: AutomationTriggerType,
    condition: TriggerCondition,
  ): void {
    switch (type) {
      case AutomationTriggerType.SCHEDULE:
        if (!condition.scheduleType) {
          throw new BadRequestException('Schedule type is required');
        }
        if (condition.scheduleType !== 'once' && !condition.scheduleTime) {
          throw new BadRequestException('Schedule time is required');
        }
        break;

      case AutomationTriggerType.CLICKS_THRESHOLD:
      case AutomationTriggerType.CONVERSION_THRESHOLD:
      case AutomationTriggerType.BUDGET_THRESHOLD:
      case AutomationTriggerType.CTR_THRESHOLD:
        if (condition.threshold === undefined || !condition.operator) {
          throw new BadRequestException('Threshold and operator are required');
        }
        break;

      case AutomationTriggerType.CAMPAIGN_STATUS_CHANGE:
        if (!condition.toStatus) {
          throw new BadRequestException('Target status is required');
        }
        break;
    }
  }

  private validateActionConfig(action: ActionConfig): void {
    switch (action.type) {
      case AutomationActionType.SEND_EMAIL:
        if (!action.recipients || action.recipients.length === 0) {
          throw new BadRequestException('Email recipients are required');
        }
        break;

      case AutomationActionType.SEND_WEBHOOK:
        if (!action.webhookUrl) {
          throw new BadRequestException('Webhook URL is required');
        }
        break;

      case AutomationActionType.REDIRECT_LINKS:
        if (!action.newDestination) {
          throw new BadRequestException('New destination URL is required');
        }
        break;

      case AutomationActionType.ADD_TAGS:
      case AutomationActionType.REMOVE_TAGS:
        if (!action.tags || action.tags.length === 0) {
          throw new BadRequestException('Tags are required');
        }
        break;
    }
  }

  private calculateNextSchedule(
    type: AutomationTriggerType,
    condition: TriggerCondition,
  ): Date | undefined {
    if (type !== AutomationTriggerType.SCHEDULE && type !== AutomationTriggerType.TIME_BASED) {
      return undefined;
    }

    const now = new Date();

    switch (condition.scheduleType) {
      case 'once':
        if (condition.scheduleDate) {
          const date = new Date(condition.scheduleDate);
          if (condition.scheduleTime) {
            const [hours, minutes] = condition.scheduleTime.split(':').map(Number);
            date.setHours(hours, minutes, 0, 0);
          }
          return date > now ? date : undefined;
        }
        break;

      case 'daily':
        if (condition.scheduleTime) {
          const [hours, minutes] = condition.scheduleTime.split(':').map(Number);
          const next = new Date(now);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
          return next;
        }
        break;

      case 'weekly':
        if (condition.scheduleTime && condition.scheduleDays?.length) {
          const [hours, minutes] = condition.scheduleTime.split(':').map(Number);
          const currentDay = now.getDay();

          // 找到下一个计划日
          for (let i = 0; i < 7; i++) {
            const checkDay = (currentDay + i) % 7;
            if (condition.scheduleDays.includes(checkDay)) {
              const next = new Date(now);
              next.setDate(now.getDate() + i);
              next.setHours(hours, minutes, 0, 0);
              if (next > now) {
                return next;
              }
            }
          }
        }
        break;

      case 'monthly':
        if (condition.scheduleTime && condition.scheduleDays?.length) {
          const [hours, minutes] = condition.scheduleTime.split(':').map(Number);
          const currentDate = now.getDate();

          // 找到本月或下月的计划日
          for (const day of condition.scheduleDays.sort((a, b) => a - b)) {
            const next = new Date(now);
            next.setDate(day);
            next.setHours(hours, minutes, 0, 0);
            if (next > now) {
              return next;
            }
          }
          // 如果本月没有，找下月第一个
          const next = new Date(now);
          next.setMonth(next.getMonth() + 1);
          next.setDate(condition.scheduleDays[0]);
          next.setHours(hours, minutes, 0, 0);
          return next;
        }
        break;
    }

    return undefined;
  }

  private matchesTriggerCondition(rule: AutomationRule, eventData: any): boolean {
    const condition = rule.triggerCondition;

    // 检查活动匹配
    if (condition.campaignId && eventData.campaignId !== condition.campaignId) {
      return false;
    }

    if (condition.campaignIds?.length && !condition.campaignIds.includes(eventData.campaignId)) {
      return false;
    }

    // 检查阈值条件
    if (condition.threshold !== undefined && condition.operator && condition.metric) {
      const value = eventData[condition.metric];
      if (value === undefined) return false;

      switch (condition.operator) {
        case 'gt':
          return value > condition.threshold;
        case 'gte':
          return value >= condition.threshold;
        case 'lt':
          return value < condition.threshold;
        case 'lte':
          return value <= condition.threshold;
        case 'eq':
          return value === condition.threshold;
        default:
          return false;
      }
    }

    // 检查状态变更
    if (condition.toStatus) {
      if (eventData.newStatus !== condition.toStatus) return false;
      if (condition.fromStatus && eventData.oldStatus !== condition.fromStatus) return false;
    }

    return true;
  }

  private async executeAction(rule: AutomationRule, action: ActionConfig): Promise<any> {
    this.logger.log(`Executing action: ${action.type} for rule: ${rule.name}`);

    switch (action.type) {
      case AutomationActionType.SEND_EMAIL:
        // 发送邮件通知
        // TODO: 集成通知服务
        return { sent: true, recipients: action.recipients };

      case AutomationActionType.SEND_WEBHOOK:
        // 发送 Webhook
        try {
          const response = await fetch(action.webhookUrl!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ruleId: rule.id,
              ruleName: rule.name,
              triggerType: rule.triggerType,
              timestamp: new Date().toISOString(),
              message: action.message,
            }),
          });
          return { statusCode: response.status, success: response.ok };
        } catch (error) {
          throw new Error(`Webhook failed: ${error.message}`);
        }

      case AutomationActionType.PAUSE_CAMPAIGN:
        // TODO: 调用 campaign service 暂停活动
        return { campaignId: action.targetCampaignId || rule.campaignId, paused: true };

      case AutomationActionType.RESUME_CAMPAIGN:
        // TODO: 调用 campaign service 恢复活动
        return { campaignId: action.targetCampaignId || rule.campaignId, resumed: true };

      case AutomationActionType.END_CAMPAIGN:
        // TODO: 调用 campaign service 结束活动
        return { campaignId: action.targetCampaignId || rule.campaignId, ended: true };

      case AutomationActionType.CREATE_REPORT:
        // TODO: 创建报告
        return { reportType: action.reportType, created: true };

      default:
        this.logger.warn(`Unimplemented action type: ${action.type}`);
        return { message: 'Action type not fully implemented' };
    }
  }

  private createExecutionLog(
    status: 'success' | 'failed' | 'skipped',
    message?: string,
    details?: any,
  ): ExecutionLog {
    return {
      timestamp: new Date().toISOString(),
      status,
      message,
      details,
    };
  }
}
