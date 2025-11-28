import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';

export interface EmailNotification {
  to: string[];
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface SlackNotification {
  webhookUrl: string;
  message: SlackMessage;
}

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context';
  text?: { type: 'plain_text' | 'mrkdwn'; text: string };
  elements?: any[];
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
}

export interface TeamsNotification {
  webhookUrl: string;
  card: TeamsCard;
}

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
  facts?: Array<{ name: string; value: string }>;
  text?: string;
  markdown?: boolean;
}

export interface TeamsAction {
  '@type': 'OpenUri';
  name: string;
  targets?: Array<{ os: string; uri: string }>;
}

export interface SavedSearchNotificationData {
  searchName: string;
  searchDescription?: string;
  totalResults: number;
  newResults?: number;
  topResults?: Array<{
    title: string;
    shortUrl: string;
    originalUrl: string;
    clicks: number;
  }>;
  searchUrl: string;
  frequency: string;
  period?: string;
}

export interface NewMatchNotificationData {
  searchName: string;
  link: {
    title: string;
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    createdAt: string;
  };
  searchUrl: string;
}

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;
  private readonly appBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:60020',
    );
    this.appBaseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'https://app.lnk.day',
    );
  }

  // ==================== Email Notifications ====================

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      for (const recipient of notification.to) {
        await firstValueFrom(
          this.httpService
            .post(`${this.notificationServiceUrl}/email/send`, {
              to: recipient,
              subject: notification.subject,
              template: notification.template,
              data: notification.data,
            })
            .pipe(
              catchError((error) => {
                this.logger.error(`Failed to send email to ${recipient}: ${error.message}`);
                throw error;
              }),
            ),
        );
      }
      return true;
    } catch (error: any) {
      this.logger.error(`Email notification failed: ${error.message}`);
      return false;
    }
  }

  async sendSavedSearchResultsEmail(
    recipients: string[],
    data: SavedSearchNotificationData,
  ): Promise<boolean> {
    return this.sendEmail({
      to: recipients,
      subject: `搜索报告: "${data.searchName}" - ${data.totalResults} 条结果`,
      template: 'saved-search-results',
      data: {
        searchName: data.searchName,
        searchDescription: data.searchDescription,
        totalResults: data.totalResults,
        newResults: data.newResults,
        topResults: data.topResults?.slice(0, 10),
        searchUrl: data.searchUrl,
        frequency: data.frequency,
        period: data.period,
      },
    });
  }

  async sendNewMatchEmail(
    recipients: string[],
    data: NewMatchNotificationData,
  ): Promise<boolean> {
    return this.sendEmail({
      to: recipients,
      subject: `新链接匹配: "${data.searchName}"`,
      template: 'saved-search-new-match',
      data: {
        searchName: data.searchName,
        link: data.link,
        searchUrl: data.searchUrl,
      },
    });
  }

  // ==================== Slack Notifications ====================

  async sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<boolean> {
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
      this.logger.error(`Slack notification failed: ${error.message}`);
      return false;
    }
  }

  async sendSavedSearchResultsSlack(
    webhookUrl: string,
    data: SavedSearchNotificationData,
  ): Promise<boolean> {
    const topResultsText =
      data.topResults && data.topResults.length > 0
        ? data.topResults
            .slice(0, 5)
            .map((r, i) => `${i + 1}. <${r.shortUrl}|${r.title || r.shortUrl}>: ${r.clicks} clicks`)
            .join('\n')
        : '暂无结果';

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `📊 搜索报告: ${data.searchName}` },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*总结果数:* ${data.totalResults}${data.newResults !== undefined ? ` (+${data.newResults} 新)` : ''}\n*频率:* ${this.getFrequencyLabel(data.frequency)}`,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*热门链接:*\n${topResultsText}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `<${data.searchUrl}|在 lnk.day 中查看完整结果>`,
            },
          ],
        },
      ],
      attachments: [{ color: '#0073e6' }],
    };

    return this.sendSlackMessage(webhookUrl, message);
  }

  async sendNewMatchSlack(
    webhookUrl: string,
    data: NewMatchNotificationData,
  ): Promise<boolean> {
    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🔔 新链接匹配: ${data.searchName}` },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.link.title || data.link.shortCode}*\n<${data.link.shortUrl}|${data.link.shortUrl}>`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `原始链接: ${data.link.originalUrl}\n创建时间: ${data.link.createdAt}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `<${data.searchUrl}|查看搜索结果>`,
            },
          ],
        },
      ],
      attachments: [{ color: '#36a64f' }],
    };

    return this.sendSlackMessage(webhookUrl, message);
  }

  // ==================== Teams Notifications ====================

  async sendTeamsCard(webhookUrl: string, card: TeamsCard): Promise<boolean> {
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
      this.logger.error(`Teams notification failed: ${error.message}`);
      return false;
    }
  }

  async sendSavedSearchResultsTeams(
    webhookUrl: string,
    data: SavedSearchNotificationData,
  ): Promise<boolean> {
    const topResultsText =
      data.topResults && data.topResults.length > 0
        ? data.topResults
            .slice(0, 5)
            .map((r, i) => `${i + 1}. **${r.title || r.shortUrl}**: ${r.clicks} clicks`)
            .join('\n\n')
        : '暂无结果';

    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '0076D7',
      summary: `搜索报告: ${data.searchName}`,
      title: `📊 搜索报告: ${data.searchName}`,
      sections: [
        {
          facts: [
            { name: '总结果数', value: data.totalResults.toString() },
            ...(data.newResults !== undefined
              ? [{ name: '新增结果', value: `+${data.newResults}` }]
              : []),
            { name: '频率', value: this.getFrequencyLabel(data.frequency) },
          ],
          markdown: true,
        },
        {
          activityTitle: '热门链接',
          text: topResultsText,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '查看完整结果',
          targets: [{ os: 'default', uri: data.searchUrl }],
        },
      ],
    };

    return this.sendTeamsCard(webhookUrl, card);
  }

  async sendNewMatchTeams(
    webhookUrl: string,
    data: NewMatchNotificationData,
  ): Promise<boolean> {
    const card: TeamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '36a64f',
      summary: `新链接匹配: ${data.searchName}`,
      title: `🔔 新链接匹配: ${data.searchName}`,
      sections: [
        {
          activityTitle: data.link.title || data.link.shortCode,
          activitySubtitle: data.link.shortUrl,
          facts: [
            { name: '原始链接', value: data.link.originalUrl },
            { name: '创建时间', value: data.link.createdAt },
          ],
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '查看链接',
          targets: [{ os: 'default', uri: data.link.shortUrl }],
        },
        {
          '@type': 'OpenUri',
          name: '查看搜索结果',
          targets: [{ os: 'default', uri: data.searchUrl }],
        },
      ],
    };

    return this.sendTeamsCard(webhookUrl, card);
  }

  // ==================== Helper Methods ====================

  private getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      daily: '每日',
      weekly: '每周',
      on_match: '即时匹配',
    };
    return labels[frequency] || frequency;
  }

  getSearchUrl(searchId: string): string {
    return `${this.appBaseUrl}/links?savedSearch=${searchId}`;
  }

  getLinkUrl(shortCode: string): string {
    return `${this.appBaseUrl}/links/${shortCode}`;
  }
}
