import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { RealtimeGateway } from './websocket.gateway';

export interface PubSubMessage {
  event: string;
  channel: string;
  data: any;
  timestamp: string;
}

@Injectable()
export class WebsocketService implements OnModuleInit {
  private subscriber: Redis;
  private publisher: Redis;

  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
    };

    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    // 订阅 Redis pubsub 频道
    await this.subscriber.subscribe('realtime:events');

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'realtime:events') {
        this.handlePubSubMessage(message);
      }
    });
  }

  private handlePubSubMessage(message: string) {
    try {
      const parsed: PubSubMessage = JSON.parse(message);
      this.gateway.emitToChannel(parsed.channel, parsed.event, parsed.data);
    } catch (error) {
      console.error('Failed to parse PubSub message:', error);
    }
  }

  /**
   * 发布事件到 Redis PubSub（供其他服务调用）
   */
  async publishEvent(channel: string, event: string, data: any): Promise<void> {
    const message: PubSubMessage = {
      event,
      channel,
      data,
      timestamp: new Date().toISOString(),
    };
    await this.publisher.publish('realtime:events', JSON.stringify(message));
  }

  /**
   * 发送链接点击事件
   */
  async publishLinkClick(teamId: string, linkId: string, clickData: any): Promise<void> {
    await this.publishEvent(`team:${teamId}`, 'link:click', {
      linkId,
      ...clickData,
    });
  }

  /**
   * 发送链接创建事件
   */
  async publishLinkCreated(teamId: string, link: any): Promise<void> {
    await this.publishEvent(`team:${teamId}`, 'link:created', { link });
  }

  /**
   * 发送链接更新事件
   */
  async publishLinkUpdated(teamId: string, link: any): Promise<void> {
    await this.publishEvent(`team:${teamId}`, 'link:updated', { link });
  }

  /**
   * 发送链接删除事件
   */
  async publishLinkDeleted(teamId: string, linkId: string): Promise<void> {
    await this.publishEvent(`team:${teamId}`, 'link:deleted', { linkId });
  }

  /**
   * 发送用户通知
   */
  async publishUserNotification(userId: string, notification: any): Promise<void> {
    await this.publishEvent(`user:${userId}`, 'notification', notification);
  }

  /**
   * 获取当前在线统计
   */
  getOnlineStats(): { onlineUsers: number } {
    return {
      onlineUsers: this.gateway.getOnlineUsersCount(),
    };
  }
}
