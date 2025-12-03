import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CHANNEL, PAGE_EVENTS_EXCHANGE } from './rabbitmq.constants';
import {
  PageCreatedEvent,
  PageUpdatedEvent,
  PageDeletedEvent,
  PageViewedEvent,
  BioLinkCreatedEvent,
  BioLinkUpdatedEvent,
  BioLinkViewedEvent,
  ROUTING_KEYS,
} from '@lnk/shared-types';

export interface PageCreatedData {
  pageId: string;
  slug: string;
  title: string;
  userId: string;
  teamId?: string;
}

export interface PageUpdatedData {
  pageId: string;
  slug: string;
  changes: string[];
  userId: string;
  teamId?: string;
}

export interface PageDeletedData {
  pageId: string;
  slug: string;
  userId: string;
  teamId?: string;
}

export interface PageViewedData {
  pageId: string;
  slug: string;
  visitorId?: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface BioLinkCreatedData {
  bioLinkId: string;
  username: string;
  userId: string;
  teamId?: string;
}

export interface BioLinkUpdatedData {
  bioLinkId: string;
  username: string;
  changes: string[];
  userId: string;
  teamId?: string;
}

export interface BioLinkViewedData {
  bioLinkId: string;
  username: string;
  visitorId?: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  referer?: string;
}

@Injectable()
export class PageEventService {
  private readonly logger = new Logger(PageEventService.name);
  private readonly serviceName = 'page-service';

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available - events will not be published');
    }
  }

  async publishPageCreated(data: PageCreatedData): Promise<void> {
    const event: PageCreatedEvent = {
      id: uuidv4(),
      type: 'page.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.PAGE_CREATED);
  }

  async publishPageUpdated(data: PageUpdatedData): Promise<void> {
    const event: PageUpdatedEvent = {
      id: uuidv4(),
      type: 'page.updated',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.PAGE_UPDATED);
  }

  async publishPageDeleted(data: PageDeletedData): Promise<void> {
    const event: PageDeletedEvent = {
      id: uuidv4(),
      type: 'page.deleted',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.PAGE_DELETED);
  }

  async publishPageViewed(data: PageViewedData): Promise<void> {
    const event: PageViewedEvent = {
      id: uuidv4(),
      type: 'page.viewed',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.PAGE_VIEWED);
  }

  async publishBioLinkCreated(data: BioLinkCreatedData): Promise<void> {
    const event: BioLinkCreatedEvent = {
      id: uuidv4(),
      type: 'biolink.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.BIOLINK_CREATED);
  }

  async publishBioLinkUpdated(data: BioLinkUpdatedData): Promise<void> {
    const event: BioLinkUpdatedEvent = {
      id: uuidv4(),
      type: 'biolink.updated',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.BIOLINK_UPDATED);
  }

  async publishBioLinkViewed(data: BioLinkViewedData): Promise<void> {
    const event: BioLinkViewedEvent = {
      id: uuidv4(),
      type: 'biolink.viewed',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.BIOLINK_VIEWED);
  }

  private async publish(
    event: PageCreatedEvent | PageUpdatedEvent | PageDeletedEvent | PageViewedEvent | BioLinkCreatedEvent | BioLinkUpdatedEvent | BioLinkViewedEvent,
    routingKey: string,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`Skipping event publish (no channel): ${event.type}`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(PAGE_EVENTS_EXCHANGE, routingKey, message, {
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
