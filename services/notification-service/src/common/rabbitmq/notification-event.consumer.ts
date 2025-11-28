import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import {
  RABBITMQ_CHANNEL,
  NOTIFICATION_EMAIL_QUEUE,
  NOTIFICATION_SLACK_QUEUE,
  NOTIFICATION_WEBHOOK_QUEUE,
} from './rabbitmq.constants';
import { NotificationEvent, CampaignGoalReachedEvent } from '@lnk/shared-types';

@Injectable()
export class NotificationEventConsumer {
  private readonly logger = new Logger(NotificationEventConsumer.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {}

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

  // Notification handlers - these should call the actual service methods
  private async sendEmailNotification(event: NotificationEvent): Promise<void> {
    const { recipient, template, payload } = event.data;
    this.logger.log(`Sending email to ${recipient} using template ${template}`);
    // TODO: Inject and call EmailService
  }

  private async sendSlackNotification(event: NotificationEvent): Promise<void> {
    const { recipient, payload } = event.data;
    this.logger.log(`Sending Slack message to ${recipient}`);
    // TODO: Inject and call SlackService
  }

  private async sendWebhookNotification(event: NotificationEvent): Promise<void> {
    const { recipient, payload } = event.data;
    this.logger.log(`Sending webhook to ${recipient}`);
    // TODO: Inject and call WebhookService
  }

  private async sendGoalReachedEmail(event: CampaignGoalReachedEvent): Promise<void> {
    const { campaignId, goalName, targetValue, currentValue, userId } = event.data;
    this.logger.log(`Sending goal reached email for campaign ${campaignId}, goal: ${goalName}`);
    // TODO: Look up user email and send notification
  }

  private async sendGoalReachedSlack(event: CampaignGoalReachedEvent): Promise<void> {
    const { campaignId, goalName, targetValue, currentValue } = event.data;
    this.logger.log(`Sending goal reached Slack notification for campaign ${campaignId}`);
    // TODO: Look up Slack webhook and send notification
  }
}
