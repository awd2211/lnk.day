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
      } catch (error) {
        results.slack = { success: false, error: error.message };
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
      } catch (error) {
        results.teams = { success: false, error: error.message };
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
      } catch (error) {
        results.webhook = { success: false, error: error.message };
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
}
