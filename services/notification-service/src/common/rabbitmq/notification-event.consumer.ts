import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import {
  RABBITMQ_CHANNEL,
  NOTIFICATION_EMAIL_QUEUE,
  NOTIFICATION_SLACK_QUEUE,
  NOTIFICATION_WEBHOOK_QUEUE,
} from './rabbitmq.constants';
import { NotificationEvent, CampaignGoalReachedEvent } from '@lnk/shared-types';
import { EmailService } from '../../modules/email/email.service';
import { SlackService } from '../../modules/slack/slack.service';
import { WebhookService, WebhookConfig } from '../../modules/webhook/webhook.service';
import { WebhookEndpointService } from '../../modules/webhook/webhook-endpoint.service';

@Injectable()
export class NotificationEventConsumer {
  private readonly logger = new Logger(NotificationEventConsumer.name);
  private readonly userServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
    private readonly configService: ConfigService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() private readonly slackService?: SlackService,
    @Optional() private readonly webhookService?: WebhookService,
    @Optional() private readonly webhookEndpointService?: WebhookEndpointService,
  ) {
    this.userServiceUrl = this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:60002');
    this.internalApiKey = this.configService.get<string>('INTERNAL_API_KEY', '');
  }

  async startConsuming(): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available - cannot consume notification events');
      return;
    }

    try {
      // Consume email queue
      await this.channel.consume(
        NOTIFICATION_EMAIL_QUEUE,
        async (msg) => {
          if (msg) await this.handleEmailMessage(msg);
        },
        { noAck: false },
      );

      // Consume Slack queue
      await this.channel.consume(
        NOTIFICATION_SLACK_QUEUE,
        async (msg) => {
          if (msg) await this.handleSlackMessage(msg);
        },
        { noAck: false },
      );

      // Consume webhook queue
      await this.channel.consume(
        NOTIFICATION_WEBHOOK_QUEUE,
        async (msg) => {
          if (msg) await this.handleWebhookMessage(msg);
        },
        { noAck: false },
      );

      this.logger.log('Started consuming notification events');
    } catch (error: any) {
      this.logger.error(`Failed to start consuming: ${error.message}`);
    }
  }

  private async handleEmailMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const event = JSON.parse(content);

      this.logger.debug(`Received email notification event: ${event.type}`);

      if (event.type === 'notification.send') {
        await this.sendEmailNotification(event as NotificationEvent);
      } else if (event.type === 'campaign.goal.reached') {
        await this.sendGoalReachedEmail(event as CampaignGoalReachedEvent);
      }

      this.channel?.ack(msg);
    } catch (error: any) {
      this.logger.error(`Failed to process email message: ${error.message}`);
      this.channel?.nack(msg, false, false);
    }
  }

  private async handleSlackMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const event = JSON.parse(content);

      this.logger.debug(`Received Slack notification event: ${event.type}`);

      if (event.type === 'notification.send') {
        await this.sendSlackNotification(event as NotificationEvent);
      } else if (event.type === 'campaign.goal.reached') {
        await this.sendGoalReachedSlack(event as CampaignGoalReachedEvent);
      }

      this.channel?.ack(msg);
    } catch (error: any) {
      this.logger.error(`Failed to process Slack message: ${error.message}`);
      this.channel?.nack(msg, false, false);
    }
  }

  private async handleWebhookMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const event = JSON.parse(content);

      this.logger.debug(`Received webhook notification event: ${event.type}`);

      if (event.type === 'notification.send') {
        await this.sendWebhookNotification(event as NotificationEvent);
      }

      this.channel?.ack(msg);
    } catch (error: any) {
      this.logger.error(`Failed to process webhook message: ${error.message}`);
      this.channel?.nack(msg, false, false);
    }
  }

  // Helper method to get user info from user-service
  private async getUserInfo(userId: string): Promise<{ email: string; name: string } | null> {
    try {
      const response = await fetch(
        `${this.userServiceUrl}/api/v1/users/internal/validate/${userId}`,
        {
          headers: {
            'x-internal-api-key': this.internalApiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!response.ok) {
        this.logger.warn(`Failed to get user info for ${userId}: ${response.statusText}`);
        return null;
      }
      return await response.json() as { email: string; name: string; } | null;
    } catch (error: any) {
      this.logger.error(`Error getting user info: ${error.message}`);
      return null;
    }
  }

  // Notification handlers - call the actual service methods
  private async sendEmailNotification(event: NotificationEvent): Promise<void> {
    const { recipient, template, payload } = event.data;
    this.logger.log(`Sending email to ${recipient} using template ${template}`);

    if (!this.emailService) {
      this.logger.warn('EmailService not available');
      return;
    }

    await this.emailService.sendEmail({
      to: recipient,
      subject: payload.subject || 'Notification from lnk.day',
      template: template || 'generic',
      data: payload,
    });
  }

  private async sendSlackNotification(event: NotificationEvent): Promise<void> {
    const { recipient, payload } = event.data;
    this.logger.log(`Sending Slack message to ${recipient}`);

    if (!this.slackService) {
      this.logger.warn('SlackService not available');
      return;
    }

    // recipient is the webhook URL for Slack
    await this.slackService.sendWebhook(recipient, {
      text: payload.message || payload.text,
      blocks: payload.blocks,
      attachments: payload.attachments,
    });
  }

  private async sendWebhookNotification(event: NotificationEvent): Promise<void> {
    const { recipient, payload } = event.data;
    this.logger.log(`Sending webhook to ${recipient}`);

    if (!this.webhookService || !this.webhookEndpointService) {
      this.logger.warn('WebhookService not available');
      return;
    }

    // recipient could be endpoint ID or direct URL
    const endpoint = await this.webhookEndpointService.findOne(recipient).catch(() => null);

    if (endpoint) {
      const config: WebhookConfig = {
        id: endpoint.id,
        teamId: endpoint.teamId,
        url: endpoint.url,
        secret: endpoint.secret,
        events: endpoint.events as any[],
        enabled: endpoint.enabled,
        filters: endpoint.filters,
        headers: endpoint.headers,
      };

      await this.webhookService.send(config, {
        event: payload.eventType || 'notification.send',
        timestamp: new Date().toISOString(),
        data: payload,
      });
    } else {
      // Direct webhook URL - send without config
      try {
        await fetch(recipient, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'notification.send',
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        });
      } catch (error: any) {
        this.logger.error(`Direct webhook failed: ${error.message}`);
      }
    }
  }

  private async sendGoalReachedEmail(event: CampaignGoalReachedEvent): Promise<void> {
    const { campaignId, goalName, targetValue, currentValue, userId } = event.data;
    this.logger.log(`Sending goal reached email for campaign ${campaignId}, goal: ${goalName}`);

    if (!this.emailService) {
      this.logger.warn('EmailService not available');
      return;
    }

    // Look up user email from user-service
    const userInfo = await this.getUserInfo(userId);
    if (!userInfo) {
      this.logger.warn(`Could not find user ${userId} for goal reached notification`);
      return;
    }

    await this.emailService.sendEmail({
      to: userInfo.email,
      subject: `🎉 Goal Reached: ${goalName}`,
      template: 'campaign-goal-reached',
      data: {
        userName: userInfo.name,
        campaignId,
        goalName,
        targetValue,
        currentValue,
      },
    });
  }

  private async sendGoalReachedSlack(event: CampaignGoalReachedEvent): Promise<void> {
    const { campaignId, goalName, targetValue, currentValue } = event.data;
    const teamId = (event.data as any).teamId as string | undefined;
    this.logger.log(`Sending goal reached Slack notification for campaign ${campaignId}`);

    if (!this.slackService || !this.webhookEndpointService) {
      this.logger.warn('SlackService not available');
      return;
    }

    // Look up Slack webhook for the team
    if (!teamId) {
      this.logger.warn('No teamId provided for Slack notification');
      return;
    }

    // Get team's Slack webhook endpoints
    const endpoints = await this.webhookEndpointService.getWebhooksByTeam(teamId).catch(() => []);
    const slackEndpoints = endpoints.filter(e => e.url.includes('slack.com/services'));

    if (slackEndpoints.length === 0) {
      this.logger.warn(`No Slack webhook found for team ${teamId}`);
      return;
    }

    for (const endpoint of slackEndpoints) {
      await this.slackService.sendMilestoneNotification(endpoint.url, {
        linkTitle: `Campaign: ${campaignId}`,
        shortUrl: '',
        clicks: currentValue,
        milestone: targetValue,
      });
    }
  }
}
