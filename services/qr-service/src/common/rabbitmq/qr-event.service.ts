import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CHANNEL, QR_EVENTS_EXCHANGE } from './rabbitmq.constants';
import {
  QRCreatedEvent,
  QRUpdatedEvent,
  QRDeletedEvent,
  QRScannedEvent,
  ROUTING_KEYS,
} from '@lnk/shared-types';

export interface QRCreatedData {
  qrId: string;
  linkId?: string;
  shortCode?: string;
  format: string;
  userId: string;
  teamId?: string;
}

export interface QRUpdatedData {
  qrId: string;
  changes: Record<string, any>;
  userId: string;
  teamId?: string;
}

export interface QRDeletedData {
  qrId: string;
  userId: string;
  teamId?: string;
}

export interface QRScannedData {
  qrId: string;
  linkId?: string;
  shortCode?: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  device?: string;
}

@Injectable()
export class QREventService {
  private readonly logger = new Logger(QREventService.name);
  private readonly serviceName = 'qr-service';

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available - events will not be published');
    }
  }

  async publishQRCreated(data: QRCreatedData): Promise<void> {
    const event: QRCreatedEvent = {
      id: uuidv4(),
      type: 'qr.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.QR_CREATED);
  }

  async publishQRUpdated(data: QRUpdatedData): Promise<void> {
    const event: QRUpdatedEvent = {
      id: uuidv4(),
      type: 'qr.updated',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.QR_UPDATED);
  }

  async publishQRDeleted(data: QRDeletedData): Promise<void> {
    const event: QRDeletedEvent = {
      id: uuidv4(),
      type: 'qr.deleted',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.QR_DELETED);
  }

  async publishQRScanned(data: QRScannedData): Promise<void> {
    const event: QRScannedEvent = {
      id: uuidv4(),
      type: 'qr.scanned',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.QR_SCANNED);
  }

  private async publish(
    event: QRCreatedEvent | QRUpdatedEvent | QRDeletedEvent | QRScannedEvent,
    routingKey: string,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`Skipping event publish (no channel): ${event.type}`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(QR_EVENTS_EXCHANGE, routingKey, message, {
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
