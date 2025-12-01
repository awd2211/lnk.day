import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { PlanType, PLAN_LIMITS } from './quota.entity';

describe('QuotaController', () => {
  let controller: QuotaController;
  let quotaService: jest.Mocked<QuotaService>;

  const mockQuotaService = {
    getUsage: jest.fn(),
    getLimits: jest.fn(),
    checkQuota: jest.fn(),
    checkFeature: jest.fn(),
    incrementUsage: jest.fn(),
    decrementUsage: jest.fn(),
    updatePlan: jest.fn(),
    setCustomLimits: jest.fn(),
    resetMonthlyUsage: jest.fn(),
    getUsageLogs: jest.fn(),
    getPlans: jest.fn(),
  };

  const mockQuota = {
    id: 'quota-123',
    teamId: 'team-123',
    plan: PlanType.FREE,
    linksUsed: 10,
    clicksUsed: 500,
    qrCodesUsed: 2,
    apiRequestsUsed: 50,
    billingCycleStart: new Date(),
    billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsageLog = {
    id: 'log-123',
    teamId: 'team-123',
    resourceType: 'links',
    action: 'increment',
    amount: 1,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotaController],
      providers: [
        {
          provide: QuotaService,
          useValue: mockQuotaService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<QuotaController>(QuotaController);
    quotaService = module.get(QuotaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsage', () => {
    it('should return team quota usage', async () => {
      const usageResult = {
        quota: mockQuota,
        limits: PLAN_LIMITS[PlanType.FREE],
        usage: {
          links: { used: 10, limit: 25, percentage: 40 },
          clicks: { used: 500, limit: 1000, percentage: 50 },
          qrCodes: { used: 2, limit: 5, percentage: 40 },
          apiRequests: { used: 50, limit: 100, percentage: 50 },
        },
      };
      mockQuotaService.getUsage.mockResolvedValue(usageResult);

      const result = await controller.getUsage('team-123');

      expect(quotaService.getUsage).toHaveBeenCalledWith('team-123');
      expect(result).toEqual(usageResult);
    });
  });

  describe('getLimits', () => {
    it('should return team quota limits', async () => {
      mockQuotaService.getLimits.mockResolvedValue(PLAN_LIMITS[PlanType.FREE]);

      const result = await controller.getLimits('team-123');

      expect(quotaService.getLimits).toHaveBeenCalledWith('team-123');
      expect(result).toEqual(PLAN_LIMITS[PlanType.FREE]);
    });
  });

  describe('checkQuota', () => {
    it('should check if quota is available', async () => {
      mockQuotaService.checkQuota.mockResolvedValue(true);

      const result = await controller.checkQuota('team-123', 'links', '5');

      expect(quotaService.checkQuota).toHaveBeenCalledWith('team-123', 'links', 5);
      expect(result).toEqual({ allowed: true });
    });

    it('should default amount to 1', async () => {
      mockQuotaService.checkQuota.mockResolvedValue(true);

      await controller.checkQuota('team-123', 'clicks');

      expect(quotaService.checkQuota).toHaveBeenCalledWith('team-123', 'clicks', 1);
    });

    it('should return false when quota exceeded', async () => {
      mockQuotaService.checkQuota.mockResolvedValue(false);

      const result = await controller.checkQuota('team-123', 'links', '20');

      expect(result).toEqual({ allowed: false });
    });
  });

  describe('checkFeature', () => {
    it('should check if feature is enabled', async () => {
      mockQuotaService.checkFeature.mockResolvedValue(true);

      const result = await controller.checkFeature('team-123', 'apiAccess');

      expect(quotaService.checkFeature).toHaveBeenCalledWith('team-123', 'apiAccess');
      expect(result).toEqual({ enabled: true });
    });

    it('should return false for disabled feature', async () => {
      mockQuotaService.checkFeature.mockResolvedValue(false);

      const result = await controller.checkFeature('team-123', 'advancedAnalytics');

      expect(result).toEqual({ enabled: false });
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage', async () => {
      mockQuotaService.incrementUsage.mockResolvedValue(undefined);

      await controller.incrementUsage('team-123', {
        type: 'links',
        amount: 1,
        resourceId: 'link-123',
      });

      expect(quotaService.incrementUsage).toHaveBeenCalledWith(
        'team-123',
        'links',
        1,
        'link-123',
      );
    });

    it('should increment without resourceId', async () => {
      mockQuotaService.incrementUsage.mockResolvedValue(undefined);

      await controller.incrementUsage('team-123', { type: 'clicks' });

      expect(quotaService.incrementUsage).toHaveBeenCalledWith(
        'team-123',
        'clicks',
        undefined,
        undefined,
      );
    });
  });

  describe('decrementUsage', () => {
    it('should decrement usage', async () => {
      mockQuotaService.decrementUsage.mockResolvedValue(undefined);

      await controller.decrementUsage('team-123', {
        type: 'links',
        amount: 1,
        resourceId: 'link-123',
      });

      expect(quotaService.decrementUsage).toHaveBeenCalledWith(
        'team-123',
        'links',
        1,
        'link-123',
      );
    });
  });

  describe('updatePlan', () => {
    it('should update team plan', async () => {
      const updatedQuota = { ...mockQuota, plan: PlanType.PRO };
      mockQuotaService.updatePlan.mockResolvedValue(updatedQuota);

      const result = await controller.updatePlan('team-123', { plan: PlanType.PRO });

      expect(quotaService.updatePlan).toHaveBeenCalledWith('team-123', PlanType.PRO);
      expect(result.plan).toBe(PlanType.PRO);
    });
  });

  describe('setCustomLimits', () => {
    it('should set custom limits', async () => {
      const customLimits = { maxLinks: 100 };
      const updatedQuota = { ...mockQuota, customLimits };
      mockQuotaService.setCustomLimits.mockResolvedValue(updatedQuota);

      const result = await controller.setCustomLimits('team-123', customLimits);

      expect(quotaService.setCustomLimits).toHaveBeenCalledWith('team-123', customLimits);
      expect(result.customLimits).toEqual(customLimits);
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should reset monthly usage', async () => {
      mockQuotaService.resetMonthlyUsage.mockResolvedValue(undefined);

      await controller.resetMonthlyUsage('team-123');

      expect(quotaService.resetMonthlyUsage).toHaveBeenCalledWith('team-123');
    });
  });

  describe('getUsageLogs', () => {
    it('should return usage logs', async () => {
      mockQuotaService.getUsageLogs.mockResolvedValue([mockUsageLog]);

      const result = await controller.getUsageLogs('team-123');

      expect(quotaService.getUsageLogs).toHaveBeenCalledWith('team-123', {
        resourceType: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by resource type', async () => {
      mockQuotaService.getUsageLogs.mockResolvedValue([mockUsageLog]);

      await controller.getUsageLogs('team-123', 'links');

      expect(quotaService.getUsageLogs).toHaveBeenCalledWith('team-123', {
        resourceType: 'links',
        startDate: undefined,
        endDate: undefined,
        limit: undefined,
      });
    });

    it('should filter by date range', async () => {
      mockQuotaService.getUsageLogs.mockResolvedValue([mockUsageLog]);

      await controller.getUsageLogs(
        'team-123',
        undefined,
        '2024-01-01',
        '2024-12-31',
      );

      expect(quotaService.getUsageLogs).toHaveBeenCalledWith('team-123', {
        resourceType: undefined,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: undefined,
      });
    });

    it('should apply limit', async () => {
      mockQuotaService.getUsageLogs.mockResolvedValue([mockUsageLog]);

      await controller.getUsageLogs('team-123', undefined, undefined, undefined, '50');

      expect(quotaService.getUsageLogs).toHaveBeenCalledWith('team-123', {
        resourceType: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 50,
      });
    });
  });

  describe('getPlans', () => {
    it('should return all available plans', async () => {
      const plans = [
        { plan: PlanType.FREE, limits: PLAN_LIMITS[PlanType.FREE] },
        { plan: PlanType.STARTER, limits: PLAN_LIMITS[PlanType.STARTER] },
        { plan: PlanType.PRO, limits: PLAN_LIMITS[PlanType.PRO] },
        { plan: PlanType.ENTERPRISE, limits: PLAN_LIMITS[PlanType.ENTERPRISE] },
      ];
      mockQuotaService.getPlans.mockResolvedValue(plans);

      const result = await controller.getPlans();

      expect(quotaService.getPlans).toHaveBeenCalled();
      expect(result).toHaveLength(4);
    });
  });
});
