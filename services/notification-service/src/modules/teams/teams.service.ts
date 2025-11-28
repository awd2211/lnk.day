import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface TeamsCard {
  '@type': 'MessageCard';
  '@context': 'http://schema.org/extensions';
  themeColor?: string;
  summary: string;
  title?: string;
  sections?: TeamsSection[];
  potentialAction?: TeamsAction[];
}

export interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts?: Array<{ name: string; value: string }>;
  markdown?: boolean;
  text?: string;
}

export interface TeamsAction {
  '@type': 'OpenUri' | 'HttpPOST' | 'ActionCard';
  name: string;
  targets?: Array<{ os: string; uri: string }>;
  body?: string;
  inputs?: any[];
  actions?: any[];
}

export interface TeamsMessage {
  webhookUrl: string;
  card: TeamsCard;
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectQueue('teams')
    private readonly teamsQueue: Queue,
  ) {}

  async sendCard(webhookUrl: string, card: TeamsCard): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        this.logger.error(`Teams webhook failed: ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Teams webhook error: ${error.message}`);
      return false;
    }
  }

  async queueMessage(message: TeamsMessage): Promise<void> {
    await this.teamsQueue.add('send', message, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  // Pre-built notification templates
  async sendLinkCreatedNotification(
    webhookUrl: string,
    linkData: { title: string; shortUrl: string; originalUrl: string; createdBy: string },
  ): Promise<boolean> {
    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '0076D7',
      summary: `New link created: ${linkData.title}`,
      title: '🔗 New Link Created',
      sections: [
        {
          facts: [
            { name: 'Title', value: linkData.title },
            { name: 'Short URL', value: linkData.shortUrl },
            { name: 'Created By', value: linkData.createdBy },
          ],
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Open Link',
          targets: [{ os: 'default', uri: linkData.shortUrl }],
        },
      ],
    };

    return this.sendCard(webhookUrl, card);
  }

  async sendMilestoneNotification(
    webhookUrl: string,
    data: { linkTitle: string; shortUrl: string; clicks: number; milestone: number },
  ): Promise<boolean> {
    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '00FF00',
      summary: `Milestone reached: ${data.milestone} clicks`,
      title: '🎉 Milestone Reached!',
      sections: [
        {
          activityTitle: data.linkTitle,
          activitySubtitle: `Reached ${data.milestone.toLocaleString()} clicks!`,
          facts: [
            { name: 'Current Clicks', value: data.clicks.toLocaleString() },
            { name: 'Milestone', value: data.milestone.toLocaleString() },
          ],
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Analytics',
          targets: [{ os: 'default', uri: data.shortUrl }],
        },
      ],
    };

    return this.sendCard(webhookUrl, card);
  }

  async sendAlertNotification(
    webhookUrl: string,
    alert: { type: string; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; details?: string },
  ): Promise<boolean> {
    const severityColors = {
      low: '36a64f',
      medium: 'ffcc00',
      high: 'ff9900',
      critical: 'ff0000',
    };

    const severityEmojis = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥',
    };

    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: severityColors[alert.severity],
      summary: `Alert: ${alert.type}`,
      title: `${severityEmojis[alert.severity]} Alert: ${alert.type}`,
      sections: [
        {
          text: alert.message,
          facts: [
            { name: 'Severity', value: alert.severity.toUpperCase() },
            ...(alert.details ? [{ name: 'Details', value: alert.details }] : []),
          ],
          markdown: true,
        },
      ],
    };

    return this.sendCard(webhookUrl, card);
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
    const topLinksFormatted = report.topLinks
      .slice(0, 5)
      .map((link, i) => `${i + 1}. **${link.title}**: ${link.clicks.toLocaleString()} clicks`)
      .join('\n\n');

    const growthEmoji = report.growthPercent >= 0 ? '📈' : '📉';

    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '0076D7',
      summary: 'Weekly Performance Report',
      title: '📊 Weekly Performance Report',
      sections: [
        {
          activityTitle: report.period,
          facts: [
            { name: 'Total Clicks', value: report.totalClicks.toLocaleString() },
            { name: 'Unique Visitors', value: report.uniqueVisitors.toLocaleString() },
            { name: 'Growth', value: `${growthEmoji} ${report.growthPercent}%` },
          ],
          markdown: true,
        },
        {
          activityTitle: 'Top Performing Links',
          text: topLinksFormatted,
          markdown: true,
        },
      ],
    };

    return this.sendCard(webhookUrl, card);
  }
}
