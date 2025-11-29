import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CHANNEL, LINK_EVENTS_EXCHANGE } from './rabbitmq.constants';
import {
  LinkCreatedEvent,
  LinkUpdatedEvent,
  LinkDeletedEvent,
  ROUTING_KEYS,
} from '@lnk/shared-types';

export interface LinkCreatedData {
  linkId: string;
  shortCode: string;
  originalUrl: string;
  userId: string;
  teamId?: string;
  campaignId?: string;
  tags?: string[];
  customDomain?: string;
}

export interface LinkUpdatedData {
  linkId: string;
  shortCode: string;
  changes: Record<string, any>;
  userId: string;
  teamId?: string;
  campaignId?: string;
  previousCampaignId?: string;
}

export interface LinkDeletedData {
  linkId: string;
  shortCode: string;
  userId: string;
  teamId?: string;
  campaignId?: string;
}

@Injectable()
export class LinkEventService {
  private readonly logger = new Logger(LinkEventService.name);
  private readonly serviceName = 'link-service';

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available - events will not be published');
    }
  }

  async publishLinkCreated(data: LinkCreatedData): Promise<void> {
    const event: LinkCreatedEvent = {
      id: uuidv4(),
      type: 'link.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.LINK_CREATED);
  }

  async publishLinkUpdated(data: LinkUpdatedData): Promise<void> {
    const event: LinkUpdatedEvent = {
      id: uuidv4(),
      type: 'link.updated',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.LINK_UPDATED);
  }

  async publishLinkDeleted(data: LinkDeletedData): Promise<void> {
    const event: LinkDeletedEvent = {
      id: uuidv4(),
      type: 'link.deleted',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.LINK_DELETED);
  }

  private async publish(event: LinkCreatedEvent | LinkUpdatedEvent | LinkDeletedEvent, routingKey: string): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`Skipping event publish (no channel): ${event.type}`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(LINK_EVENTS_EXCHANGE, routingKey, message, {
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
