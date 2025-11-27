import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { RABBITMQ_CHANNEL, LINK_EVENTS_EXCHANGE } from './rabbitmq.module';

export enum LinkEventType {
  CREATED = 'link.created',
  UPDATED = 'link.updated',
  DELETED = 'link.deleted',
}

export interface LinkEvent {
  type: LinkEventType;
  linkId: string;
  shortCode: string;
  timestamp: string;
  data?: Record<string, any>;
}

@Injectable()
export class LinkEventService {
  private readonly logger = new Logger(LinkEventService.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel,
  ) {}

  async publishLinkCreated(linkId: string, shortCode: string, data?: Record<string, any>): Promise<void> {
    await this.publish({
      type: LinkEventType.CREATED,
      linkId,
      shortCode,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  async publishLinkUpdated(linkId: string, shortCode: string, data?: Record<string, any>): Promise<void> {
    await this.publish({
      type: LinkEventType.UPDATED,
      linkId,
      shortCode,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  async publishLinkDeleted(linkId: string, shortCode: string): Promise<void> {
    await this.publish({
      type: LinkEventType.DELETED,
      linkId,
      shortCode,
      timestamp: new Date().toISOString(),
    });
  }

  private async publish(event: LinkEvent): Promise<void> {
    try {
      const message = Buffer.from(JSON.stringify(event));
      const routingKey = event.type;

      this.channel.publish(LINK_EVENTS_EXCHANGE, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
      });

      this.logger.debug(`Published event: ${event.type} for link ${event.shortCode}`);
    } catch (error: any) {
      this.logger.error(`Failed to publish event: ${error.message}`);
      // Don't throw - we don't want to fail the main operation if messaging fails
    }
  }
}
