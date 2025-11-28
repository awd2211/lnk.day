import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import {
  CampaignGoal,
  GoalNotification,
  GoalType,
  GoalStatus,
  NotificationThreshold,
  NotificationChannels,
} from './entities/campaign-goal.entity';

export interface CreateGoalDto {
  campaignId: string;
  teamId: string;
  name: string;
  type: GoalType;
  target: number;
  currency?: string;
  thresholds?: number[]; // percentages like [50, 75, 90, 100]
  notifications: NotificationChannels;
  deadline?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateGoalProgressDto {
  goalId: string;
  increment?: number;
  setValue?: number;
}

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    @InjectRepository(CampaignGoal)
    private readonly goalRepository: Repository<CampaignGoal>,
    @InjectRepository(GoalNotification)
    private readonly notificationRepository: Repository<GoalNotification>,
  ) {}

  async create(dto: CreateGoalDto): Promise<CampaignGoal> {
    const thresholds: NotificationThreshold[] = (dto.thresholds || [50, 75, 90, 100]).map(
      (percentage) => ({
        percentage,
        notified: false,
      }),
    );

    const goal = this.goalRepository.create({
      ...dto,
      thresholds,
      current: 0,
      status: GoalStatus.ACTIVE,
    });

    return this.goalRepository.save(goal);
  }

  async findByCampaign(campaignId: string): Promise<CampaignGoal[]> {
    return this.goalRepository.find({
      where: { campaignId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CampaignGoal> {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }
    return goal;
  }

  async update(id: string, data: Partial<CampaignGoal>): Promise<CampaignGoal> {
    const goal = await this.findOne(id);
    Object.assign(goal, data);
    return this.goalRepository.save(goal);
  }

  async delete(id: string): Promise<void> {
    const goal = await this.findOne(id);
    await this.goalRepository.remove(goal);
  }

  async updateProgress(dto: UpdateGoalProgressDto): Promise<CampaignGoal> {
    const goal = await this.findOne(dto.goalId);

    if (goal.status !== GoalStatus.ACTIVE) {
      return goal;
    }

    if (dto.setValue !== undefined) {
      goal.current = dto.setValue;
    } else if (dto.increment !== undefined) {
      goal.current = Number(goal.current) + dto.increment;
    }

    // Check if goal is reached
    const percentage = (Number(goal.current) / Number(goal.target)) * 100;

    if (percentage >= 100) {
      goal.status = GoalStatus.REACHED;
      await this.sendNotification(goal, 100, 'goal_reached');
    } else {
      // Check thresholds
      for (const threshold of goal.thresholds) {
        if (percentage >= threshold.percentage && !threshold.notified) {
          threshold.notified = true;
          threshold.notifiedAt = new Date();
          await this.sendNotification(goal, threshold.percentage, 'threshold_reached');
        }
      }
    }

    return this.goalRepository.save(goal);
  }

  async bulkUpdateProgress(
    campaignId: string,
    updates: {
      clicks?: number;
      conversions?: number;
      revenue?: number;
      uniqueVisitors?: number;
    },
  ): Promise<void> {
    const goals = await this.findByCampaign(campaignId);

    for (const goal of goals) {
      if (!goal.enabled || goal.status !== GoalStatus.ACTIVE) continue;

      let increment = 0;
      switch (goal.type) {
        case GoalType.CLICKS:
          increment = updates.clicks || 0;
          break;
        case GoalType.CONVERSIONS:
          increment = updates.conversions || 0;
          break;
        case GoalType.REVENUE:
          increment = updates.revenue || 0;
          break;
        case GoalType.UNIQUE_VISITORS:
          increment = updates.uniqueVisitors || 0;
          break;
      }

      if (increment > 0) {
        await this.updateProgress({ goalId: goal.id, increment });
      }
    }
  }

  async getGoalProgress(goalId: string): Promise<{
    goal: CampaignGoal;
    percentage: number;
    remaining: number;
    projectedCompletion?: Date;
    dailyRate?: number;
  }> {
    const goal = await this.findOne(goalId);
    const percentage = (Number(goal.current) / Number(goal.target)) * 100;
    const remaining = Math.max(0, Number(goal.target) - Number(goal.current));

    // Calculate daily rate based on historical data
    const daysSinceCreation = Math.max(
      1,
      (Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dailyRate = Number(goal.current) / daysSinceCreation;

    let projectedCompletion: Date | undefined;
    if (dailyRate > 0 && remaining > 0) {
      const daysToComplete = remaining / dailyRate;
      projectedCompletion = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000);
    }

    return {
      goal,
      percentage: Math.min(100, percentage),
      remaining,
      projectedCompletion,
      dailyRate,
    };
  }

  async getCampaignGoalsSummary(campaignId: string): Promise<{
    goals: Array<{
      id: string;
      name: string;
      type: GoalType;
      target: number;
      current: number;
      percentage: number;
      status: GoalStatus;
    }>;
    overallProgress: number;
    goalsReached: number;
    totalGoals: number;
  }> {
    const goals = await this.findByCampaign(campaignId);

    const goalsSummary = goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      type: goal.type,
      target: Number(goal.target),
      current: Number(goal.current),
      percentage: Math.min(100, (Number(goal.current) / Number(goal.target)) * 100),
      status: goal.status,
    }));

    const overallProgress =
      goalsSummary.length > 0
        ? goalsSummary.reduce((sum, g) => sum + g.percentage, 0) / goalsSummary.length
        : 0;

    const goalsReached = goals.filter((g) => g.status === GoalStatus.REACHED).length;

    return {
      goals: goalsSummary,
      overallProgress,
      goalsReached,
      totalGoals: goals.length,
    };
  }

  private async sendNotification(
    goal: CampaignGoal,
    percentage: number,
    type: string,
  ): Promise<void> {
    const channels = goal.notifications;
    const notification = this.notificationRepository.create({
      goalId: goal.id,
      campaignId: goal.campaignId,
      type,
      percentage,
      channels: {
        email: !!channels.email?.length,
        webhook: !!channels.webhook,
        slack: !!channels.slack?.webhookUrl,
        teams: !!channels.teams?.webhookUrl,
        sms: !!channels.sms?.length,
      },
    });

    const results: Record<string, any> = {};

    // Send Slack notification
    if (channels.slack?.webhookUrl) {
      try {
        await axios.post(channels.slack.webhookUrl, {
          text: `🎯 Campaign Goal Update`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${goal.name}* has reached *${percentage.toFixed(1)}%* of target!`,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Current:* ${goal.current}` },
                { type: 'mrkdwn', text: `*Target:* ${goal.target}` },
                { type: 'mrkdwn', text: `*Type:* ${goal.type}` },
                { type: 'mrkdwn', text: `*Status:* ${type === 'goal_reached' ? '✅ Reached!' : '📈 In Progress'}` },
              ],
            },
          ],
        });
        results.slack = { success: true };
      } catch (error: any) {
        results.slack = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    // Send Teams notification
    if (channels.teams?.webhookUrl) {
      try {
        await axios.post(channels.teams.webhookUrl, {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          summary: `Campaign Goal: ${goal.name}`,
          themeColor: type === 'goal_reached' ? '00FF00' : '0078D7',
          title: `🎯 ${goal.name} - ${percentage.toFixed(1)}%`,
          sections: [
            {
              facts: [
                { name: 'Current', value: goal.current.toString() },
                { name: 'Target', value: goal.target.toString() },
                { name: 'Type', value: goal.type },
                { name: 'Status', value: type === 'goal_reached' ? '✅ Reached!' : '📈 In Progress' },
              ],
            },
          ],
        });
        results.teams = { success: true };
      } catch (error: any) {
        results.teams = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    // Send Webhook notification
    if (channels.webhook) {
      try {
        await axios.post(channels.webhook, {
          event: type,
          goal: {
            id: goal.id,
            name: goal.name,
            type: goal.type,
            current: goal.current,
            target: goal.target,
            percentage,
          },
          campaignId: goal.campaignId,
          timestamp: new Date().toISOString(),
        });
        results.webhook = { success: true };
      } catch (error: any) {
        results.webhook = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    notification.response = results;
    notification.success = Object.values(results).some((r: any) => r.success);
    await this.notificationRepository.save(notification);

    this.logger.log(`Goal notification sent: ${goal.name} at ${percentage}% (${type})`);
  }

  async getNotificationHistory(goalId: string): Promise<GoalNotification[]> {
    return this.notificationRepository.find({
      where: { goalId },
      order: { sentAt: 'DESC' },
    });
  }

  // Check for deadline warnings
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines(): Promise<void> {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const goalsNearDeadline = await this.goalRepository.find({
      where: {
        status: GoalStatus.ACTIVE,
        enabled: true,
        deadline: LessThan(warningThreshold),
      },
    });

    for (const goal of goalsNearDeadline) {
      const percentage = (Number(goal.current) / Number(goal.target)) * 100;
      if (percentage < 100) {
        await this.sendNotification(goal, percentage, 'deadline_warning');
      }
    }
  }

  // Create default goals for a campaign
  async createDefaultGoals(
    campaignId: string,
    teamId: string,
    notifications: NotificationChannels,
  ): Promise<CampaignGoal[]> {
    const defaultGoals: Partial<CreateGoalDto>[] = [
      {
        name: 'Click Target',
        type: GoalType.CLICKS,
        target: 10000,
        thresholds: [25, 50, 75, 100],
      },
      {
        name: 'Conversion Target',
        type: GoalType.CONVERSIONS,
        target: 500,
        thresholds: [50, 75, 90, 100],
      },
    ];

    const goals: CampaignGoal[] = [];
    for (const goalData of defaultGoals) {
      const goal = await this.create({
        ...goalData,
        campaignId,
        teamId,
        notifications,
      } as CreateGoalDto);
      goals.push(goal);
    }

    return goals;
  }

  // ==================== Advanced Analytics ====================

  /**
   * Calculate projection for goal completion
   */
  async calculateProjection(goalId: string): Promise<{
    estimatedCompletionDate?: Date;
    dailyRate: number;
    weeklyTrend: number;
    confidence: number;
    daysRemaining?: number;
  }> {
    const goal = await this.findOne(goalId);

    // Need at least some history to calculate projection
    const history = goal.history || [];
    if (history.length < 2) {
      return {
        dailyRate: 0,
        weeklyTrend: 0,
        confidence: 0,
      };
    }

    // Calculate daily rate based on recent history (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter((h) => new Date(h.timestamp) >= weekAgo);

    let dailyRate = 0;
    if (recentHistory.length >= 2) {
      const firstValue = recentHistory[0]?.value || 0;
      const lastValue = recentHistory[recentHistory.length - 1]?.value || 0;
      const daysDiff = Math.max(
        1,
        (new Date(recentHistory[recentHistory.length - 1]?.timestamp || Date.now()).getTime() -
          new Date(recentHistory[0]?.timestamp || Date.now()).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      dailyRate = (lastValue - firstValue) / daysDiff;
    } else {
      // Fallback to overall rate
      const daysSinceCreation = Math.max(
        1,
        (now.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      dailyRate = Number(goal.current) / daysSinceCreation;
    }

    // Calculate weekly trend
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekHistory = history.filter(
      (h) => new Date(h.timestamp) >= twoWeeksAgo && new Date(h.timestamp) < weekAgo,
    );

    let weeklyTrend = 0;
    if (previousWeekHistory.length > 0 && recentHistory.length > 0) {
      const previousWeekProgress =
        (previousWeekHistory[previousWeekHistory.length - 1]?.value || 0) - (previousWeekHistory[0]?.value || 0);
      const currentWeekProgress = (recentHistory[recentHistory.length - 1]?.value || 0) - (recentHistory[0]?.value || 0);

      if (previousWeekProgress > 0) {
        weeklyTrend = ((currentWeekProgress - previousWeekProgress) / previousWeekProgress) * 100;
      }
    }

    // Calculate estimated completion date
    const remaining = Math.max(0, Number(goal.target) - Number(goal.current));
    let estimatedCompletionDate: Date | undefined;
    let daysRemaining: number | undefined;

    if (dailyRate > 0 && remaining > 0) {
      daysRemaining = Math.ceil(remaining / dailyRate);
      estimatedCompletionDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
    }

    // Calculate confidence (based on consistency of daily rate)
    let confidence = 50; // Base confidence
    if (recentHistory.length >= 7) {
      // Calculate variance in daily progress
      const dailyProgresses: number[] = [];
      for (let i = 1; i < recentHistory.length; i++) {
        const daysDiff =
          (new Date(recentHistory[i]?.timestamp || Date.now()).getTime() -
            new Date(recentHistory[i - 1]?.timestamp || Date.now()).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
          dailyProgresses.push(((recentHistory[i]?.value || 0) - (recentHistory[i - 1]?.value || 0)) / daysDiff);
        }
      }

      if (dailyProgresses.length > 0) {
        const mean = dailyProgresses.reduce((a, b) => a + b, 0) / dailyProgresses.length;
        const variance =
          dailyProgresses.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / dailyProgresses.length;
        const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;

        // Lower variance = higher confidence
        confidence = Math.max(10, Math.min(95, 100 - coefficientOfVariation * 50));
      }
    }

    // Update goal with projection
    goal.projection = {
      estimatedCompletionDate,
      dailyRate,
      weeklyTrend,
      confidence,
      lastCalculatedAt: now,
    };
    await this.goalRepository.save(goal);

    return {
      estimatedCompletionDate,
      dailyRate,
      weeklyTrend,
      confidence,
      daysRemaining,
    };
  }

  /**
   * Compare two goals
   */
  async compareGoals(
    goalId1: string,
    goalId2: string,
  ): Promise<{
    goal1: { id: string; name: string; progress: number; dailyRate: number };
    goal2: { id: string; name: string; progress: number; dailyRate: number };
    progressDifference: number;
    rateDifference: number;
    winner: string;
  }> {
    const [goal1, goal2] = await Promise.all([this.findOne(goalId1), this.findOne(goalId2)]);

    const progress1 = (Number(goal1.current) / Number(goal1.target)) * 100;
    const progress2 = (Number(goal2.current) / Number(goal2.target)) * 100;

    const daysSinceCreation1 = Math.max(
      1,
      (Date.now() - goal1.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysSinceCreation2 = Math.max(
      1,
      (Date.now() - goal2.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const dailyRate1 = Number(goal1.current) / daysSinceCreation1;
    const dailyRate2 = Number(goal2.current) / daysSinceCreation2;

    return {
      goal1: { id: goal1.id, name: goal1.name, progress: progress1, dailyRate: dailyRate1 },
      goal2: { id: goal2.id, name: goal2.name, progress: progress2, dailyRate: dailyRate2 },
      progressDifference: progress1 - progress2,
      rateDifference: dailyRate1 - dailyRate2,
      winner: progress1 >= progress2 ? goal1.id : goal2.id,
    };
  }

  /**
   * Get goal trends over time
   */
  async getGoalTrends(
    goalId: string,
    period: 'day' | 'week' | 'month' = 'week',
  ): Promise<
    Array<{
      date: string;
      value: number;
      progress: number;
      dailyChange: number;
    }>
  > {
    const goal = await this.findOne(goalId);
    const history = goal.history || [];

    if (history.length === 0) {
      return [];
    }

    // Group by period
    const periodMs =
      period === 'day'
        ? 24 * 60 * 60 * 1000
        : period === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    const grouped = new Map<string, { values: number[]; lastValue: number }>();

    history.forEach((h) => {
      const date = new Date(h.timestamp);
      const key =
        period === 'day'
          ? date.toISOString().split('T')[0] || ''
          : period === 'week'
            ? `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = grouped.get(key) || { values: [], lastValue: 0 };
      existing.values.push(h.value);
      existing.lastValue = h.value;
      grouped.set(key, existing);
    });

    const result: Array<{
      date: string;
      value: number;
      progress: number;
      dailyChange: number;
    }> = [];

    let previousValue = goal.startValue || 0;
    for (const [date, data] of grouped) {
      const avgValue = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      result.push({
        date,
        value: data.lastValue,
        progress: (data.lastValue / Number(goal.target)) * 100,
        dailyChange: data.lastValue - previousValue,
      });
      previousValue = data.lastValue;
    }

    return result;
  }

  /**
   * Get team-wide goal statistics
   */
  async getTeamGoalStats(teamId: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    reachedGoals: number;
    failedGoals: number;
    averageProgress: number;
    topPerformingGoals: Array<{ id: string; name: string; progress: number }>;
    underperformingGoals: Array<{ id: string; name: string; progress: number; daysOverdue?: number }>;
  }> {
    const goals = await this.goalRepository.find({ where: { teamId } });

    const activeGoals = goals.filter((g) => g.status === GoalStatus.ACTIVE && g.enabled);
    const reachedGoals = goals.filter((g) => g.status === GoalStatus.REACHED);
    const failedGoals = goals.filter((g) => g.status === GoalStatus.FAILED);

    const goalsWithProgress = goals.map((g) => ({
      id: g.id,
      name: g.name,
      progress: Math.min(100, (Number(g.current) / Number(g.target)) * 100),
      deadline: g.deadline,
      status: g.status,
    }));

    const averageProgress =
      goalsWithProgress.length > 0
        ? goalsWithProgress.reduce((sum, g) => sum + g.progress, 0) / goalsWithProgress.length
        : 0;

    const topPerforming = goalsWithProgress
      .filter((g) => g.status === GoalStatus.ACTIVE)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)
      .map((g) => ({ id: g.id, name: g.name, progress: g.progress }));

    const now = new Date();
    const underperforming = goalsWithProgress
      .filter((g) => {
        if (g.status !== GoalStatus.ACTIVE) return false;
        if (g.progress >= 80) return false; // Not underperforming if >80%
        return true;
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        progress: g.progress,
        daysOverdue: g.deadline && new Date(g.deadline) < now
          ? Math.floor((now.getTime() - new Date(g.deadline).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
      }))
      .sort((a, b) => (a.progress - b.progress))
      .slice(0, 5);

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      reachedGoals: reachedGoals.length,
      failedGoals: failedGoals.length,
      averageProgress,
      topPerformingGoals: topPerforming,
      underperformingGoals: underperforming,
    };
  }

  /**
   * Record history entry (called when progress is updated)
   */
  private async recordHistory(goal: CampaignGoal, source?: string): Promise<void> {
    const history = goal.history || [];
    history.push({
      timestamp: new Date(),
      value: Number(goal.current),
      source,
    });

    // Keep only last 365 entries
    if (history.length > 365) {
      goal.history = history.slice(-365);
    } else {
      goal.history = history;
    }
  }

  /**
   * Get goal type metadata
   */
  getGoalTypeMetadata(type: GoalType): {
    label: string;
    description: string;
    unitLabel: string;
    isInverse: boolean;
    decimalPlaces: number;
  } {
    const metadata: Record<GoalType, any> = {
      [GoalType.CLICKS]: {
        label: '点击数',
        description: '跟踪链接点击总数',
        unitLabel: '次',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.CONVERSIONS]: {
        label: '转化数',
        description: '跟踪完成转化目标的次数',
        unitLabel: '次',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.REVENUE]: {
        label: '收入',
        description: '跟踪产生的总收入',
        unitLabel: '¥',
        isInverse: false,
        decimalPlaces: 2,
      },
      [GoalType.UNIQUE_VISITORS]: {
        label: '独立访客',
        description: '跟踪唯一访客数量',
        unitLabel: '人',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.CTR]: {
        label: '点击率',
        description: '点击数除以展示数',
        unitLabel: '%',
        isInverse: false,
        decimalPlaces: 2,
      },
      [GoalType.ENGAGEMENT_RATE]: {
        label: '互动率',
        description: '用户互动占比',
        unitLabel: '%',
        isInverse: false,
        decimalPlaces: 2,
      },
      [GoalType.BOUNCE_RATE]: {
        label: '跳出率',
        description: '用户快速离开的比例',
        unitLabel: '%',
        isInverse: true, // Lower is better
        decimalPlaces: 2,
      },
      [GoalType.SESSION_DURATION]: {
        label: '会话时长',
        description: '用户平均停留时间',
        unitLabel: '秒',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.PAGE_VIEWS]: {
        label: '页面浏览',
        description: '页面浏览总次数',
        unitLabel: '次',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.FORM_SUBMISSIONS]: {
        label: '表单提交',
        description: '表单提交次数',
        unitLabel: '次',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.SIGNUPS]: {
        label: '注册数',
        description: '用户注册数量',
        unitLabel: '人',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.PURCHASES]: {
        label: '购买数',
        description: '购买交易数量',
        unitLabel: '笔',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.AVERAGE_ORDER_VALUE]: {
        label: '平均订单价值',
        description: '每笔订单的平均金额',
        unitLabel: '¥',
        isInverse: false,
        decimalPlaces: 2,
      },
      [GoalType.RETURN_VISITORS]: {
        label: '回访用户',
        description: '再次访问的用户数',
        unitLabel: '人',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.SOCIAL_SHARES]: {
        label: '社交分享',
        description: '社交平台分享次数',
        unitLabel: '次',
        isInverse: false,
        decimalPlaces: 0,
      },
      [GoalType.CUSTOM]: {
        label: '自定义',
        description: '自定义指标',
        unitLabel: '',
        isInverse: false,
        decimalPlaces: 2,
      },
    };

    return metadata[type] || metadata[GoalType.CUSTOM];
  }
}
