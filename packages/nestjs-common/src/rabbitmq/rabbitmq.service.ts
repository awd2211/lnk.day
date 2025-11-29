import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import {
  RabbitMQConfig,
  QueueConfig,
  ExchangeConfig,
  BindingConfig,
  PublishOptions,
  MessageHandler,
  DeadLetterInfo,
} from './rabbitmq.types';
import { EXCHANGES, QUEUES } from '@lnk/shared-types';

const DEFAULT_CONFIG: Partial<RabbitMQConfig> = {
  connectionTimeout: 5000,
  heartbeat: 60,
};

const DEFAULT_RETRY_HEADER = 'x-retry-count';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 5000;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;
  private config: RabbitMQConfig;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor() {
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://rabbit:rabbit123@localhost:60036',
      ...DEFAULT_CONFIG,
    };
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * 连接到 RabbitMQ
   */
  async connect(): Promise<boolean> {
    try {
      const connectionPromise = amqplib.connect(this.config.url, {
        heartbeat: this.config.heartbeat,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Connection timeout')),
          this.config.connectionTimeout,
        ),
      );

      this.connection = await Promise.race([connectionPromise, timeoutPromise]) as any;
      this.channel = await (this.connection as any).createChannel();

      // 设置错误处理
      this.connection.on('error', (err) => {
        this.logger.error(`RabbitMQ connection error: ${err.message}`);
        this.handleConnectionError();
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.handleConnectionError();
      });

      this.reconnectAttempts = 0;
      this.logger.log('RabbitMQ connected successfully');

      // 初始化 DLQ 基础设施
      await this.setupDeadLetterInfrastructure();

      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to connect to RabbitMQ: ${error.message}`);
      return false;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await (this.connection as any).close();
        this.connection = null;
      }
      this.logger.log('RabbitMQ disconnected');
    } catch (error: any) {
      this.logger.error(`Error disconnecting: ${error.message}`);
    }
  }

  /**
   * 处理连接错误，尝试重连
   */
  private async handleConnectionError(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => this.connect(), delay);
  }

  /**
   * 设置死信队列基础设施
   */
  private async setupDeadLetterInfrastructure(): Promise<void> {
    if (!this.channel) return;

    try {
      // 创建死信交换机
      await this.channel.assertExchange(EXCHANGES.DEAD_LETTER, 'topic', {
        durable: true,
      });

      // 创建各业务域的死信队列
      const dlqQueues = [
        QUEUES.DLQ_LINK_EVENTS,
        QUEUES.DLQ_CAMPAIGN_EVENTS,
        QUEUES.DLQ_NOTIFICATION_EVENTS,
        QUEUES.DLQ_SAGA_EVENTS,
      ];

      for (const queue of dlqQueues) {
        await this.channel.assertQueue(queue, {
          durable: true,
          arguments: {
            'x-message-ttl': 7 * 24 * 60 * 60 * 1000, // 7 天
          },
        });

        // 绑定到死信交换机
        const routingKey = queue.replace('dlq.', '');
        await this.channel.bindQueue(queue, EXCHANGES.DEAD_LETTER, `${routingKey}.#`);
      }

      this.logger.log('Dead letter infrastructure initialized');
    } catch (error: any) {
      this.logger.error(`Failed to setup DLQ: ${error.message}`);
    }
  }

  /**
   * 声明 Exchange
   */
  async assertExchange(config: ExchangeConfig): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Channel not available');
      return;
    }

    await this.channel.assertExchange(config.name, config.type, {
      durable: config.durable ?? true,
      autoDelete: config.autoDelete ?? false,
      arguments: config.arguments,
    });
  }

  /**
   * 声明队列（支持 DLQ 配置）
   */
  async assertQueue(config: QueueConfig): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Channel not available');
      return;
    }

    const queueArgs: Record<string, any> = { ...config.arguments };

    // 配置死信队列
    if (config.deadLetterExchange) {
      queueArgs['x-dead-letter-exchange'] = config.deadLetterExchange;
    }
    if (config.deadLetterRoutingKey) {
      queueArgs['x-dead-letter-routing-key'] = config.deadLetterRoutingKey;
    }
    if (config.messageTtl) {
      queueArgs['x-message-ttl'] = config.messageTtl;
    }

    await this.channel.assertQueue(config.name, {
      durable: config.durable ?? true,
      exclusive: config.exclusive ?? false,
      autoDelete: config.autoDelete ?? false,
      arguments: queueArgs,
    });
  }

  /**
   * 绑定队列到交换机
   */
  async bindQueue(config: BindingConfig): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Channel not available');
      return;
    }

    await this.channel.bindQueue(config.queue, config.exchange, config.routingKey);
  }

  /**
   * 发布消息
   */
  async publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    if (!this.channel) {
      this.logger.warn('Channel not available, message not published');
      return false;
    }

    try {
      const content = Buffer.from(JSON.stringify(message));

      this.channel.publish(exchange, routingKey, content, {
        persistent: options?.persistent ?? true,
        contentType: options?.contentType ?? 'application/json',
        messageId: options?.messageId ?? uuidv4(),
        correlationId: options?.correlationId,
        replyTo: options?.replyTo,
        expiration: options?.expiration,
        headers: options?.headers,
        timestamp: Date.now(),
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Failed to publish message: ${error.message}`);
      return false;
    }
  }

  /**
   * 消费消息（支持自动重试和 DLQ）
   */
  async consume<T>(
    queue: string,
    handler: MessageHandler<T>,
    options?: {
      prefetch?: number;
      maxRetries?: number;
      retryDelay?: number;
    },
  ): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Channel not available');
      return;
    }

    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryDelay = options?.retryDelay ?? DEFAULT_RETRY_DELAY;

    await this.channel.prefetch(options?.prefetch ?? 10);

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as T;
        await handler(content, msg);
        this.channel?.ack(msg);
      } catch (error: any) {
        const retryCount = this.getRetryCount(msg);

        if (retryCount < maxRetries) {
          // 重试：重新发布消息
          this.logger.warn(
            `Message processing failed, retrying (${retryCount + 1}/${maxRetries}): ${error.message}`,
          );

          await this.republishWithRetry(msg, retryCount + 1, retryDelay);
          this.channel?.ack(msg);
        } else {
          // 超过重试次数，发送到 DLQ
          this.logger.error(
            `Message failed after ${maxRetries} retries, sending to DLQ: ${error.message}`,
          );

          await this.sendToDeadLetter(msg, error.message, queue);
          this.channel?.ack(msg);
        }
      }
    });

    this.logger.log(`Consumer started for queue: ${queue}`);
  }

  /**
   * 获取重试次数
   */
  private getRetryCount(msg: amqplib.ConsumeMessage): number {
    const headers = msg.properties.headers || {};
    return headers[DEFAULT_RETRY_HEADER] || 0;
  }

  /**
   * 重新发布消息（带重试计数）
   */
  private async republishWithRetry(
    msg: amqplib.ConsumeMessage,
    retryCount: number,
    delay: number,
  ): Promise<void> {
    const exchange = msg.fields.exchange;
    const routingKey = msg.fields.routingKey;

    // 延迟后重新发布
    setTimeout(() => {
      this.channel?.publish(exchange, routingKey, msg.content, {
        ...msg.properties,
        headers: {
          ...msg.properties.headers,
          [DEFAULT_RETRY_HEADER]: retryCount,
        },
      });
    }, delay * retryCount);
  }

  /**
   * 发送到死信队列
   */
  private async sendToDeadLetter(
    msg: amqplib.ConsumeMessage,
    error: string,
    queue: string,
  ): Promise<void> {
    const dlqInfo: DeadLetterInfo = {
      exchange: msg.fields.exchange,
      routingKeys: [msg.fields.routingKey],
      count: this.getRetryCount(msg) + 1,
      reason: error,
      queue,
      time: Date.now(),
    };

    const dlqMessage = {
      originalMessage: JSON.parse(msg.content.toString()),
      deadLetterInfo: dlqInfo,
      originalProperties: msg.properties,
    };

    // 发送到死信交换机
    const routingKey = queue.includes('link')
      ? 'link.events'
      : queue.includes('campaign')
        ? 'campaign.events'
        : queue.includes('notification')
          ? 'notification.events'
          : 'saga.events';

    this.channel?.publish(
      EXCHANGES.DEAD_LETTER,
      routingKey,
      Buffer.from(JSON.stringify(dlqMessage)),
      {
        persistent: true,
        contentType: 'application/json',
        headers: {
          'x-death-reason': error,
          'x-original-queue': queue,
          'x-original-exchange': msg.fields.exchange,
          'x-original-routing-key': msg.fields.routingKey,
        },
      },
    );
  }

  /**
   * 获取通道
   */
  getChannel(): amqplib.Channel | null {
    return this.channel;
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}
