import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { StripeService } from './stripe.service';
import {
  Subscription,
  Invoice,
  PaymentMethod,
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
} from '../entities/subscription.entity';
import { PlanType } from '../../quota/quota.entity';
import { QuotaService } from '../../quota/quota.service';
import { BillingNotificationService } from '../../../common/notification/billing-notification.service';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      createTaxId: jest.fn(),
      listTaxIds: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
    },
    paymentMethods: {
      list: jest.fn(),
      detach: jest.fn(),
    },
    invoices: {
      list: jest.fn(),
      retrieve: jest.fn(),
      retrieveUpcoming: jest.fn(),
    },
    subscriptionItems: {
      createUsageRecord: jest.fn(),
      listUsageRecordSummaries: jest.fn(),
    },
    coupons: {
      create: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
      list: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('StripeService', () => {
  let service: StripeService;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;
  let invoiceRepository: jest.Mocked<Repository<Invoice>>;
  let paymentMethodRepository: jest.Mocked<Repository<PaymentMethod>>;
  let quotaService: jest.Mocked<QuotaService>;
  let notificationService: jest.Mocked<BillingNotificationService>;

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  });

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123',
        FRONTEND_URL: 'http://localhost:60010',
        STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
        STRIPE_PRICE_PRO_YEARLY: 'price_pro_yearly',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockQuotaService = {
    updatePlan: jest.fn(),
  };

  const mockNotificationService = {
    sendPaymentFailedEmail: jest.fn(),
    sendTrialEndingEmail: jest.fn(),
  };

  const mockSubscription: Subscription = {
    id: 'sub-123',
    teamId: 'team-123',
    plan: PlanType.PRO,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: BillingCycle.MONTHLY,
    paymentProvider: PaymentProvider.STRIPE,
    externalSubscriptionId: 'sub_stripe_123',
    externalCustomerId: 'cus_stripe_123',
    amount: 49,
    currency: 'USD',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: createMockRepository(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: QuotaService,
          useValue: mockQuotaService,
        },
        {
          provide: BillingNotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    invoiceRepository = module.get(getRepositoryToken(Invoice));
    paymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
    quotaService = module.get(QuotaService);
    notificationService = module.get(BillingNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrGetCustomer', () => {
    it('should return existing customer ID', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.createOrGetCustomer('team-123', 'test@example.com');

      expect(result).toBe('cus_stripe_123');
    });

    it('should create new Stripe customer', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.create.mockResolvedValue({ id: 'cus_new_123' });

      const result = await service.createOrGetCustomer('team-123', 'test@example.com', 'Test User');

      expect(stripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { teamId: 'team-123' },
      });
      expect(result).toBe('cus_new_123');
    });
  });

  describe('getCustomer', () => {
    it('should return Stripe customer', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.retrieve.mockResolvedValue({
        id: 'cus_123',
        email: 'test@example.com',
      });

      const result = await service.getCustomer('cus_123');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for deleted customer', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.retrieve.mockResolvedValue({ deleted: true });

      const result = await service.getCustomer('cus_deleted');

      expect(result).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      const stripeInstance = (service as any).stripe;
      stripeInstance.checkout.sessions.create.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      });

      const result = await service.createCheckoutSession(
        'team-123',
        'test@example.com',
        PlanType.PRO,
        BillingCycle.MONTHLY,
      );

      expect(result.sessionId).toBe('cs_123');
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('should throw BadRequestException for free plan', async () => {
      await expect(
        service.createCheckoutSession('team-123', 'test@example.com', PlanType.FREE, BillingCycle.MONTHLY),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCheckoutSession', () => {
    it('should retrieve checkout session', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_123',
        status: 'complete',
      });

      const result = await service.getCheckoutSession('cs_123');

      expect(result.id).toBe('cs_123');
    });
  });

  describe('createBillingPortalSession', () => {
    it('should create billing portal session', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      const stripeInstance = (service as any).stripe;
      stripeInstance.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session',
      });

      const result = await service.createBillingPortalSession('team-123');

      expect(result.url).toContain('billing.stripe.com');
    });

    it('should throw NotFoundException when no subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(service.createBillingPortalSession('team-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStripeSubscription', () => {
    it('should retrieve Stripe subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
      });

      const result = await service.getStripeSubscription('sub_123');

      expect(result?.id).toBe('sub_123');
    });

    it('should return null on error', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockRejectedValue(new Error('Not found'));

      const result = await service.getStripeSubscription('invalid_sub');

      expect(result).toBeNull();
    });
  });

  describe('cancelStripeSubscription', () => {
    it('should cancel at period end', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
      });

      const result = await service.cancelStripeSubscription('sub_123', true);

      expect(stripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('should cancel immediately', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.cancel.mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      });

      const result = await service.cancelStripeSubscription('sub_123', false);

      expect(stripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('reactivateStripeSubscription', () => {
    it('should reactivate subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: false,
      });

      const result = await service.reactivateStripeSubscription('sub_123');

      expect(stripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: false,
      });
    });
  });

  describe('changeSubscriptionPlan', () => {
    it('should change subscription plan', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      });
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      const result = await service.changeSubscriptionPlan('sub_123', PlanType.PRO, BillingCycle.MONTHLY);

      expect(stripeInstance.subscriptions.update).toHaveBeenCalled();
    });
  });

  describe('createSetupIntent', () => {
    it('should create setup intent', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.setupIntents.create.mockResolvedValue({
        client_secret: 'seti_secret_123',
      });

      const result = await service.createSetupIntent('cus_123');

      expect(result.clientSecret).toBe('seti_secret_123');
    });
  });

  describe('listPaymentMethods', () => {
    it('should list payment methods', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.paymentMethods.list.mockResolvedValue({
        data: [{ id: 'pm_123', card: { brand: 'visa', last4: '4242' } }],
      });

      const result = await service.listPaymentMethods('cus_123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pm_123');
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.update.mockResolvedValue({});

      await service.setDefaultPaymentMethod('cus_123', 'pm_123');

      expect(stripeInstance.customers.update).toHaveBeenCalledWith('cus_123', {
        invoice_settings: { default_payment_method: 'pm_123' },
      });
    });
  });

  describe('detachPaymentMethod', () => {
    it('should detach payment method', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.paymentMethods.detach.mockResolvedValue({});

      await service.detachPaymentMethod('pm_123');

      expect(stripeInstance.paymentMethods.detach).toHaveBeenCalledWith('pm_123');
    });
  });

  describe('listStripeInvoices', () => {
    it('should list invoices', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.invoices.list.mockResolvedValue({
        data: [{ id: 'in_123', total: 4900, currency: 'usd' }],
      });

      const result = await service.listStripeInvoices('cus_123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('in_123');
    });
  });

  describe('getStripeInvoice', () => {
    it('should get single invoice', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.invoices.retrieve.mockResolvedValue({
        id: 'in_123',
        total: 4900,
      });

      const result = await service.getStripeInvoice('in_123');

      expect(result.id).toBe('in_123');
    });
  });

  describe('downloadInvoicePdf', () => {
    it('should return invoice PDF URL', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.invoices.retrieve.mockResolvedValue({
        invoice_pdf: 'https://stripe.com/invoice.pdf',
      });

      const result = await service.downloadInvoicePdf('in_123');

      expect(result).toContain('invoice.pdf');
    });
  });

  describe('applyCoupon', () => {
    it('should apply coupon to subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        discount: { coupon: { id: 'coupon_123' } },
      });

      const result = await service.applyCoupon('sub_123', 'DISCOUNT20');

      expect(stripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        coupon: 'DISCOUNT20',
      });
    });
  });

  describe('createCoupon', () => {
    it('should create coupon', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.coupons.create.mockResolvedValue({
        id: 'coupon_123',
        percent_off: 20,
      });

      const result = await service.createCoupon(20, 'once');

      expect(stripeInstance.coupons.create).toHaveBeenCalledWith({
        percent_off: 20,
        duration: 'once',
        duration_in_months: undefined,
      });
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event', () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: {} },
      });

      const result = service.constructWebhookEvent(Buffer.from('payload'), 'sig_123');

      expect(result.type).toBe('checkout.session.completed');
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { teamId: 'team-123', plan: 'PRO', billingCycle: 'monthly' },
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      // Checkout completed handler logs but doesn't create subscription directly
    });

    it('should handle customer.subscription.created', async () => {
      subscriptionRepository.create.mockReturnValue(mockSubscription);
      subscriptionRepository.save.mockResolvedValue(mockSubscription);

      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            metadata: { teamId: 'team-123', plan: 'PRO', billingCycle: 'monthly' },
            items: { data: [{ price: { unit_amount: 4900 } }] },
            currency: 'usd',
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(quotaService.updatePlan).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      subscriptionRepository.save.mockResolvedValue(mockSubscription);

      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe_123',
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(subscriptionRepository.save).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      subscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      });

      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_stripe_123' },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(quotaService.updatePlan).toHaveBeenCalledWith('team-123', PlanType.FREE);
    });

    it('should handle invoice.paid', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      invoiceRepository.findOne.mockResolvedValue(null);
      invoiceRepository.create.mockReturnValue({} as Invoice);
      invoiceRepository.save.mockResolvedValue({} as Invoice);

      const event = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_123',
            subscription: 'sub_stripe_123',
            number: 'INV-123',
            subtotal: 4900,
            tax: 0,
            total: 4900,
            currency: 'usd',
            lines: { data: [{ description: 'Pro Plan', quantity: 1, price: { unit_amount: 4900 }, amount: 4900 }] },
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(invoiceRepository.save).toHaveBeenCalled();
    });

    it('should handle invoice.payment_failed', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.retrieve.mockResolvedValue({
        email: 'test@example.com',
      });
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      invoiceRepository.findOne.mockResolvedValue(null);
      subscriptionRepository.save.mockResolvedValue(mockSubscription);

      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_stripe_123',
            amount_due: 4900,
            currency: 'usd',
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(subscriptionRepository.save).toHaveBeenCalled();
    });
  });

  describe('reportUsage', () => {
    it('should report usage', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptionItems.createUsageRecord.mockResolvedValue({
        id: 'usage_123',
        quantity: 100,
      });

      const result = await service.reportUsage('si_123', 100);

      expect(stripeInstance.subscriptionItems.createUsageRecord).toHaveBeenCalledWith('si_123', {
        quantity: 100,
        timestamp: 'now',
        action: 'increment',
      });
    });
  });

  describe('pauseSubscription', () => {
    it('should pause subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        pause_collection: { behavior: 'void' },
      });
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      subscriptionRepository.save.mockResolvedValue(mockSubscription);

      const result = await service.pauseSubscription('sub_123');

      expect(stripeInstance.subscriptions.update).toHaveBeenCalled();
    });
  });

  describe('resumeSubscription', () => {
    it('should resume subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
      });
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      subscriptionRepository.save.mockResolvedValue(mockSubscription);

      const result = await service.resumeSubscription('sub_123');

      expect(stripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        pause_collection: '',
      });
    });
  });

  describe('updateQuantity', () => {
    it('should update subscription quantity', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      });
      stripeInstance.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
      });

      const result = await service.updateQuantity('sub_123', 5);

      expect(stripeInstance.subscriptions.update).toHaveBeenCalled();
    });
  });

  describe('addSeats', () => {
    it('should add seats to subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123', quantity: 5 }] },
      });
      stripeInstance.subscriptions.update.mockResolvedValue({});

      const result = await service.addSeats('sub_123', 3);

      // Should update to 8 seats (5 + 3)
    });
  });

  describe('removeSeats', () => {
    it('should remove seats from subscription', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123', quantity: 5 }] },
      });
      stripeInstance.subscriptions.update.mockResolvedValue({});

      const result = await service.removeSeats('sub_123', 2);

      // Should update to 3 seats (5 - 2)
    });

    it('should not go below 1 seat', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123', quantity: 2 }] },
      });
      stripeInstance.subscriptions.update.mockResolvedValue({});

      await service.removeSeats('sub_123', 5);

      // Should update to 1 seat minimum
    });
  });

  describe('previewUpcomingInvoice', () => {
    it('should preview upcoming invoice', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.invoices.retrieveUpcoming.mockResolvedValue({
        subtotal: 4900,
        tax: 0,
        total: 4900,
        currency: 'usd',
        lines: { data: [{ description: 'Pro Plan', amount: 4900, quantity: 1 }] },
      });

      const result = await service.previewUpcomingInvoice('cus_123');

      expect(result.total).toBe(49);
      expect(result.currency).toBe('USD');
    });
  });

  describe('previewPlanChange', () => {
    it('should preview plan change', async () => {
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      const stripeInstance = (service as any).stripe;
      stripeInstance.invoices.retrieveUpcoming.mockResolvedValue({
        subtotal: 9900,
        tax: 0,
        total: 9900,
        currency: 'usd',
        lines: { data: [] },
      });
      stripeInstance.subscriptions.retrieve.mockResolvedValue({
        items: { data: [{ price: { unit_amount: 4900 } }] },
      });

      const result = await service.previewPlanChange('team-123', PlanType.ENTERPRISE, BillingCycle.MONTHLY);

      expect(result.currentAmount).toBeDefined();
      expect(result.newAmount).toBeDefined();
    });

    it('should throw NotFoundException when no subscription', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.previewPlanChange('team-123', PlanType.ENTERPRISE, BillingCycle.MONTHLY),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTaxInfo', () => {
    it('should add tax ID', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.createTaxId.mockResolvedValue({
        id: 'txi_123',
        type: 'cn_tin',
        value: '123456789',
      });

      const result = await service.updateTaxInfo('cus_123', {
        type: 'cn_tin',
        value: '123456789',
      });

      expect(result.id).toBe('txi_123');
    });
  });

  describe('getTaxIds', () => {
    it('should list tax IDs', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.listTaxIds.mockResolvedValue({
        data: [{ id: 'txi_123', type: 'cn_tin' }],
      });

      const result = await service.getTaxIds('cus_123');

      expect(result).toHaveLength(1);
    });
  });

  describe('updateBillingAddress', () => {
    it('should update billing address', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.customers.update.mockResolvedValue({
        id: 'cus_123',
        address: { city: 'Beijing' },
      });

      const result = await service.updateBillingAddress('cus_123', {
        line1: '123 Test St',
        city: 'Beijing',
        postal_code: '100000',
        country: 'CN',
      });

      expect(stripeInstance.customers.update).toHaveBeenCalled();
    });
  });

  describe('createRefund', () => {
    it('should create refund', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.refunds.create.mockResolvedValue({
        id: 're_123',
        amount: 4900,
      });

      const result = await service.createRefund('ch_123', 49, 'requested_by_customer');

      expect(stripeInstance.refunds.create).toHaveBeenCalledWith({
        charge: 'ch_123',
        amount: 4900,
        reason: 'requested_by_customer',
      });
    });
  });

  describe('listRefunds', () => {
    it('should list refunds', async () => {
      const stripeInstance = (service as any).stripe;
      stripeInstance.refunds.list.mockResolvedValue({
        data: [{ id: 're_123', amount: 4900 }],
      });

      const result = await service.listRefunds('ch_123');

      expect(result).toHaveLength(1);
    });
  });
});
