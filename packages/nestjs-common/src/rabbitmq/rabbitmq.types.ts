import * as amqplib from 'amqplib';

/**
 * RabbitMQ 连接配置
 */
export interface RabbitMQConfig {
  url: string;
  connectionTimeout?: number;
  heartbeat?: number;
}

/**
 * 队列配置
 */
export interface QueueConfig {
  name: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
  // 死信队列配置
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtl?: number;
  maxRetries?: number;
}

/**
 * Exchange 配置
 */
export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

/**
 * 绑定配置
 */
export interface BindingConfig {
  queue: string;
  exchange: string;
  routingKey: string;
}

/**
 * 消费者配置
 */
export interface ConsumerConfig {
  queue: string;
  prefetch?: number;
  noAck?: boolean;
}

/**
 * 消息选项
 */
export interface PublishOptions {
  persistent?: boolean;
  contentType?: string;
  messageId?: string;
  correlationId?: string;
  replyTo?: string;
  expiration?: string;
  headers?: Record<string, any>;
}

/**
 * 死信队列消息
 */
export interface DeadLetterInfo {
  exchange: string;
  routingKeys: string[];
  count: number;
  reason: string;
  queue: string;
  time: number;
}

/**
 * 消息处理器
 */
export type MessageHandler<T = any> = (
  message: T,
  rawMessage: amqplib.ConsumeMessage,
) => Promise<void>;
