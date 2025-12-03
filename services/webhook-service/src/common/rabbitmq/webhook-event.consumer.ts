import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { RABBITMQ_CHANNEL } from './rabbitmq.constants';
import {
  LinkCreatedEvent,
  LinkUpdatedEvent,
  LinkDeletedEvent,
  CampaignCreatedEvent,
  CampaignGoalReachedEvent,
  UserCreatedEvent,
  ClickRecordedEvent,
  EXCHANGES,
  QUEUES,
} from '@lnk/shared-types';
import { WebhookService } from '../../modules/webhook/webhook.service';
import { WebhookEvent } from '../../modules/webhook/entities/webhook.entity';

const WEBHOOK_QUEUE = 'webhook.all.events';

type WebhookTriggerEvent =
  | LinkCreatedEvent
  | LinkUpdatedEvent
  | LinkDeletedEvent
  | CampaignCreatedEvent
  | CampaignGoalReachedEvent
  | UserCreatedEvent
  | ClickRecordedEvent;

// 事件类型映射到 Webhook 事件
const EVENT_TYPE_MAP: Record<string, WebhookEvent> = {
  'link.created': 'link.created',
  'link.updated': 'link.updated',
  'link.deleted': 'link.deleted',
  'click.recorded': 'link.clicked',
  'campaign.created': 'campaign.started',
  'campaign.goal.reached': 'conversion.tracked',
  'user.created': 'user.invited',
};

@Injectable()
export class WebhookEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookEventConsumer.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
    private readonly webhookService: WebhookService,
  ) {}

  async onModuleInit() {
    await this.setupConsumer();
  }

  private async setupConsumer(): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available, skipping consumer setup');
      return;
    }

    try {
      // 创建 webhook 事件队列（带 DLQ）
      await this.channel.assertQueue(WEBHOOK_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
          'x-dead-letter-routing-key': 'webhook.events',
        },
      });

      // 绑定到各种业务事件
      const bindings = [
        { exchange: EXCHANGES.LINK_EVENTS, routingKey: 'link.#' },
        { exchange: EXCHANGES.CAMPAIGN_EVENTS, routingKey: 'campaign.#' },
        { exchange: EXCHANGES.USER_EVENTS, routingKey: 'user.#' },
        { exchange: EXCHANGES.CLICK_EVENTS, routingKey: 'click.#' },
      ];

      for (const binding of bindings) {
        try {
          await this.channel.assertExchange(binding.exchange, 'topic', { durable: true });
          await this.channel.bindQueue(WEBHOOK_QUEUE, binding.exchange, binding.routingKey);
        } catch (e) {
          this.logger.warn(`Failed to bind to ${binding.exchange}: ${e}`);
        }
      }

      // 开始消费
      await this.channel.prefetch(10);
      await this.channel.consume(WEBHOOK_QUEUE, async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString()) as WebhookTriggerEvent;
          await this.handleEvent(event);
          this.channel?.ack(msg);
        } catch (error: any) {
          this.logger.error(`Failed to process webhook event: ${error.message}`);
          // 重新入队或发送到 DLQ
          const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
          if (retryCount < 3) {
            this.channel?.nack(msg, false, true);
          } else {
            this.channel?.nack(msg, false, false); // 发送到 DLQ
          }
        }
      });

      this.logger.log('Webhook event consumer started');
    } catch (error: any) {
      this.logger.error(`Failed to setup webhook consumer: ${error.message}`);
    }
  }

  private async handleEvent(event: WebhookTriggerEvent): Promise<void> {
    this.logger.debug(`Processing webhook trigger: ${event.type} [${event.id}]`);

    // 映射事件类型到 Webhook 事件
    const webhookEventType = EVENT_TYPE_MAP[event.type];
    if (!webhookEventType) {
      this.logger.debug(`No webhook mapping for event type: ${event.type}`);
      return;
    }

    // 获取 teamId
    const teamId = this.extractTeamId(event);
    if (!teamId) {
      this.logger.warn(`No teamId found in event: ${event.type}`);
      return;
    }

    // 构建事件数据
    const eventData = this.buildEventData(event);

    try {
      // 触发匹配的 webhooks
      const triggeredCount = await this.webhookService.fireEvent(
        webhookEventType,
        teamId,
        eventData,
      );

      this.logger.log(`Fired ${triggeredCount} webhooks for event ${event.type} (team: ${teamId})`);
    } catch (error: any) {
      this.logger.error(`Failed to fire webhooks for event ${event.type}: ${error.message}`);
      throw error;
    }
  }

  private extractTeamId(event: WebhookTriggerEvent): string | null {
    // 根据事件类型提取 teamId (事件使用 data 字段)
    switch (event.type) {
      case 'link.created':
      case 'link.updated':
      case 'link.deleted':
        return (event as LinkCreatedEvent | LinkUpdatedEvent | LinkDeletedEvent).data.teamId || null;
      case 'click.recorded':
        // click 事件没有 teamId，需要通过 linkId 查询
        return null;
      case 'campaign.created':
        return (event as CampaignCreatedEvent).data.teamId || null;
      case 'campaign.goal.reached':
        // CampaignGoalReachedEvent 没有 teamId，需要通过 campaignId 查询
        // 目前跳过此类事件
        return null;
      case 'user.created':
        return (event as UserCreatedEvent).data.teamId || null;
      default:
        return null;
    }
  }

  private buildEventData(event: WebhookTriggerEvent): Record<string, any> {
    // 提取通用事件数据
    const baseData = {
      eventId: event.id,
      eventType: event.type,
      timestamp: event.timestamp,
    };

    // 根据事件类型添加特定数据 (事件使用 data 字段)
    switch (event.type) {
      case 'link.created':
      case 'link.updated':
      case 'link.deleted': {
        const data = (event as LinkCreatedEvent | LinkUpdatedEvent | LinkDeletedEvent).data;
        return {
          ...baseData,
          linkId: data.linkId,
          shortCode: data.shortCode,
          originalUrl: (data as any).originalUrl,
          teamId: data.teamId,
          userId: data.userId,
          tags: (data as any).tags,
        };
      }
      case 'click.recorded': {
        const data = (event as ClickRecordedEvent).data;
        return {
          ...baseData,
          linkId: data.linkId,
          shortCode: data.shortCode,
          country: data.country,
          city: data.city,
          device: data.device,
          browser: data.browser,
          referer: data.referer,
        };
      }
      case 'campaign.created': {
        const data = (event as CampaignCreatedEvent).data;
        return {
          ...baseData,
          campaignId: data.campaignId,
          name: data.name,
          teamId: data.teamId,
        };
      }
      case 'campaign.goal.reached': {
        const data = (event as CampaignGoalReachedEvent).data;
        return {
          ...baseData,
          campaignId: data.campaignId,
          goalId: data.goalId,
          goalName: data.goalName,
          currentValue: data.currentValue,
          targetValue: data.targetValue,
          userId: data.userId,
        };
      }
      case 'user.created': {
        const data = (event as UserCreatedEvent).data;
        return {
          ...baseData,
          userId: data.userId,
          email: data.email,
          teamId: data.teamId,
        };
      }
      default:
        return baseData;
    }
  }
}
