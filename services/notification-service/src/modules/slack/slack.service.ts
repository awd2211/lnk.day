import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  webhookUrl?: string; // For incoming webhooks
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
  text?: { type: 'plain_text' | 'mrkdwn'; text: string };
  accessory?: any;
  elements?: any[];
  block_id?: string;
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

export interface SlackNotification {
  teamId: string;
  type: 'link_created' | 'milestone' | 'alert' | 'report' | 'custom';
  data: Record<string, any>;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('slack')
    private readonly slackQueue: Queue,
  ) {
    this.botToken = this.configService.get<string>('SLACK_BOT_TOKEN') || '';
  }

  async sendMessage(message: SlackMessage): Promise<void> {
    await this.slackQueue.add('send', message, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async sendWebhook(webhookUrl: string, message: Omit<SlackMessage, 'channel'>): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        this.logger.error(`Slack webhook failed: ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Slack webhook error: ${error.message}`);
      return false;
    }
  }

  // Pre-built notification templates
  async sendLinkCreatedNotification(
    webhookUrl: string,
    linkData: { title: string; shortUrl: string; originalUrl: string; createdBy: string },
  ): Promise<boolean> {
    const message: Omit<SlackMessage, 'channel'> = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔗 New Link Created' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${linkData.title}*\n<${linkData.shortUrl}|${linkData.shortUrl}>`,
          },
        },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `Created by ${linkData.createdBy}` }],
        },
      ],
    };

    return this.sendWebhook(webhookUrl, message);
  }

  async sendMilestoneNotification(
    webhookUrl: string,
    data: { linkTitle: string; shortUrl: string; clicks: number; milestone: number },
  ): Promise<boolean> {
    const message: Omit<SlackMessage, 'channel'> = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🎉 Milestone Reached!' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.linkTitle}* has reached *${data.milestone.toLocaleString()} clicks*!`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Current total: ${data.clicks.toLocaleString()} clicks\n<${data.shortUrl}|View Link>`,
          },
        },
      ],
      attachments: [{ color: '#36a64f' }],
    };

    return this.sendWebhook(webhookUrl, message);
  }

  async sendAlertNotification(
    webhookUrl: string,
    alert: { type: string; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; details?: string },
  ): Promise<boolean> {
    const severityColors = {
      low: '#36a64f',
      medium: '#ffcc00',
      high: '#ff9900',
      critical: '#ff0000',
    };

    const severityEmojis = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥',
    };

    const message: Omit<SlackMessage, 'channel'> = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${severityEmojis[alert.severity]} Alert: ${alert.type}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: alert.message },
        },
        ...(alert.details
          ? [
              {
                type: 'context' as const,
                elements: [{ type: 'mrkdwn' as const, text: alert.details }],
              },
            ]
          : []),
      ],
      attachments: [{ color: severityColors[alert.severity] }],
    };

    return this.sendWebhook(webhookUrl, message);
  }

  async sendWeeklyReport(
    webhookUrl: string,
    report: {
      totalClicks: number;
      uniqueVisitors: number;
      topLinks: Array<{ title: string; clicks: number }>;
      growthPercent: number;
      period: string;
    },
  ): Promise<boolean> {
    const topLinksText = report.topLinks
      .slice(0, 5)
      .map((link, i) => `${i + 1}. ${link.title}: ${link.clicks.toLocaleString()} clicks`)
      .join('\n');

    const growthEmoji = report.growthPercent >= 0 ? '📈' : '📉';

    const message: Omit<SlackMessage, 'channel'> = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📊 Weekly Performance Report' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Period:* ${report.period}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Total Clicks:* ${report.totalClicks.toLocaleString()}\n*Unique Visitors:* ${report.uniqueVisitors.toLocaleString()}\n*Growth:* ${growthEmoji} ${report.growthPercent}%`,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Top Performing Links:*\n${topLinksText}`,
          },
        },
      ],
    };

    return this.sendWebhook(webhookUrl, message);
  }
}
