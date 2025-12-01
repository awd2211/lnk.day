import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import {
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
} from './entities/subscription.entity';
import { PlanType } from '../quota/quota.entity';

describe('BillingController', () => {
  let controller: BillingController;
  let billingService: jest.Mocked<BillingService>;

  const mockBillingService = {
    getPricing: jest.fn(),
    getSubscription: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
    getInvoices: jest.fn(),
    getInvoice: jest.fn(),
    getPaymentMethods: jest.fn(),
    addPaymentMethod: jest.fn(),
    removePaymentMethod: jest.fn(),
    setDefaultPaymentMethod: jest.fn(),
    getBillingOverview: jest.fn(),
  };

  const mockSubscription = {
    id: 'sub-123',
    teamId: 'team-123',
    plan: PlanType.PRO,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: BillingCycle.MONTHLY,
    amount: 49,
    currency: 'USD',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice = {
    id: 'inv-123',
    teamId: 'team-123',
    invoiceNumber: 'INV-123',
    total: 49,
    currency: 'USD',
    status: 'paid',
    dueDate: new Date(),
    paidAt: new Date(),
    createdAt: new Date(),
  };

  const mockPaymentMethod = {
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
  };

  const mockPricing = [
    {
      plan: PlanType.FREE,
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: ['25 links'],
      limits: { maxLinks: 25 },
    },
    {
      plan: PlanType.PRO,
      name: 'Pro',
      monthlyPrice: 49,
      yearlyPrice: 490,
      features: ['5000 links'],
      limits: { maxLinks: 5000 },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<BillingController>(BillingController);
    billingService = module.get(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPricing', () => {
    it('should return pricing information', () => {
      mockBillingService.getPricing.mockReturnValue(mockPricing);

      const result = controller.getPricing();

      expect(billingService.getPricing).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].plan).toBe(PlanType.FREE);
    });
  });

  describe('getSubscription', () => {
    it('should return current subscription', async () => {
      mockBillingService.getSubscription.mockResolvedValue(mockSubscription);

      const result = await controller.getSubscription('team-123');

      expect(billingService.getSubscription).toHaveBeenCalledWith('team-123');
      expect(result.plan).toBe(PlanType.PRO);
    });

    it('should return null if no subscription', async () => {
      mockBillingService.getSubscription.mockResolvedValue(null);

      const result = await controller.getSubscription('team-123');

      expect(result).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('should create subscription', async () => {
      mockBillingService.createSubscription.mockResolvedValue(mockSubscription);

      const result = await controller.createSubscription('team-123', {
        plan: PlanType.PRO,
        billingCycle: BillingCycle.MONTHLY,
        paymentProvider: PaymentProvider.STRIPE,
      });

      expect(billingService.createSubscription).toHaveBeenCalledWith('team-123', {
        plan: PlanType.PRO,
        billingCycle: BillingCycle.MONTHLY,
        paymentProvider: PaymentProvider.STRIPE,
      });
      expect(result.plan).toBe(PlanType.PRO);
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription', async () => {
      const updatedSubscription = { ...mockSubscription, plan: PlanType.ENTERPRISE };
      mockBillingService.updateSubscription.mockResolvedValue(updatedSubscription);

      const result = await controller.updateSubscription('team-123', {
        plan: PlanType.ENTERPRISE,
      });

      expect(billingService.updateSubscription).toHaveBeenCalledWith('team-123', {
        plan: PlanType.ENTERPRISE,
      });
      expect(result.plan).toBe(PlanType.ENTERPRISE);
    });

    it('should update billing cycle', async () => {
      const updatedSubscription = {
        ...mockSubscription,
        billingCycle: BillingCycle.YEARLY,
        amount: 490,
      };
      mockBillingService.updateSubscription.mockResolvedValue(updatedSubscription);

      const result = await controller.updateSubscription('team-123', {
        billingCycle: BillingCycle.YEARLY,
      });

      expect(result.billingCycle).toBe(BillingCycle.YEARLY);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const canceledSubscription = { ...mockSubscription, cancelAtPeriodEnd: true };
      mockBillingService.cancelSubscription.mockResolvedValue(canceledSubscription);

      const result = await controller.cancelSubscription('team-123', {
        cancelAtPeriodEnd: true,
      });

      expect(billingService.cancelSubscription).toHaveBeenCalledWith('team-123', {
        cancelAtPeriodEnd: true,
      });
      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      };
      mockBillingService.cancelSubscription.mockResolvedValue(canceledSubscription);

      const result = await controller.cancelSubscription('team-123', {
        cancelAtPeriodEnd: false,
      });

      expect(result.status).toBe(SubscriptionStatus.CANCELED);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription', async () => {
      const reactivatedSubscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: false,
        status: SubscriptionStatus.ACTIVE,
      };
      mockBillingService.reactivateSubscription.mockResolvedValue(reactivatedSubscription);

      const result = await controller.reactivateSubscription('team-123');

      expect(billingService.reactivateSubscription).toHaveBeenCalledWith('team-123');
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe('getInvoices', () => {
    it('should return invoices', async () => {
      mockBillingService.getInvoices.mockResolvedValue([mockInvoice]);

      const result = await controller.getInvoices('team-123');

      expect(billingService.getInvoices).toHaveBeenCalledWith('team-123');
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no invoices', async () => {
      mockBillingService.getInvoices.mockResolvedValue([]);

      const result = await controller.getInvoices('team-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getInvoice', () => {
    it('should return single invoice', async () => {
      mockBillingService.getInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.getInvoice('inv-123');

      expect(billingService.getInvoice).toHaveBeenCalledWith('inv-123');
      expect(result.id).toBe('inv-123');
    });
  });

  describe('getPaymentMethods', () => {
    it('should return payment methods', async () => {
      mockBillingService.getPaymentMethods.mockResolvedValue([mockPaymentMethod]);

      const result = await controller.getPaymentMethods('team-123');

      expect(billingService.getPaymentMethods).toHaveBeenCalledWith('team-123');
      expect(result).toHaveLength(1);
      expect(result[0].last4).toBe('4242');
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method', async () => {
      mockBillingService.addPaymentMethod.mockResolvedValue(mockPaymentMethod);

      const result = await controller.addPaymentMethod('team-123', {
        provider: PaymentProvider.STRIPE,
        token: 'tok_123',
      });

      expect(billingService.addPaymentMethod).toHaveBeenCalledWith('team-123', {
        provider: PaymentProvider.STRIPE,
        token: 'tok_123',
      });
      expect(result.provider).toBe(PaymentProvider.STRIPE);
    });

    it('should add payment method as default', async () => {
      const defaultPaymentMethod = { ...mockPaymentMethod, isDefault: true };
      mockBillingService.addPaymentMethod.mockResolvedValue(defaultPaymentMethod);

      const result = await controller.addPaymentMethod('team-123', {
        provider: PaymentProvider.STRIPE,
        token: 'tok_123',
        setAsDefault: true,
      });

      expect(result.isDefault).toBe(true);
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove payment method', async () => {
      mockBillingService.removePaymentMethod.mockResolvedValue(undefined);

      await controller.removePaymentMethod('team-123', 'pm-123');

      expect(billingService.removePaymentMethod).toHaveBeenCalledWith('team-123', 'pm-123');
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default', async () => {
      const defaultPaymentMethod = { ...mockPaymentMethod, isDefault: true };
      mockBillingService.setDefaultPaymentMethod.mockResolvedValue(defaultPaymentMethod);

      const result = await controller.setDefaultPaymentMethod('team-123', 'pm-123');

      expect(billingService.setDefaultPaymentMethod).toHaveBeenCalledWith('team-123', 'pm-123');
      expect(result.isDefault).toBe(true);
    });
  });

  describe('getBillingOverview', () => {
    it('should return billing overview', async () => {
      const overview = {
        subscription: mockSubscription,
        paymentMethods: [mockPaymentMethod],
        recentInvoices: [mockInvoice],
        usage: { quota: {}, limits: {}, usage: {} },
      };
      mockBillingService.getBillingOverview.mockResolvedValue(overview);

      const result = await controller.getBillingOverview('team-123');

      expect(billingService.getBillingOverview).toHaveBeenCalledWith('team-123');
      expect(result.subscription).toBeDefined();
      expect(result.paymentMethods).toHaveLength(1);
      expect(result.recentInvoices).toHaveLength(1);
    });
  });
});
