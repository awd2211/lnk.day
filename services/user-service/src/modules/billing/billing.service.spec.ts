import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { BillingService } from './billing.service';
import {
  Subscription,
  Invoice,
  PaymentMethod,
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
} from './entities/subscription.entity';
import { QuotaService } from '../quota/quota.service';
import { PlanType } from '../quota/quota.entity';
import { createMockRepository } from '../../../test/mocks';

describe('BillingService', () => {
  let service: BillingService;
  let subscriptionRepository: ReturnType<typeof createMockRepository>;
  let invoiceRepository: ReturnType<typeof createMockRepository>;
  let paymentMethodRepository: ReturnType<typeof createMockRepository>;
  let quotaService: jest.Mocked<QuotaService>;

  const mockQuotaService = {
    updatePlan: jest.fn(),
    getUsage: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockSubscription: Subscription = {
    id: 'sub-123',
    teamId: 'team-123',
    plan: PlanType.PRO,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: BillingCycle.MONTHLY,
    paymentProvider: PaymentProvider.STRIPE,
    amount: 49,
    currency: 'USD',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice: Invoice = {
    id: 'inv-123',
    teamId: 'team-123',
    subscriptionId: 'sub-123',
    invoiceNumber: 'INV-123',
    subtotal: 49,
    tax: 0,
    total: 49,
    currency: 'USD',
    status: 'paid',
    dueDate: new Date(),
    paidAt: new Date(),
    lineItems: [{ description: 'Pro Plan', quantity: 1, unitPrice: 49, amount: 49 }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentMethod: PaymentMethod = {
    id: 'pm-123',
    teamId: 'team-123',
    provider: PaymentProvider.STRIPE,
    type: 'card',
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    subscriptionRepository = createMockRepository();
    invoiceRepository = createMockRepository();
    paymentMethodRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: invoiceRepository,
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: paymentMethodRepository,
        },
        {
          provide: QuotaService,
          useValue: mockQuotaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    quotaService = module.get(QuotaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPricing', () => {
    it('should return all pricing tiers', () => {
      const pricing = service.getPricing();

      expect(pricing).toHaveLength(4);
      expect(pricing[0].plan).toBe(PlanType.FREE);
      expect(pricing[1].plan).toBe(PlanType.STARTER);
      expect(pricing[2].plan).toBe(PlanType.PRO);
      expect(pricing[3].plan).toBe(PlanType.ENTERPRISE);
    });

    it('should include features for each plan', () => {
      const pricing = service.getPricing();

      expect(pricing[0].features).toContain('25 links');
      expect(pricing[2].features).toContain('A/B testing');
      expect(pricing[3].features).toContain('SSO/SAML');
    });

    it('should include limits for each plan', () => {
      const pricing = service.getPricing();

      expect(pricing[0].limits.maxLinks).toBe(25);
      expect(pricing[3].limits.maxLinks).toBe(-1); // Unlimited
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for team', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription('team-123');

      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null if no subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getSubscription('team-123');

      expect(result).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);
      subscriptionRepository.create.mockReturnValue({ ...mockSubscription });
      subscriptionRepository.save.mockResolvedValue({ ...mockSubscription });
      mockQuotaService.updatePlan.mockResolvedValue(undefined);

      const result = await service.createSubscription('team-123', {
        plan: PlanType.PRO,
        billingCycle: BillingCycle.MONTHLY,
        paymentProvider: PaymentProvider.STRIPE,
      });

      expect(subscriptionRepository.create).toHaveBeenCalled();
      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(quotaService.updatePlan).toHaveBeenCalledWith('team-123', PlanType.PRO);
      expect(result.plan).toBe(PlanType.PRO);
    });

    it('should create free subscription with active status', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);
      subscriptionRepository.create.mockReturnValue({
        ...mockSubscription,
        plan: PlanType.FREE,
        status: SubscriptionStatus.ACTIVE,
      });
      subscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        plan: PlanType.FREE,
        status: SubscriptionStatus.ACTIVE,
      });
      mockQuotaService.updatePlan.mockResolvedValue(undefined);

      const result = await service.createSubscription('team-123', {
        plan: PlanType.FREE,
        billingCycle: BillingCycle.MONTHLY,
      });

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should create paid subscription with trial status', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);
      subscriptionRepository.create.mockImplementation((data) => ({
        ...mockSubscription,
        ...data,
      }));
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));
      mockQuotaService.updatePlan.mockResolvedValue(undefined);

      const result = await service.createSubscription('team-123', {
        plan: PlanType.PRO,
        billingCycle: BillingCycle.MONTHLY,
        paymentProvider: PaymentProvider.STRIPE,
      });

      expect(result.status).toBe(SubscriptionStatus.TRIALING);
      expect(result.trialEndsAt).toBeDefined();
    });

    it('should throw if team already has active subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      await expect(
        service.createSubscription('team-123', {
          plan: PlanType.PRO,
          billingCycle: BillingCycle.MONTHLY,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should calculate yearly price correctly', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);
      subscriptionRepository.create.mockImplementation((data) => ({
        ...mockSubscription,
        ...data,
      }));
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));
      mockQuotaService.updatePlan.mockResolvedValue(undefined);

      const result = await service.createSubscription('team-123', {
        plan: PlanType.PRO,
        billingCycle: BillingCycle.YEARLY,
        paymentProvider: PaymentProvider.STRIPE,
      });

      expect(result.amount).toBe(490); // Yearly price for Pro
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription plan', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...mockSubscription });
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));
      mockQuotaService.updatePlan.mockResolvedValue(undefined);

      const result = await service.updateSubscription('team-123', {
        plan: PlanType.ENTERPRISE,
      });

      expect(result.plan).toBe(PlanType.ENTERPRISE);
      expect(quotaService.updatePlan).toHaveBeenCalledWith('team-123', PlanType.ENTERPRISE);
    });

    it('should update billing cycle', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...mockSubscription });
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));

      const result = await service.updateSubscription('team-123', {
        billingCycle: BillingCycle.YEARLY,
      });

      expect(result.billingCycle).toBe(BillingCycle.YEARLY);
      expect(result.amount).toBe(490); // Yearly price
    });

    it('should throw if no active subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSubscription('team-123', { plan: PlanType.PRO }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel at period end', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...mockSubscription });
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));

      const result = await service.cancelSubscription('team-123', {
        cancelAtPeriodEnd: true,
      });

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(quotaService.updatePlan).not.toHaveBeenCalled();
    });

    it('should cancel immediately and downgrade to free', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...mockSubscription });
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));
      mockQuotaService.updatePlan.mockResolvedValue(undefined);

      const result = await service.cancelSubscription('team-123', {
        cancelAtPeriodEnd: false,
      });

      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(result.canceledAt).toBeDefined();
      expect(quotaService.updatePlan).toHaveBeenCalledWith('team-123', PlanType.FREE);
    });

    it('should throw if no active subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelSubscription('team-123', { cancelAtPeriodEnd: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate canceled subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      });
      subscriptionRepository.save.mockImplementation((sub) => Promise.resolve(sub));

      const result = await service.reactivateSubscription('team-123');

      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should throw if no subscription found', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(service.reactivateSubscription('team-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if subscription already active', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      });

      await expect(service.reactivateSubscription('team-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for team', async () => {
      invoiceRepository.find.mockResolvedValue([mockInvoice]);

      const result = await service.getInvoices('team-123');

      expect(invoiceRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by id', async () => {
      invoiceRepository.findOne.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('inv-123');

      expect(result).toEqual(mockInvoice);
    });

    it('should throw if invoice not found', async () => {
      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(service.getInvoice('inv-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice', async () => {
      invoiceRepository.create.mockReturnValue({ ...mockInvoice });
      invoiceRepository.save.mockResolvedValue({ ...mockInvoice });

      const result = await service.createInvoice('team-123', 'sub-123', 49, [
        { description: 'Pro Plan', quantity: 1, unitPrice: 49, amount: 49 },
      ]);

      expect(invoiceRepository.create).toHaveBeenCalled();
      expect(invoiceRepository.save).toHaveBeenCalled();
      expect(result.total).toBe(49);
    });
  });

  describe('getPaymentMethods', () => {
    it('should return payment methods for team', async () => {
      paymentMethodRepository.find.mockResolvedValue([mockPaymentMethod]);

      const result = await service.getPaymentMethods('team-123');

      expect(paymentMethodRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method', async () => {
      paymentMethodRepository.create.mockReturnValue({ ...mockPaymentMethod });
      paymentMethodRepository.save.mockResolvedValue({ ...mockPaymentMethod });

      const result = await service.addPaymentMethod('team-123', {
        provider: PaymentProvider.STRIPE,
        token: 'tok_123',
      });

      expect(result.provider).toBe(PaymentProvider.STRIPE);
    });

    it('should set as default if specified', async () => {
      paymentMethodRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      paymentMethodRepository.create.mockReturnValue({ ...mockPaymentMethod, isDefault: true });
      paymentMethodRepository.save.mockResolvedValue({ ...mockPaymentMethod, isDefault: true });

      const result = await service.addPaymentMethod('team-123', {
        provider: PaymentProvider.STRIPE,
        token: 'tok_123',
        setAsDefault: true,
      });

      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { teamId: 'team-123' },
        { isDefault: false },
      );
      expect(result.isDefault).toBe(true);
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove payment method', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);
      paymentMethodRepository.remove.mockResolvedValue(mockPaymentMethod);

      await service.removePaymentMethod('team-123', 'pm-123');

      expect(paymentMethodRepository.remove).toHaveBeenCalled();
    });

    it('should throw if payment method not found', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removePaymentMethod('team-123', 'pm-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default', async () => {
      paymentMethodRepository.findOne.mockResolvedValue({ ...mockPaymentMethod });
      paymentMethodRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      paymentMethodRepository.save.mockImplementation((pm) => Promise.resolve(pm));

      const result = await service.setDefaultPaymentMethod('team-123', 'pm-123');

      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { teamId: 'team-123' },
        { isDefault: false },
      );
      expect(result.isDefault).toBe(true);
    });

    it('should throw if payment method not found', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setDefaultPaymentMethod('team-123', 'pm-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBillingOverview', () => {
    it('should return billing overview', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      paymentMethodRepository.find.mockResolvedValue([mockPaymentMethod]);
      invoiceRepository.find.mockResolvedValue([mockInvoice]);
      mockQuotaService.getUsage.mockResolvedValue({
        quota: {},
        limits: {},
        usage: {},
      });

      const result = await service.getBillingOverview('team-123');

      expect(result.subscription).toBeDefined();
      expect(result.subscription?.plan).toBe(PlanType.PRO);
      expect(result.paymentMethods).toHaveLength(1);
      expect(result.recentInvoices).toHaveLength(1);
      expect(result.usage).toBeDefined();
    });

    it('should return null subscription if none exists', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);
      paymentMethodRepository.find.mockResolvedValue([]);
      invoiceRepository.find.mockResolvedValue([]);
      mockQuotaService.getUsage.mockResolvedValue({
        quota: {},
        limits: {},
        usage: {},
      });

      const result = await service.getBillingOverview('team-123');

      expect(result.subscription).toBeNull();
    });

    it('should limit recent invoices to 5', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      paymentMethodRepository.find.mockResolvedValue([]);
      invoiceRepository.find.mockResolvedValue(
        Array(10)
          .fill(null)
          .map((_, i) => ({ ...mockInvoice, id: `inv-${i}` })),
      );
      mockQuotaService.getUsage.mockResolvedValue({
        quota: {},
        limits: {},
        usage: {},
      });

      const result = await service.getBillingOverview('team-123');

      expect(result.recentInvoices).toHaveLength(5);
    });
  });
});
