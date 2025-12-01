import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { BillingNotificationService, BillingNotification } from './billing-notification.service';

// Mock @lnk/nestjs-common
jest.mock('@lnk/nestjs-common', () => ({
  NotificationClientService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    sendSlackMessage: jest.fn().mockResolvedValue({ success: true }),
    sendWebhook: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

import { NotificationClientService } from '@lnk/nestjs-common';

describe('BillingNotificationService', () => {
  let service: BillingNotificationService;
  let notificationClient: any;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        FRONTEND_URL: 'https://app.lnk.day',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    notificationClient = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
      sendSlackMessage: jest.fn().mockResolvedValue({ success: true }),
      sendWebhook: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingNotificationService,
        {
          provide: NotificationClientService,
          useValue: notificationClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BillingNotificationService>(BillingNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(notificationClient.sendEmail).toHaveBeenCalledWith({
        to: ['user@example.com'],
        subject: '付款失败通知 - lnk.day',
        template: 'payment-failed',
        data: expect.objectContaining({
          teamName: 'Test Team',
          amount: '$99.00',
          supportUrl: 'https://app.lnk.day/support',
          billingUrl: 'https://app.lnk.day/settings/billing',
        }),
      });
    });

    it('should return false when notification client fails', async () => {
      notificationClient.sendEmail.mockResolvedValueOnce({ success: false });

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
      expect(notificationClient.sendEmail).toHaveBeenCalledWith({
        to: ['user@example.com'],
        subject: expect.stringContaining('3 天'),
        template: 'trial-ending',
        data: expect.objectContaining({
          teamName: 'Test Team',
          daysRemaining: 3,
          upgradeUrl: 'https://app.lnk.day/settings/billing/upgrade',
        }),
      });
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
      expect(notificationClient.sendEmail).toHaveBeenCalledWith({
        to: ['user@example.com'],
        subject: '付款成功 - lnk.day',
        template: 'payment-success',
        data: expect.objectContaining({
          teamName: 'Test Team',
          invoiceUrl: 'https://app.lnk.day/settings/billing/invoices/inv-123',
        }),
      });
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
      expect(notificationClient.sendEmail).toHaveBeenCalledWith({
        to: ['user@example.com'],
        subject: '订阅已取消 - lnk.day',
        template: 'subscription-canceled',
        data: expect.objectContaining({
          teamName: 'Test Team',
          reactivateUrl: 'https://app.lnk.day/settings/billing',
        }),
      });
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
      expect(notificationClient.sendEmail).toHaveBeenCalledWith({
        to: ['user@example.com'],
        subject: expect.stringContaining('Pro'),
        template: 'plan-changed',
        data: expect.objectContaining({
          teamName: 'Test Team',
          oldPlan: 'Free',
          newPlan: 'Pro',
          billingUrl: 'https://app.lnk.day/settings/billing',
        }),
      });
    });
  });

  describe('sendBillingSlackNotification', () => {
    const webhookUrl = 'https://hooks.slack.com/services/xxx/yyy/zzz';

    it('should send payment_failed Slack notification with red color', async () => {
      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);
      expect(notificationClient.sendSlackMessage).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: '#dc2626',
              title: '❌ 付款失败',
            }),
          ]),
        }),
      );
    });

    it('should send trial_ending Slack notification with orange color', async () => {
      const notification: BillingNotification = {
        type: 'trial_ending',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { daysRemaining: 3 },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);
      expect(notificationClient.sendSlackMessage).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: '#f59e0b',
              title: '⏰ 试用期即将结束',
            }),
          ]),
        }),
      );
    });

    it('should send subscription_canceled Slack notification with gray color', async () => {
      const notification: BillingNotification = {
        type: 'subscription_canceled',
        teamId: 'team-123',
        email: 'user@example.com',
        data: {},
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);
      expect(notificationClient.sendSlackMessage).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: '#6b7280',
              title: '🚫 订阅已取消',
            }),
          ]),
        }),
      );
    });

    it('should send payment_success Slack notification with green color', async () => {
      const notification: BillingNotification = {
        type: 'payment_success',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);
      expect(notificationClient.sendSlackMessage).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: '#16a34a',
              title: '✅ 付款成功',
            }),
          ]),
        }),
      );
    });

    it('should send plan_changed Slack notification with blue color', async () => {
      const notification: BillingNotification = {
        type: 'plan_changed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { oldPlan: 'Free', newPlan: 'Pro' },
      };

      const result = await service.sendBillingSlackNotification(webhookUrl, notification);

      expect(result).toBe(true);
      expect(notificationClient.sendSlackMessage).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: '#3b82f6',
              title: '🔄 套餐变更',
            }),
          ]),
        }),
      );
    });

    it('should include data fields in Slack message', async () => {
      const notification: BillingNotification = {
        type: 'payment_failed',
        teamId: 'team-123',
        email: 'user@example.com',
        data: { amount: '$99.00', invoiceId: 'inv-123' },
      };

      await service.sendBillingSlackNotification(webhookUrl, notification);

      const call = notificationClient.sendSlackMessage.mock.calls[0];
      const message = call[1];
      const fields = message.attachments[0].fields;

      expect(fields.length).toBe(2);
      expect(fields).toEqual(
        expect.arrayContaining([
          { title: 'amount', value: '$99.00', short: true },
          { title: 'invoiceId', value: 'inv-123', short: true },
        ]),
      );
    });

    it('should return false when Slack notification fails', async () => {
      notificationClient.sendSlackMessage.mockResolvedValueOnce({ success: false });

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
      expect(notificationClient.sendWebhook).toHaveBeenCalledWith({
        url: webhookUrl,
        method: 'POST',
        headers: {
          'X-Lnk-Event': 'billing.payment_failed',
        },
        payload: expect.objectContaining({
          event: 'billing.payment_failed',
          timestamp: expect.any(String),
          teamId: 'team-123',
          data: { amount: '$99.00' },
        }),
      });
    });

    it('should include correct event type for different notification types', async () => {
      const types: BillingNotification['type'][] = [
        'payment_failed',
        'trial_ending',
        'subscription_canceled',
        'payment_success',
        'plan_changed',
      ];

      for (const type of types) {
        const notification: BillingNotification = {
          type,
          teamId: 'team-123',
          email: 'user@example.com',
          data: {},
        };

        await service.sendBillingWebhook(webhookUrl, notification);

        const lastCall = notificationClient.sendWebhook.mock.calls.slice(-1)[0][0];
        expect(lastCall.headers['X-Lnk-Event']).toBe(`billing.${type}`);
        expect(lastCall.payload.event).toBe(`billing.${type}`);
      }
    });

    it('should return false when webhook fails', async () => {
      notificationClient.sendWebhook.mockResolvedValueOnce({ success: false });

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
