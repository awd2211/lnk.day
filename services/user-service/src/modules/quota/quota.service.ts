import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TeamQuota, QuotaUsageLog, PlanType, PLAN_LIMITS, PlanLimits } from './quota.entity';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    @InjectRepository(TeamQuota)
    private readonly quotaRepository: Repository<TeamQuota>,
    @InjectRepository(QuotaUsageLog)
    private readonly usageLogRepository: Repository<QuotaUsageLog>,
    @Inject(forwardRef(() => PlanService))
    private readonly planService: PlanService,
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

    // 尝试从数据库获取套餐配置
    let baseLimits: PlanLimits;
    try {
      const plan = await this.planService.findByCode(quota.plan);
      baseLimits = {
        maxLinks: plan.limits.maxLinks,
        maxClicks: plan.limits.maxClicks,
        maxQrCodes: plan.limits.maxQrCodes,
        maxTeamMembers: plan.limits.maxTeamMembers,
        maxCustomDomains: plan.limits.maxCustomDomains,
        maxCampaigns: plan.limits.maxCampaigns,
        maxApiRequests: plan.limits.maxApiRequests,
        retentionDays: plan.limits.retentionDays,
        features: {
          customBranding: plan.features.customBranding,
          advancedAnalytics: plan.features.advancedAnalytics,
          apiAccess: plan.features.apiAccess,
          bulkOperations: plan.features.bulkOperations,
          abtesting: plan.features.abtesting,
          deepLinks: plan.features.deepLinks,
          passwordProtection: plan.features.passwordProtection,
          expiringLinks: plan.features.expiringLinks,
          geoTargeting: plan.features.geoTargeting,
          deviceTargeting: plan.features.deviceTargeting,
        },
      };
    } catch (error) {
      // 如果数据库中没有找到套餐，使用硬编码的配置作为备用
      this.logger.warn(`Plan ${quota.plan} not found in database, using fallback config`);
      baseLimits = PLAN_LIMITS[quota.plan];
    }

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

  // ==================== Admin Methods ====================

  async getQuotaStats(): Promise<{
    totalTeams: number;
    byPlan: Record<string, number>;
    usage: {
      totalLinks: number;
      totalClicks: number;
      totalQrCodes: number;
      totalApiRequests: number;
    };
    warnings: {
      nearingLimit: number;
      exceededLimit: number;
    };
  }> {
    const quotas = await this.quotaRepository.find();

    const byPlan: Record<string, number> = {};
    let totalLinks = 0;
    let totalClicks = 0;
    let totalQrCodes = 0;
    let totalApiRequests = 0;
    let nearingLimit = 0;
    let exceededLimit = 0;

    for (const quota of quotas) {
      byPlan[quota.plan] = (byPlan[quota.plan] || 0) + 1;
      totalLinks += quota.linksUsed;
      totalClicks += quota.clicksUsed;
      totalQrCodes += quota.qrCodesUsed;
      totalApiRequests += quota.apiRequestsUsed;

      // Check if nearing or exceeding limit
      try {
        const limits = await this.getLimits(quota.teamId);
        const linkPercentage = limits.maxLinks > 0 ? (quota.linksUsed / limits.maxLinks) * 100 : 0;
        const clickPercentage = limits.maxClicks > 0 ? (quota.clicksUsed / limits.maxClicks) * 100 : 0;

        if (linkPercentage >= 100 || clickPercentage >= 100) {
          exceededLimit++;
        } else if (linkPercentage >= 80 || clickPercentage >= 80) {
          nearingLimit++;
        }
      } catch (e) {
        // Ignore errors for individual quotas
      }
    }

    return {
      totalTeams: quotas.length,
      byPlan,
      usage: {
        totalLinks,
        totalClicks,
        totalQrCodes,
        totalApiRequests,
      },
      warnings: {
        nearingLimit,
        exceededLimit,
      },
    };
  }

  async getAllTeamQuotas(options: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: PlanType;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.quotaRepository.createQueryBuilder('quota');

    if (options.plan) {
      queryBuilder.andWhere('quota.plan = :plan', { plan: options.plan });
    }

    if (options.search) {
      queryBuilder.andWhere('quota.teamId ILIKE :search', { search: `%${options.search}%` });
    }

    if (options.sortBy) {
      const sortColumn = this.getSortColumn(options.sortBy);
      queryBuilder.orderBy(`quota.${sortColumn}`, options.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('quota.updatedAt', 'DESC');
    }

    const [quotas, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Get usage details for each quota
    const data = await Promise.all(
      quotas.map(async (quota) => {
        try {
          const limits = await this.getLimits(quota.teamId);
          return {
            ...quota,
            limits,
            usage: {
              links: {
                used: quota.linksUsed,
                limit: limits.maxLinks,
                percentage: limits.maxLinks > 0 ? Math.round((quota.linksUsed / limits.maxLinks) * 100) : 0,
              },
              clicks: {
                used: quota.clicksUsed,
                limit: limits.maxClicks,
                percentage: limits.maxClicks > 0 ? Math.round((quota.clicksUsed / limits.maxClicks) * 100) : 0,
              },
              qrCodes: {
                used: quota.qrCodesUsed,
                limit: limits.maxQrCodes,
                percentage: limits.maxQrCodes > 0 ? Math.round((quota.qrCodesUsed / limits.maxQrCodes) * 100) : 0,
              },
              apiRequests: {
                used: quota.apiRequestsUsed,
                limit: limits.maxApiRequests,
                percentage: limits.maxApiRequests > 0 ? Math.round((quota.apiRequestsUsed / limits.maxApiRequests) * 100) : 0,
              },
            },
          };
        } catch (e) {
          return {
            ...quota,
            limits: null,
            usage: null,
          };
        }
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private getSortColumn(sortBy: string): string {
    const sortMap: Record<string, string> = {
      teamId: 'teamId',
      teamName: 'teamId', // TeamName is not stored in quota, sort by teamId as fallback
      linksUsed: 'linksUsed',
      clicksUsed: 'clicksUsed',
      qrCodesUsed: 'qrCodesUsed',
      apiRequestsUsed: 'apiRequestsUsed',
      plan: 'plan',
      billingCycleEnd: 'billingCycleEnd',
      billingCycleStart: 'billingCycleStart',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    return sortMap[sortBy] || 'updatedAt';
  }

  async updateTeamQuotaById(
    teamId: string,
    updates: { plan?: PlanType; customLimits?: Partial<PlanLimits> },
  ): Promise<TeamQuota> {
    const quota = await this.getOrCreateQuota(teamId);

    if (updates.plan) {
      quota.plan = updates.plan;
      quota.billingCycleStart = new Date();
      quota.billingCycleEnd = this.getNextBillingCycleEnd();
    }

    if (updates.customLimits) {
      quota.customLimits = {
        ...quota.customLimits,
        ...updates.customLimits,
      };
    }

    return this.quotaRepository.save(quota);
  }

  async getPlans(): Promise<Array<{ plan: string; limits: PlanLimits; pricing?: any }>> {
    try {
      const plans = await this.planService.findPublic();
      return plans.map((p) => ({
        plan: p.code,
        limits: {
          maxLinks: p.limits.maxLinks,
          maxClicks: p.limits.maxClicks,
          maxQrCodes: p.limits.maxQrCodes,
          maxTeamMembers: p.limits.maxTeamMembers,
          maxCustomDomains: p.limits.maxCustomDomains,
          maxCampaigns: p.limits.maxCampaigns,
          maxApiRequests: p.limits.maxApiRequests,
          retentionDays: p.limits.retentionDays,
          features: {
            customBranding: p.features.customBranding,
            advancedAnalytics: p.features.advancedAnalytics,
            apiAccess: p.features.apiAccess,
            bulkOperations: p.features.bulkOperations,
            abtesting: p.features.abtesting,
            deepLinks: p.features.deepLinks,
            passwordProtection: p.features.passwordProtection,
            expiringLinks: p.features.expiringLinks,
            geoTargeting: p.features.geoTargeting,
            deviceTargeting: p.features.deviceTargeting,
          },
        },
        pricing: p.pricing,
      }));
    } catch (error) {
      // 如果数据库中没有找到套餐，使用硬编码的配置作为备用
      this.logger.warn('Failed to load plans from database, using fallback config');
      return Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
        plan: plan as PlanType,
        limits,
      }));
    }
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
