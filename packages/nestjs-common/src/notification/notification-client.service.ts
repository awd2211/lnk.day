import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import {
  EmailNotification,
  SlackMessage,
  TeamsCard,
  WebhookNotification,
  SmsNotification,
  NotificationResult,
} from './notification.types';

export interface NotificationClientOptions {
  notificationServiceUrl?: string;
  timeout?: number;
}

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:60020',
    );
    this.timeout = this.configService.get<number>('NOTIFICATION_TIMEOUT', 10000);
  }

  // ==================== Email Notifications ====================

  async sendEmail(notification: EmailNotification): Promise<NotificationResult> {
    try {
      for (const recipient of notification.to) {
        await this.post('/api/v1/email/send', {
          to: recipient,
          subject: notification.subject,
          template: notification.template,
          data: notification.data,
        });
      }
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Email notification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendEmailDirect(
    to: string,
    subject: string,
    template: string,
    data: Record<string, any>,
  ): Promise<NotificationResult> {
    return this.sendEmail({ to: [to], subject, template, data });
  }

  // ==================== Slack Notifications ====================

  async sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<NotificationResult> {
    try {
      const response = await axios.post(webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout,
      });

      if (response.status >= 200 && response.status < 300) {
        return { success: true };
      }

      return { success: false, error: `Slack returned status ${response.status}` };
    } catch (error: any) {
      this.logger.error(`Slack notification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendSlackText(webhookUrl: string, text: string): Promise<NotificationResult> {
    return this.sendSlackMessage(webhookUrl, { text });
  }

  // ==================== Teams Notifications ====================

  async sendTeamsCard(webhookUrl: string, card: TeamsCard): Promise<NotificationResult> {
    try {
      const response = await axios.post(webhookUrl, card, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout,
      });

      if (response.status >= 200 && response.status < 300) {
        return { success: true };
      }

      return { success: false, error: `Teams returned status ${response.status}` };
    } catch (error: any) {
      this.logger.error(`Teams notification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendTeamsText(
    webhookUrl: string,
    title: string,
    text: string,
    themeColor?: string,
  ): Promise<NotificationResult> {
    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: themeColor || '0076D7',
      summary: title,
      title,
      sections: [{ text, markdown: true }],
    };
    return this.sendTeamsCard(webhookUrl, card);
  }

  // ==================== Webhook Notifications ====================

  async sendWebhook(notification: WebhookNotification): Promise<NotificationResult> {
    try {
      const config: AxiosRequestConfig = {
        method: notification.method || 'POST',
        url: notification.url,
        headers: {
          'Content-Type': 'application/json',
          ...notification.headers,
        },
        data: notification.payload,
        timeout: this.timeout,
      };

      const response = await axios(config);

      if (response.status >= 200 && response.status < 300) {
        return { success: true };
      }

      return { success: false, error: `Webhook returned status ${response.status}` };
    } catch (error: any) {
      this.logger.error(`Webhook notification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== SMS Notifications ====================

  async sendSms(notification: SmsNotification): Promise<NotificationResult> {
    try {
      await this.post('/api/v1/sms/send', {
        to: notification.to,
        message: notification.message,
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error(`SMS notification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== Helper Methods ====================

  private async post(path: string, data: any): Promise<any> {
    const response = await axios.post(`${this.notificationServiceUrl}${path}`, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: this.timeout,
    });
    return response.data;
  }
}
