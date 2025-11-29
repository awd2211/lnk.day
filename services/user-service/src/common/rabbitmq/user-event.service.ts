import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CHANNEL, USER_EVENTS_EXCHANGE, NOTIFICATION_EVENTS_EXCHANGE } from './rabbitmq.constants';
import { UserCreatedEvent, NotificationEvent, ROUTING_KEYS } from '@lnk/shared-types';

export interface UserRegisteredData {
  userId: string;
  email: string;
  name?: string;
  teamId?: string;
  plan?: string;
}

export interface UserDeletedData {
  userId: string;
  email: string;
  teamId?: string;
  reason?: string;
}

export interface UserUpdatedData {
  userId: string;
  changes: Record<string, any>;
}

@Injectable()
export class UserEventService {
  private readonly logger = new Logger(UserEventService.name);
  private readonly serviceName = 'user-service';

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available - events will not be published');
    }
  }

  /**
   * 发布用户注册事件
   */
  async publishUserRegistered(data: UserRegisteredData): Promise<void> {
    const event: UserCreatedEvent = {
      id: uuidv4(),
      type: 'user.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data: {
        userId: data.userId,
        email: data.email,
        teamId: data.teamId,
      },
    };
    await this.publish(USER_EVENTS_EXCHANGE, event, ROUTING_KEYS.USER_CREATED);

    // 同时发送欢迎邮件通知
    await this.sendWelcomeNotification(data);
  }

  /**
   * 发布用户更新事件
   */
  async publishUserUpdated(data: UserUpdatedData): Promise<void> {
    const event = {
      id: uuidv4(),
      type: 'user.updated',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(USER_EVENTS_EXCHANGE, event, ROUTING_KEYS.USER_UPDATED);
  }

  /**
   * 发布用户删除事件
   */
  async publishUserDeleted(data: UserDeletedData): Promise<void> {
    const event = {
      id: uuidv4(),
      type: 'user.deleted',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(USER_EVENTS_EXCHANGE, event, ROUTING_KEYS.USER_DELETED);
  }

  /**
   * 发送欢迎邮件通知
   */
  private async sendWelcomeNotification(data: UserRegisteredData): Promise<void> {
    const notification: NotificationEvent = {
      id: uuidv4(),
      type: 'notification.send',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data: {
        channel: 'email',
        recipient: data.email,
        template: 'welcome',
        payload: {
          userName: data.name || data.email.split('@')[0],
          plan: data.plan || 'free',
        },
        userId: data.userId,
      },
    };
    await this.publish(NOTIFICATION_EVENTS_EXCHANGE, notification, ROUTING_KEYS.NOTIFICATION_SEND);
  }

  private async publish(exchange: string, event: any, routingKey: string): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`Skipping event publish (no channel): ${event.type}`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.id,
        timestamp: Date.now(),
      });

      this.logger.debug(`Published event: ${event.type} [${event.id}]`);
    } catch (error: any) {
      this.logger.error(`Failed to publish event: ${error.message}`);
    }
  }
}
