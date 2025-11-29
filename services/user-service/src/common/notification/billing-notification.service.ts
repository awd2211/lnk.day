import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationClientService,
  SlackMessage,
} from '@lnk/nestjs-common';

export interface BillingNotification {
  type: 'payment_failed' | 'trial_ending' | 'subscription_canceled' | 'payment_success' | 'plan_changed';
  teamId: string;
  email: string;
  data: Record<string, any>;
}

@Injectable()
export class BillingNotificationService {
  private readonly logger = new Logger(BillingNotificationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly notificationClient: NotificationClientService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://app.lnk.day');
  }

  // ========== Billing Email Notifications ==========

  async sendPaymentFailedEmail(
    email: string,
    data: { teamName: string; amount: string; currency: string; invoiceId: string; retryDate?: string },
  ): Promise<boolean> {
    const result = await this.notificationClient.sendEmail({
      to: [email],
      subject: '付款失败通知 - lnk.day',
      template: 'payment-failed',
      data: {
        ...data,
        supportUrl: `${this.frontendUrl}/support`,
        billingUrl: `${this.frontendUrl}/settings/billing`,
      },
    });
    return result.success;
  }

  async sendTrialEndingEmail(
    email: string,
    data: { teamName: string; daysRemaining: number; planName: string },
  ): Promise<boolean> {
    const result = await this.notificationClient.sendEmail({
      to: [email],
      subject: `您的试用期即将结束（还剩 ${data.daysRemaining} 天）- lnk.day`,
      template: 'trial-ending',
      data: {
        ...data,
        upgradeUrl: `${this.frontendUrl}/settings/billing/upgrade`,
      },
    });
    return result.success;
  }

  async sendPaymentSuccessEmail(
    email: string,
    data: { teamName: string; amount: string; currency: string; invoiceId: string; planName: string },
  ): Promise<boolean> {
    const result = await this.notificationClient.sendEmail({
      to: [email],
      subject: '付款成功 - lnk.day',
      template: 'payment-success',
      data: {
        ...data,
        invoiceUrl: `${this.frontendUrl}/settings/billing/invoices/${data.invoiceId}`,
      },
    });
    return result.success;
  }

  async sendSubscriptionCanceledEmail(
    email: string,
    data: { teamName: string; planName: string; endDate: string },
  ): Promise<boolean> {
    const result = await this.notificationClient.sendEmail({
      to: [email],
      subject: '订阅已取消 - lnk.day',
      template: 'subscription-canceled',
      data: {
        ...data,
        reactivateUrl: `${this.frontendUrl}/settings/billing`,
      },
    });
    return result.success;
  }

  async sendPlanChangedEmail(
    email: string,
    data: { teamName: string; oldPlan: string; newPlan: string; effectiveDate: string },
  ): Promise<boolean> {
    const result = await this.notificationClient.sendEmail({
      to: [email],
      subject: `套餐已更改为 ${data.newPlan} - lnk.day`,
      template: 'plan-changed',
      data: {
        ...data,
        billingUrl: `${this.frontendUrl}/settings/billing`,
      },
    });
    return result.success;
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

    const message: SlackMessage = {
      attachments: [
        {
          color,
          title,
          fields: Object.entries(notification.data).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
        },
      ],
    };

    const result = await this.notificationClient.sendSlackMessage(webhookUrl, message);
    return result.success;
  }

  // ========== Webhook Notifications ==========

  async sendBillingWebhook(
    webhookUrl: string,
    notification: BillingNotification,
  ): Promise<boolean> {
    const result = await this.notificationClient.sendWebhook({
      url: webhookUrl,
      method: 'POST',
      headers: {
        'X-Lnk-Event': `billing.${notification.type}`,
      },
      payload: {
        event: `billing.${notification.type}`,
        timestamp: new Date().toISOString(),
        teamId: notification.teamId,
        data: notification.data,
      },
    });
    return result.success;
  }
}
