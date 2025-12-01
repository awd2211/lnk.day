import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { NotificationClientService, BillingNotification } from './notification-client.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NotificationClientService', () => {
  let service: NotificationClientService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        NOTIFICATION_SERVICE_URL: 'http://localhost:60020',
        INTERNAL_API_KEY: 'test-api-key',
        FRONTEND_URL: 'https://app.lnk.day',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationClientService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationClientService>(NotificationClientService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if INTERNAL_API_KEY is missing', async () => {
      const noApiKeyConfig = {
        get: jest.fn((key: string) => {
          if (key === 'INTERNAL_API_KEY') return undefined;
          return 'test-value';
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            NotificationClientService,
            {
              provide: ConfigService,
              useValue: noApiKeyConfig,
            },
          ],
        }).compile(),
      ).rejects.toThrow('INTERNAL_API_KEY environment variable is required');
    });
  });

  describe('sendPaymentFailedEmail', () => {
    const emailData = {
      teamName: 'Test Team',
      amount: '$99.00',
      currency: 'USD',
      invoiceId: 'inv-123',
      retryDate: '2024-01-15',
    };

    it('should send payment failed email successfully', async () => {
      const result = await service.sendPaymentFailedEmail('user@example.com', emailData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:60020/email/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Internal-Auth': 'test-api-key',
          }),
        }),
      );
    });

    it('should return false when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const result = await service.sendPaymentFailedEmail('user@example.com', emailData);

      expect(result).toBe(false);
    });

    it('should return false when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendPaymentFailedEmail('user@example.com', emailData);

      expect(result).toBe(false);
    });
  });

  describe('sendTrialEndingEmail', () => {
    const emailData = {
      teamName: 'Test Team',
      daysRemaining: 3,
      planName: 'Pro',
    };

    it('should send trial ending email successfully', async () => {
      const result = await service.sendTrialEndingEmail('user@example.com', emailData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.template).toBe('trial-ending');
      expect(callBody.to).toBe('user@example.com');
    });

    it('should include correct subject with days remaining', async () => {
      await service.sendTrialEndingEmail('user@example.com', emailData);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.subject).toContain('3 天');
    });
  });

  describe('sendPaymentSuccessEmail', () => {
    const emailData = {
      teamName: 'Test Team',
      amount: '$99.00',
      currency: 'USD',
      invoiceId: 'inv-123',
      planName: 'Pro',
    };

    it('should send payment success email successfully', async () => {
      const result = await service.sendPaymentSuccessEmail('user@example.com', emailData);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.template).toBe('payment-success');
      expect(callBody.data.invoiceUrl).toContain('invoices/inv-123');
    });
  });

  describe('sendSubscriptionCanceledEmail', () => {
    const emailData = {
      teamName: 'Test Team',
      planName: 'Pro',
      endDate: '2024-02-01',
    };

    it('should send subscription canceled email successfully', async () => {
      const result = await service.sendSubscriptionCanceledEmail('user@example.com', emailData);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.template).toBe('subscription-canceled');
      expect(callBody.data.reactivateUrl).toBeDefined();
    });
  });

  describe('sendPlanChangedEmail', () => {
    const emailData = {
      teamName: 'Test Team',
      oldPlan: 'Free',
      newPlan: 'Pro',
      effectiveDate: '2024-01-15',
    };

    it('should send plan changed email successfully', async () => {
      const result = await service.sendPlanChangedEmail('user@example.com', emailData);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.template).toBe('plan-changed');
      expect(callBody.subject).toContain('Pro');
    });
  });

  describe('sendBillingSlackNotification', () => {
    const webhookUrl = 'https://hooks.slack.com/services/xxx/yyy/zzz';

    it('should send payment_failed Slack notification', async () => {
      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00', invoiceId: 'inv-123' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(webhookUrl, expect.any(Object));

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.attachments[0].color).toBe('#dc2626');
      expect(callBody.attachments[0].title).toContain('付款失败');
    });

    it('should send trial_ending Slack notification', async () => {
      const notification: BillingNotification = {
        type: 'trial_ending',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { daysRemaining: 3 },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.attachments[0].color).toBe('#f59e0b');
      expect(callBody.attachments[0].title).toContain('试用期即将结束');
    });

    it('should send subscription_canceled Slack notification', async () => {
      const notification: BillingNotification = {
        type: 'subscription_canceled',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { planName: 'Pro' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.attachments[0].color).toBe('#6b7280');
    });

    it('should send payment_success Slack notification', async () => {
      const notification: BillingNotification = {
        type: 'payment_success',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.attachments[0].color).toBe('#16a34a');
    });

    it('should send plan_changed Slack notification', async () => {
      const notification: BillingNotification = {
        type: 'plan_changed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { oldPlan: 'Free', newPlan: 'Pro' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.attachments[0].color).toBe('#3b82f6');
    });

    it('should include data fields in Slack message', async () => {
      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00', invoiceId: 'inv-123' },
      };

      await service.sendBillingSlackNotification(webhookUrl, notification);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const fields = callBody.attachments[0].fields;

      expect(fields.length).toBe(2);
      expect(fields.find((f: any) => f.title === 'amount').value).toBe('$99.00');
      expect(fields.find((f: any) => f.title === 'invoiceId').value).toBe('inv-123');
    });

    it('should return false when Slack webhook fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: {},
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(false);
    });

    it('should return false when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: {},
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(false);
    });
  });

  describe('sendBillingWebhook', () => {
    const webhookUrl = 'https://example.com/webhook';

    it('should send billing webhook successfully', async () => {
      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00' },
      };

      const result = await service.sendBillingWebhook(webhookUrl, notification);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Lnk-Event': 'billing.payment_failed',
          }),
        }),
      );
    });

    it('should include event type and timestamp in payload', async () => {
      const notification: BillingNotification = {
        type: 'trial_ending',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { daysRemaining: 3 },
      };

      await service.sendBillingWebhook(webhookUrl, notification);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.event).toBe('billing.trial_ending');
      expect(callBody.timestamp).toBeDefined();
      expect(callBody.teamId).toBe('team-123');
      expect(callBody.data.daysRemaining).toBe(3);
    });

    it('should return false when webhook fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: {},
      };

      const result = await service.sendBillingWebhook(webhookUrl, notification);

      expect(result).toBe(false);
    });

    it('should return false when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: {},
      };

      const result = await service.sendBillingWebhook(webhookUrl, notification);

      expect(result).toBe(false);
    });
  });
});
