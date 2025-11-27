import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TeamQuota, QuotaUsageLog, PlanType, PLAN_LIMITS, PlanLimits } from './quota.entity';

@Injectable()
export class QuotaService {
  constructor(
    @InjectRepository(TeamQuota)
    private readonly quotaRepository: Repository<TeamQuota>,
    @InjectRepository(QuotaUsageLog)
    private readonly usageLogRepository: Repository<QuotaUsageLog>,
  ) {}

  async getOrCreateQuota(teamId: string): Promise<TeamQuota> {
    let quota = await this.quotaRepository.findOne({ where: { teamId } });

    if (!quota) {
      quota = this.quotaRepository.create({
        teamId,
        plan: PlanType.FREE,
        billingCycleStart: new Date(),
        billingCycleEnd: this.getNextBillingCycleEnd(),
      });
      await this.quotaRepository.save(quota);
    }

    return quota;
  }

  async getQuota(teamId: string): Promise<TeamQuota> {
    const quota = await this.quotaRepository.findOne({ where: { teamId } });
    if (!quota) {
      throw new NotFoundException(`Quota for team ${teamId} not found`);
    }
    return quota;
  }

  async getLimits(teamId: string): Promise<PlanLimits> {
    const quota = await this.getOrCreateQuota(teamId);
    const baseLimits = PLAN_LIMITS[quota.plan];

    if (quota.customLimits) {
      return {
        ...baseLimits,
        ...quota.customLimits,
        features: {
          ...baseLimits.features,
          ...(quota.customLimits.features || {}),
        },
      };
    }

    return baseLimits;
  }

  async getUsage(teamId: string): Promise<{
    quota: TeamQuota;
    limits: PlanLimits;
    usage: {
      links: { used: number; limit: number; percentage: number };
      clicks: { used: number; limit: number; percentage: number };
      qrCodes: { used: number; limit: number; percentage: number };
      apiRequests: { used: number; limit: number; percentage: number };
    };
  }> {
    const quota = await this.getOrCreateQuota(teamId);
    const limits = await this.getLimits(teamId);

    const calculatePercentage = (used: number, limit: number) => {
      if (limit === -1) return 0; // Unlimited
      if (limit === 0) return 100; // No quota
      return Math.round((used / limit) * 100);
    };

    return {
      quota,
      limits,
      usage: {
        links: {
          used: quota.linksUsed,
          limit: limits.maxLinks,
          percentage: calculatePercentage(quota.linksUsed, limits.maxLinks),
        },
        clicks: {
          used: quota.clicksUsed,
          limit: limits.maxClicks,
          percentage: calculatePercentage(quota.clicksUsed, limits.maxClicks),
        },
        qrCodes: {
          used: quota.qrCodesUsed,
          limit: limits.maxQrCodes,
          percentage: calculatePercentage(quota.qrCodesUsed, limits.maxQrCodes),
        },
        apiRequests: {
          used: quota.apiRequestsUsed,
          limit: limits.maxApiRequests,
          percentage: calculatePercentage(quota.apiRequestsUsed, limits.maxApiRequests),
        },
      },
    };
  }

  async checkQuota(
    teamId: string,
    resourceType: 'links' | 'clicks' | 'qrCodes' | 'apiRequests',
    amount: number = 1,
  ): Promise<boolean> {
    const quota = await this.getOrCreateQuota(teamId);
    const limits = await this.getLimits(teamId);

    let currentUsage: number;
    let limit: number;

    switch (resourceType) {
      case 'links':
        currentUsage = quota.linksUsed;
        limit = limits.maxLinks;
        break;
      case 'clicks':
        currentUsage = quota.clicksUsed;
        limit = limits.maxClicks;
        break;
      case 'qrCodes':
        currentUsage = quota.qrCodesUsed;
        limit = limits.maxQrCodes;
        break;
      case 'apiRequests':
        currentUsage = quota.apiRequestsUsed;
        limit = limits.maxApiRequests;
        break;
    }

    // -1 means unlimited
    if (limit === -1) return true;

    return currentUsage + amount <= limit;
  }

  async checkFeature(teamId: string, feature: keyof PlanLimits['features']): Promise<boolean> {
    const limits = await this.getLimits(teamId);
    return limits.features[feature];
  }

  async incrementUsage(
    teamId: string,
    resourceType: 'links' | 'clicks' | 'qrCodes' | 'apiRequests',
    amount: number = 1,
    resourceId?: string,
  ): Promise<void> {
    const canUse = await this.checkQuota(teamId, resourceType, amount);
    if (!canUse) {
      throw new ForbiddenException(`Quota exceeded for ${resourceType}`);
    }

    const quota = await this.getOrCreateQuota(teamId);

    switch (resourceType) {
      case 'links':
        quota.linksUsed += amount;
        break;
      case 'clicks':
        quota.clicksUsed += amount;
        break;
      case 'qrCodes':
        quota.qrCodesUsed += amount;
        break;
      case 'apiRequests':
        quota.apiRequestsUsed += amount;
        break;
    }

    await this.quotaRepository.save(quota);

    // Log usage
    await this.logUsage(teamId, resourceType, 'increment', amount, resourceId);
  }

  async decrementUsage(
    teamId: string,
    resourceType: 'links' | 'qrCodes',
    amount: number = 1,
    resourceId?: string,
  ): Promise<void> {
    const quota = await this.getOrCreateQuota(teamId);

    switch (resourceType) {
      case 'links':
        quota.linksUsed = Math.max(0, quota.linksUsed - amount);
        break;
      case 'qrCodes':
        quota.qrCodesUsed = Math.max(0, quota.qrCodesUsed - amount);
        break;
    }

    await this.quotaRepository.save(quota);
    await this.logUsage(teamId, resourceType, 'decrement', amount, resourceId);
  }

  async updatePlan(teamId: string, plan: PlanType): Promise<TeamQuota> {
    const quota = await this.getOrCreateQuota(teamId);
    quota.plan = plan;
    quota.billingCycleStart = new Date();
    quota.billingCycleEnd = this.getNextBillingCycleEnd();
    return this.quotaRepository.save(quota);
  }

  async setCustomLimits(teamId: string, customLimits: Partial<PlanLimits>): Promise<TeamQuota> {
    const quota = await this.getOrCreateQuota(teamId);
    quota.customLimits = customLimits;
    return this.quotaRepository.save(quota);
  }

  async resetMonthlyUsage(teamId: string): Promise<void> {
    const quota = await this.getOrCreateQuota(teamId);
    quota.clicksUsed = 0;
    quota.apiRequestsUsed = 0;
    quota.billingCycleStart = new Date();
    quota.billingCycleEnd = this.getNextBillingCycleEnd();
    await this.quotaRepository.save(quota);
  }

  async getUsageLogs(
    teamId: string,
    options?: {
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<QuotaUsageLog[]> {
    const where: any = { teamId };

    if (options?.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options?.startDate && options?.endDate) {
      where.timestamp = Between(options.startDate, options.endDate);
    }

    return this.usageLogRepository.find({
      where,
      order: { timestamp: 'DESC' },
      take: options?.limit || 100,
    });
  }

  async getPlans(): Promise<Array<{ plan: PlanType; limits: PlanLimits }>> {
    return Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
      plan: plan as PlanType,
      limits,
    }));
  }

  private async logUsage(
    teamId: string,
    resourceType: string,
    action: string,
    amount: number,
    resourceId?: string,
  ): Promise<void> {
    const log = this.usageLogRepository.create({
      teamId,
      resourceType,
      action,
      amount,
      resourceId,
    });
    await this.usageLogRepository.save(log);
  }

  private getNextBillingCycleEnd(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }
}
