import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CHANNEL, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq.constants';
import {
  DomainCreatedEvent,
  DomainVerifiedEvent,
  DomainVerificationFailedEvent,
  DomainDeletedEvent,
  ROUTING_KEYS,
} from '@lnk/shared-types';

export interface DomainCreatedData {
  domainId: string;
  domain: string;
  type: string;
  userId: string;
  teamId?: string;
}

export interface DomainVerifiedData {
  domainId: string;
  domain: string;
  userId: string;
  teamId?: string;
  verificationMethod: 'dns' | 'http' | 'cname';
}

export interface DomainVerificationFailedData {
  domainId: string;
  domain: string;
  userId: string;
  teamId?: string;
  reason: string;
  attempts: number;
}

export interface DomainDeletedData {
  domainId: string;
  domain: string;
  userId: string;
  teamId?: string;
}

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);
  private readonly serviceName = 'domain-service';

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available - events will not be published');
    }
  }

  async publishDomainCreated(data: DomainCreatedData): Promise<void> {
    const event: DomainCreatedEvent = {
      id: uuidv4(),
      type: 'domain.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.DOMAIN_CREATED);
  }

  async publishDomainVerified(data: DomainVerifiedData): Promise<void> {
    const event: DomainVerifiedEvent = {
      id: uuidv4(),
      type: 'domain.verified',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.DOMAIN_VERIFIED);
  }

  async publishDomainVerificationFailed(data: DomainVerificationFailedData): Promise<void> {
    const event: DomainVerificationFailedEvent = {
      id: uuidv4(),
      type: 'domain.verification.failed',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.DOMAIN_VERIFICATION_FAILED);
  }

  async publishDomainDeleted(data: DomainDeletedData): Promise<void> {
    const event: DomainDeletedEvent = {
      id: uuidv4(),
      type: 'domain.deleted',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.DOMAIN_DELETED);
  }

  private async publish(
    event: DomainCreatedEvent | DomainVerifiedEvent | DomainVerificationFailedEvent | DomainDeletedEvent,
    routingKey: string,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`Skipping event publish (no channel): ${event.type}`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(DOMAIN_EVENTS_EXCHANGE, routingKey, message, {
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
