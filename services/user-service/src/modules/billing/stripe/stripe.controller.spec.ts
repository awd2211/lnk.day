import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { BillingCycle } from '../entities/subscription.entity';
import { PlanType } from '../../quota/quota.entity';

describe('StripeController', () => {
  let controller: StripeController;
  let stripeService: jest.Mocked<StripeService>;

  const mockStripeService = {
    createCheckoutSession: jest.fn(),
    getCheckoutSession: jest.fn(),
    createBillingPortalSession: jest.fn(),
    createOrGetCustomer: jest.fn(),
    createSetupIntent: jest.fn(),
    listPaymentMethods: jest.fn(),
    setDefaultPaymentMethod: jest.fn(),
    listStripeInvoices: jest.fn(),
    downloadInvoicePdf: jest.fn(),
    constructWebhookEvent: jest.fn(),
    handleWebhookEvent: jest.fn(),
  };

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
    type: 'user',
    scope: { level: 'personal', teamId: 'team-123' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<StripeController>(StripeController);
    stripeService = module.get(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckout', () => {
    it('should create checkout session', async () => {
      mockStripeService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      });

      const result = await controller.createCheckout(
        { plan: PlanType.PRO, billingCycle: BillingCycle.MONTHLY },
        mockUser as any,
      );

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        'team-123',
        'test@example.com',
        PlanType.PRO,
        BillingCycle.MONTHLY,
      );
      expect(result.sessionId).toBe('cs_123');
    });

    it('should use user sub as teamId when no scope', async () => {
      const userWithoutScope = { ...mockUser, scope: undefined };
      mockStripeService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/cs_123',
      });

      await controller.createCheckout(
        { plan: PlanType.PRO, billingCycle: BillingCycle.MONTHLY },
        userWithoutScope as any,
      );

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
        PlanType.PRO,
        BillingCycle.MONTHLY,
      );
    });
  });

  describe('getCheckoutSession', () => {
    it('should get checkout session status', async () => {
      mockStripeService.getCheckoutSession.mockResolvedValue({
        id: 'cs_123',
        status: 'complete',
        payment_status: 'paid',
        customer_email: 'test@example.com',
      });

      const result = await controller.getCheckoutSession('cs_123');

      expect(stripeService.getCheckoutSession).toHaveBeenCalledWith('cs_123');
      expect(result.id).toBe('cs_123');
      expect(result.status).toBe('complete');
    });
  });

  describe('createPortalSession', () => {
    it('should create billing portal session', async () => {
      mockStripeService.createBillingPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/session',
      });

      const result = await controller.createPortalSession(mockUser as any);

      expect(stripeService.createBillingPortalSession).toHaveBeenCalledWith('team-123');
      expect(result.url).toContain('billing.stripe.com');
    });
  });

  describe('cancelSubscription', () => {
    it('should return redirect message', async () => {
      const result = await controller.cancelSubscription({ cancelAtPeriodEnd: true }, mockUser as any);

      expect(result.message).toContain('账单门户');
    });
  });

  describe('reactivateSubscription', () => {
    it('should return redirect message', async () => {
      const result = await controller.reactivateSubscription(mockUser as any);

      expect(result.message).toContain('账单门户');
    });
  });

  describe('changePlan', () => {
    it('should return redirect message', async () => {
      const result = await controller.changePlan(
        { plan: PlanType.ENTERPRISE, billingCycle: BillingCycle.YEARLY },
        mockUser as any,
      );

      expect(result.message).toContain('账单门户');
    });
  });

  describe('createSetupIntent', () => {
    it('should create setup intent', async () => {
      mockStripeService.createOrGetCustomer.mockResolvedValue('cus_123');
      mockStripeService.createSetupIntent.mockResolvedValue({
        clientSecret: 'seti_secret_123',
      });

      const result = await controller.createSetupIntent(mockUser as any);

      expect(stripeService.createOrGetCustomer).toHaveBeenCalledWith('team-123', 'test@example.com');
      expect(stripeService.createSetupIntent).toHaveBeenCalledWith('cus_123');
      expect(result.clientSecret).toBe('seti_secret_123');
    });
  });

  describe('listPaymentMethods', () => {
    it('should list payment methods', async () => {
      mockStripeService.createOrGetCustomer.mockResolvedValue('cus_123');
      mockStripeService.listPaymentMethods.mockResolvedValue([
        {
          id: 'pm_123',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 },
        },
      ]);

      const result = await controller.listPaymentMethods(mockUser as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pm_123');
      expect(result[0].brand).toBe('visa');
      expect(result[0].last4).toBe('4242');
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method', async () => {
      mockStripeService.createOrGetCustomer.mockResolvedValue('cus_123');
      mockStripeService.setDefaultPaymentMethod.mockResolvedValue(undefined);

      const result = await controller.setDefaultPaymentMethod('pm_123', mockUser as any);

      expect(stripeService.setDefaultPaymentMethod).toHaveBeenCalledWith('cus_123', 'pm_123');
      expect(result.success).toBe(true);
    });
  });

  describe('listInvoices', () => {
    it('should list invoices', async () => {
      mockStripeService.createOrGetCustomer.mockResolvedValue('cus_123');
      mockStripeService.listStripeInvoices.mockResolvedValue([
        {
          id: 'in_123',
          number: 'INV-123',
          total: 4900,
          currency: 'usd',
          status: 'paid',
          status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
          invoice_pdf: 'https://stripe.com/invoice.pdf',
          created: Math.floor(Date.now() / 1000),
        },
      ]);

      const result = await controller.listInvoices(10, mockUser as any);

      expect(stripeService.listStripeInvoices).toHaveBeenCalledWith('cus_123', 10);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('in_123');
      expect(result[0].amount).toBe(49);
    });

    it('should use default limit', async () => {
      mockStripeService.createOrGetCustomer.mockResolvedValue('cus_123');
      mockStripeService.listStripeInvoices.mockResolvedValue([]);

      await controller.listInvoices(undefined as any, mockUser as any);

      // Default limit should be used
    });
  });

  describe('getInvoicePdf', () => {
    it('should return invoice PDF URL', async () => {
      mockStripeService.downloadInvoicePdf.mockResolvedValue('https://stripe.com/invoice.pdf');

      const result = await controller.getInvoicePdf('in_123');

      expect(stripeService.downloadInvoicePdf).toHaveBeenCalledWith('in_123');
      expect(result.url).toContain('invoice.pdf');
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook event', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: { object: {} },
      };
      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent as any);
      mockStripeService.handleWebhookEvent.mockResolvedValue(undefined);

      const mockReq = {
        rawBody: Buffer.from('payload'),
      };

      const result = await controller.handleWebhook('sig_123', mockReq as any);

      expect(stripeService.constructWebhookEvent).toHaveBeenCalledWith(Buffer.from('payload'), 'sig_123');
      expect(stripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent);
      expect(result.received).toBe(true);
    });

    it('should throw BadRequestException for missing signature', async () => {
      const mockReq = { rawBody: Buffer.from('payload') };

      await expect(controller.handleWebhook('', mockReq as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing raw body', async () => {
      const mockReq = { rawBody: undefined };

      await expect(controller.handleWebhook('sig_123', mockReq as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on webhook error', async () => {
      mockStripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const mockReq = { rawBody: Buffer.from('payload') };

      await expect(controller.handleWebhook('sig_123', mockReq as any)).rejects.toThrow(BadRequestException);
    });
  });
});
