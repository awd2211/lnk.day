import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BillingNotification {
  type: 'payment_failed' | 'trial_ending' | 'subscription_canceled' | 'payment_success' | 'plan_changed';
  teamId: string;
  email: string;
  data: Record<string, any>;
}

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:60020',
    );
    const apiKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (!apiKey) {
      throw new Error('INTERNAL_API_KEY environment variable is required');
    }
    this.internalApiKey = apiKey;
  }

  // ========== Billing Email Notifications ==========

  async sendPaymentFailedEmail(
    email: string,
    data: { teamName: string; amount: string; currency: string; invoiceId: string; retryDate?: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: '付款失败通知 - lnk.day',
      template: 'payment-failed',
      data: {
        ...data,
        supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        billingUrl: `${this.configService.get('FRONTEND_URL')}/settings/billing`,
      },
    });
  }

  async sendTrialEndingEmail(
    email: string,
    data: { teamName: string; daysRemaining: number; planName: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `您的试用期即将结束（还剩 ${data.daysRemaining} 天）- lnk.day`,
      template: 'trial-ending',
      data: {
        ...data,
        upgradeUrl: `${this.configService.get('FRONTEND_URL')}/settings/billing/upgrade`,
      },
    });
  }

  async sendPaymentSuccessEmail(
    email: string,
    data: { teamName: string; amount: string; currency: string; invoiceId: string; planName: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: '付款成功 - lnk.day',
      template: 'payment-success',
      data: {
        ...data,
        invoiceUrl: `${this.configService.get('FRONTEND_URL')}/settings/billing/invoices/${data.invoiceId}`,
      },
    });
  }

  async sendSubscriptionCanceledEmail(
    email: string,
    data: { teamName: string; planName: string; endDate: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: '订阅已取消 - lnk.day',
      template: 'subscription-canceled',
      data: {
        ...data,
        reactivateUrl: `${this.configService.get('FRONTEND_URL')}/settings/billing`,
      },
    });
  }

  async sendPlanChangedEmail(
    email: string,
    data: { teamName: string; oldPlan: string; newPlan: string; effectiveDate: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `套餐已更改为 ${data.newPlan} - lnk.day`,
      template: 'plan-changed',
      data: {
        ...data,
        billingUrl: `${this.configService.get('FRONTEND_URL')}/settings/billing`,
      },
    });
  }

  // ========== Internal Email Sending ==========

  private async sendEmail(params: {
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.notificationServiceUrl}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Auth': this.internalApiKey,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        this.logger.error(`Failed to send email: ${response.status} ${response.statusText}`);
        return false;
      }

      this.logger.log(`Email sent successfully to ${params.to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error sending email: ${error.message}`);
      return false;
    }
  }

  // ========== Slack Notifications ==========

  async sendBillingSlackNotification(
    webhookUrl: string,
    notification: BillingNotification,
  ): Promise<boolean> {
    const messageMap: Record<BillingNotification['type'], { color: string; title: string }> = {
      payment_failed: { color: '#dc2626', title: '❌ 付款失败' },
      trial_ending: { color: '#f59e0b', title: '⏰ 试用期即将结束' },
      subscription_canceled: { color: '#6b7280', title: '🚫 订阅已取消' },
      payment_success: { color: '#16a34a', title: '✅ 付款成功' },
      plan_changed: { color: '#3b82f6', title: '🔄 套餐变更' },
    };

    const { color, title } = messageMap[notification.type];

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [
            {
              color,
              title,
              fields: Object.entries(notification.data).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              })),
              footer: 'lnk.day Billing',
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Error sending Slack notification: ${error.message}`);
      return false;
    }
  }

  // ========== Webhook Notifications ==========

  async sendBillingWebhook(
    webhookUrl: string,
    notification: BillingNotification,
  ): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lnk-Event': `billing.${notification.type}`,
        },
        body: JSON.stringify({
          event: `billing.${notification.type}`,
          timestamp: new Date().toISOString(),
          teamId: notification.teamId,
          data: notification.data,
        }),
      });

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Error sending webhook: ${error.message}`);
      return false;
    }
  }
}
