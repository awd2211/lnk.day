import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { QuotaService } from './quota.service';
import { TeamQuota, QuotaUsageLog, PlanType, PLAN_LIMITS } from './quota.entity';
import { createMockRepository } from '../../../test/mocks';

describe('QuotaService', () => {
  let service: QuotaService;
  let quotaRepository: ReturnType<typeof createMockRepository>;
  let usageLogRepository: ReturnType<typeof createMockRepository>;

  const mockQuota: TeamQuota = {
    id: 'quota-123',
    teamId: 'team-123',
    plan: PlanType.FREE,
    linksUsed: 10,
    clicksUsed: 500,
    qrCodesUsed: 2,
    apiRequestsUsed: 50,
    billingCycleStart: new Date(),
    billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    customLimits: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsageLog: QuotaUsageLog = {
    id: 'log-123',
    teamId: 'team-123',
    resourceType: 'links',
    action: 'increment',
    amount: 1,
    resourceId: 'link-123',
    timestamp: new Date(),
  };

  beforeEach(async () => {
    quotaRepository = createMockRepository();
    usageLogRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        {
          provide: getRepositoryToken(TeamQuota),
          useValue: quotaRepository,
        },
        {
          provide: getRepositoryToken(QuotaUsageLog),
          useValue: usageLogRepository,
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateQuota', () => {
    it('should return existing quota', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.getOrCreateQuota('team-123');

      expect(quotaRepository.findOne).toHaveBeenCalledWith({ where: { teamId: 'team-123' } });
      expect(result).toEqual(mockQuota);
    });

    it('should create new quota if not exists', async () => {
      quotaRepository.findOne.mockResolvedValue(null);
      quotaRepository.create.mockReturnValue(mockQuota);
      quotaRepository.save.mockResolvedValue(mockQuota);

      const result = await service.getOrCreateQuota('team-123');

      expect(quotaRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'team-123',
          plan: PlanType.FREE,
        }),
      );
      expect(quotaRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getQuota', () => {
    it('should return quota if exists', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.getQuota('team-123');

      expect(result).toEqual(mockQuota);
    });

    it('should throw NotFoundException if quota not found', async () => {
      quotaRepository.findOne.mockResolvedValue(null);

      await expect(service.getQuota('team-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLimits', () => {
    it('should return base limits for plan', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.getLimits('team-123');

      expect(result).toEqual(PLAN_LIMITS[PlanType.FREE]);
    });

    it('should merge custom limits with base limits', async () => {
      const quotaWithCustomLimits = {
        ...mockQuota,
        customLimits: {
          maxLinks: 100,
          features: {
            apiAccess: true,
          },
        },
      };
      quotaRepository.findOne.mockResolvedValue(quotaWithCustomLimits);

      const result = await service.getLimits('team-123');

      expect(result.maxLinks).toBe(100);
      expect(result.features.apiAccess).toBe(true);
      expect(result.maxClicks).toBe(PLAN_LIMITS[PlanType.FREE].maxClicks);
    });
  });

  describe('getUsage', () => {
    it('should return usage statistics', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.getUsage('team-123');

      expect(result.quota).toEqual(mockQuota);
      expect(result.limits).toEqual(PLAN_LIMITS[PlanType.FREE]);
      expect(result.usage.links.used).toBe(10);
      expect(result.usage.links.limit).toBe(25);
      expect(result.usage.links.percentage).toBe(40);
    });

    it('should handle unlimited quota (-1)', async () => {
      const enterpriseQuota = { ...mockQuota, plan: PlanType.ENTERPRISE };
      quotaRepository.findOne.mockResolvedValue(enterpriseQuota);

      const result = await service.getUsage('team-123');

      expect(result.usage.links.percentage).toBe(0);
    });
  });

  describe('checkQuota', () => {
    it('should return true if within quota', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-123', 'links', 5);

      expect(result).toBe(true);
    });

    it('should return false if would exceed quota', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-123', 'links', 20);

      expect(result).toBe(false);
    });

    it('should return true for unlimited quota', async () => {
      const enterpriseQuota = { ...mockQuota, plan: PlanType.ENTERPRISE };
      quotaRepository.findOne.mockResolvedValue(enterpriseQuota);

      const result = await service.checkQuota('team-123', 'links', 10000);

      expect(result).toBe(true);
    });

    it('should check clicks quota', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-123', 'clicks', 400);

      expect(result).toBe(true);
    });

    it('should check qrCodes quota', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-123', 'qrCodes', 2);

      expect(result).toBe(true);
    });

    it('should check apiRequests quota', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-123', 'apiRequests', 40);

      expect(result).toBe(true);
    });
  });

  describe('checkFeature', () => {
    it('should return true for enabled feature', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkFeature('team-123', 'expiringLinks');

      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      quotaRepository.findOne.mockResolvedValue(mockQuota);

      const result = await service.checkFeature('team-123', 'advancedAnalytics');

      expect(result).toBe(false);
    });
  });

  describe('incrementUsage', () => {
    it('should increment links usage', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota, linksUsed: 11 });
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.incrementUsage('team-123', 'links', 1, 'link-123');

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ linksUsed: 11 }),
      );
      expect(usageLogRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if quota exceeded', async () => {
      const nearLimitQuota = { ...mockQuota, linksUsed: 24 };
      quotaRepository.findOne.mockResolvedValue(nearLimitQuota);

      await expect(service.incrementUsage('team-123', 'links', 5)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should increment clicks usage', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota });
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.incrementUsage('team-123', 'clicks', 100);

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ clicksUsed: 600 }),
      );
    });

    it('should increment qrCodes usage', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota });
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.incrementUsage('team-123', 'qrCodes', 1);

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ qrCodesUsed: 3 }),
      );
    });

    it('should increment apiRequests usage', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota });
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.incrementUsage('team-123', 'apiRequests', 10);

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ apiRequestsUsed: 60 }),
      );
    });
  });

  describe('decrementUsage', () => {
    it('should decrement links usage', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota });
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.decrementUsage('team-123', 'links', 1, 'link-123');

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ linksUsed: 9 }),
      );
    });

    it('should not go below zero', async () => {
      const lowQuota = { ...mockQuota, linksUsed: 1 };
      quotaRepository.findOne.mockResolvedValue(lowQuota);
      quotaRepository.save.mockResolvedValue(lowQuota);
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.decrementUsage('team-123', 'links', 5);

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ linksUsed: 0 }),
      );
    });

    it('should decrement qrCodes usage', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota });
      usageLogRepository.create.mockReturnValue(mockUsageLog);
      usageLogRepository.save.mockResolvedValue(mockUsageLog);

      await service.decrementUsage('team-123', 'qrCodes', 1);

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ qrCodesUsed: 1 }),
      );
    });
  });

  describe('updatePlan', () => {
    it('should update plan and reset billing cycle', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.updatePlan('team-123', PlanType.PRO);

      expect(result.plan).toBe(PlanType.PRO);
      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ plan: PlanType.PRO }),
      );
    });
  });

  describe('setCustomLimits', () => {
    it('should set custom limits', async () => {
      const customLimits = { maxLinks: 100 };
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockImplementation((q) => Promise.resolve(q));

      const result = await service.setCustomLimits('team-123', customLimits);

      expect(result.customLimits).toEqual(customLimits);
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should reset clicks and API requests', async () => {
      quotaRepository.findOne.mockResolvedValue({ ...mockQuota });
      quotaRepository.save.mockResolvedValue({ ...mockQuota });

      await service.resetMonthlyUsage('team-123');

      expect(quotaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          clicksUsed: 0,
          apiRequestsUsed: 0,
        }),
      );
    });
  });

  describe('getUsageLogs', () => {
    it('should return usage logs', async () => {
      usageLogRepository.find.mockResolvedValue([mockUsageLog]);

      const result = await service.getUsageLogs('team-123');

      expect(usageLogRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { timestamp: 'DESC' },
        take: 100,
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by resource type', async () => {
      usageLogRepository.find.mockResolvedValue([mockUsageLog]);

      await service.getUsageLogs('team-123', { resourceType: 'links' });

      expect(usageLogRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123', resourceType: 'links' },
        order: { timestamp: 'DESC' },
        take: 100,
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      usageLogRepository.find.mockResolvedValue([mockUsageLog]);

      await service.getUsageLogs('team-123', { startDate, endDate });

      expect(usageLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teamId: 'team-123' }),
        }),
      );
    });

    it('should respect custom limit', async () => {
      usageLogRepository.find.mockResolvedValue([mockUsageLog]);

      await service.getUsageLogs('team-123', { limit: 50 });

      expect(usageLogRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { timestamp: 'DESC' },
        take: 50,
      });
    });
  });

  describe('getPlans', () => {
    it('should return all plans with their limits', async () => {
      const result = await service.getPlans();

      expect(result).toHaveLength(4);
      expect(result.map((p) => p.plan)).toEqual([
        PlanType.FREE,
        PlanType.STARTER,
        PlanType.PRO,
        PlanType.ENTERPRISE,
      ]);
    });
  });
});
