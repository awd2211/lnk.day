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

const WEBHOOK_QUEUE = 'webhook.all.events';

type WebhookTriggerEvent =
  | LinkCreatedEvent
  | LinkUpdatedEvent
  | LinkDeletedEvent
  | CampaignCreatedEvent
  | CampaignGoalReachedEvent
  | UserCreatedEvent
  | ClickRecordedEvent;

@Injectable()
export class WebhookEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookEventConsumer.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
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

    // 根据事件类型查找匹配的 webhook 订阅
    // const subscriptions = await this.webhookService.findSubscriptionsByEventType(event.type);

    // 触发 webhook 调用
    // for (const sub of subscriptions) {
    //   await this.webhookService.trigger(sub, event);
    // }

    this.logger.debug(`Webhook trigger processed: ${event.type}`);
  }
}
