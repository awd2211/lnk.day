import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SubscriptionsController } from './subscriptions.controller';
import { BillingService } from './billing.service';
import { Subscription, SubscriptionStatus, Invoice } from './entities/subscription.entity';
import { PlanType } from '../quota/quota.entity';
import { Team } from '../team/entities/team.entity';
import { User } from '../user/entities/user.entity';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let billingService: jest.Mocked<BillingService>;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;
  let invoiceRepository: jest.Mocked<Repository<Invoice>>;

  const mockBillingService = {
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
  };

  const mockSubscription: Partial<Subscription> = {
    id: 'sub-123',
    teamId: 'team-123',
    plan: PlanType.PRO,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: 'monthly' as any,
    amount: 49,
    currency: 'usd',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockInvoice: Partial<Invoice> = {
    id: 'inv-123',
    subscriptionId: 'sub-123',
    total: 49,
    status: 'paid',
    createdAt: new Date(),
  };

  const createMockQueryBuilder = () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      getCount: jest.fn().mockResolvedValue(0),
    };
    return qb;
  };

  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  const createMockRepository = () => {
    mockQueryBuilder = createMockQueryBuilder();
    return {
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Team),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    billingService = module.get(BillingService);
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    invoiceRepository = module.get(getRepositoryToken(Invoice));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return subscription statistics', async () => {
      subscriptionRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(5)   // trialing
        .mockResolvedValueOnce(10)  // canceled
        .mockResolvedValueOnce(5);  // past_due

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { plan: 'FREE', count: '50' },
        { plan: 'PRO', count: '30' },
        { plan: 'ENTERPRISE', count: '20' },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '4900' });

      const result = await controller.getStats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(80);
      expect(result.trialing).toBe(5);
      expect(result.canceled).toBe(10);
      expect(result.pastDue).toBe(5);
      expect(result.byPlan).toHaveLength(3);
      expect(result.monthlyRevenue).toBe(4900);
    });
  });

  describe('findAll', () => {
    it('should return paginated subscriptions', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([mockSubscription]);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await controller.findAll(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by plan', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await controller.findAll(1, 20, 'PRO');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await controller.findAll(1, 20, undefined, 'active');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return subscription by ID', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);

      const result = await controller.findOne('sub-123');

      expect(result).toEqual(mockSubscription);
      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(controller.findOne('sub-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePlan', () => {
    it('should change subscription plan', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      mockBillingService.updateSubscription.mockResolvedValue({
        ...mockSubscription,
        plan: PlanType.ENTERPRISE,
      } as Subscription);

      const result = await controller.changePlan('sub-123', {
        plan: 'ENTERPRISE',
        billingCycle: 'annual',
      });

      expect(billingService.updateSubscription).toHaveBeenCalledWith('team-123', {
        plan: 'ENTERPRISE',
        billingCycle: 'annual',
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.changePlan('sub-999', { plan: 'PRO' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel subscription at period end', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      mockBillingService.cancelSubscription.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      } as Subscription);

      await controller.cancel('sub-123');

      expect(billingService.cancelSubscription).toHaveBeenCalledWith('team-123', {
        cancelAtPeriodEnd: true,
      });
    });

    it('should cancel subscription immediately', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      mockBillingService.cancelSubscription.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      } as Subscription);

      await controller.cancel('sub-123', { immediately: true, reason: 'Testing' });

      expect(billingService.cancelSubscription).toHaveBeenCalledWith('team-123', {
        cancelAtPeriodEnd: false,
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(controller.cancel('sub-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate canceled subscription', async () => {
      const canceledSub = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      };
      subscriptionRepository.findOne.mockResolvedValue(canceledSub as Subscription);
      mockBillingService.reactivateSubscription.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: false,
      } as Subscription);

      await controller.reactivate('sub-123');

      expect(billingService.reactivateSubscription).toHaveBeenCalledWith('team-123');
    });

    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(controller.reactivate('sub-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('extendTrial', () => {
    it('should extend trial period', async () => {
      const trialingSub = {
        ...mockSubscription,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: new Date(),
      };
      subscriptionRepository.findOne.mockResolvedValue(trialingSub as Subscription);
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub as Subscription));

      const result = await controller.extendTrial('sub-123', { days: 14 });

      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(result.trialEndsAt).toBeDefined();
    });

    it('should throw NotFoundException when subscription not trialing', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);

      await expect(
        controller.extendTrial('sub-123', { days: 14 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.extendTrial('sub-999', { days: 14 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as Subscription);
      invoiceRepository.find.mockResolvedValue([mockInvoice as Invoice]);

      const result = await controller.getInvoices('sub-123');

      expect(result).toHaveLength(1);
      expect(invoiceRepository.find).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub-123' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(controller.getInvoices('sub-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('refundInvoice', () => {
    it('should refund invoice', async () => {
      invoiceRepository.findOne.mockResolvedValue(mockInvoice as Invoice);
      invoiceRepository.save.mockImplementation((inv) => Promise.resolve(inv as Invoice));

      const result = await controller.refundInvoice('sub-123', 'inv-123', {
        amount: 25,
        reason: 'Partial refund',
      });

      expect(result.status).toBe('refunded');
      expect(result.refundAmount).toBe(25);
      expect(result.refundReason).toBe('Partial refund');
    });

    it('should refund full amount when no amount specified', async () => {
      invoiceRepository.findOne.mockResolvedValue(mockInvoice as Invoice);
      invoiceRepository.save.mockImplementation((inv) => Promise.resolve(inv as Invoice));

      const result = await controller.refundInvoice('sub-123', 'inv-123');

      expect(result.refundAmount).toBe(49);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.refundInvoice('sub-123', 'inv-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
