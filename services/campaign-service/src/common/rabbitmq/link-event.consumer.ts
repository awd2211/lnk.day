import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { RABBITMQ_CHANNEL, CAMPAIGN_LINK_EVENTS_QUEUE } from './rabbitmq.constants';
import { LinkCreatedEvent, LinkUpdatedEvent, LinkDeletedEvent } from '@lnk/shared-types';

type LinkEvent = LinkCreatedEvent | LinkUpdatedEvent | LinkDeletedEvent;

@Injectable()
export class LinkEventConsumer {
  private readonly logger = new Logger(LinkEventConsumer.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {}

  async startConsuming(): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available - cannot consume link events');
      return;
    }

    try {
      await this.channel.consume(
        CAMPAIGN_LINK_EVENTS_QUEUE,
        async (msg) => {
          if (msg) {
            await this.handleMessage(msg);
          }
        },
        { noAck: false },
      );

      this.logger.log('Started consuming link events');
    } catch (error: any) {
      this.logger.error(`Failed to start consuming: ${error.message}`);
    }
  }

  private async handleMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const event: LinkEvent = JSON.parse(content);

      this.logger.debug(`Received link event: ${event.type}`);

      switch (event.type) {
        case 'link.created':
          await this.handleLinkCreated(event as LinkCreatedEvent);
          break;
        case 'link.updated':
          await this.handleLinkUpdated(event as LinkUpdatedEvent);
          break;
        case 'link.deleted':
          await this.handleLinkDeleted(event as LinkDeletedEvent);
          break;
        default:
          this.logger.warn(`Unknown event type: ${(event as any).type}`);
      }

      // Acknowledge the message
      this.channel?.ack(msg);
    } catch (error: any) {
      this.logger.error(`Failed to process message: ${error.message}`);
      // Reject and don't requeue (dead letter)
      this.channel?.nack(msg, false, false);
    }
  }

  private async handleLinkCreated(event: LinkCreatedEvent): Promise<void> {
    const { linkId, shortCode, campaignId } = event.data;

    if (campaignId) {
      this.logger.log(`Link ${shortCode} created for campaign ${campaignId}`);
      // TODO: Update campaign link count, trigger notifications, etc.
    }
  }

  private async handleLinkUpdated(event: LinkUpdatedEvent): Promise<void> {
    const { linkId, shortCode, changes } = event.data;
    this.logger.debug(`Link ${shortCode} updated: ${JSON.stringify(changes)}`);
    // TODO: Handle campaign-related updates
  }

  private async handleLinkDeleted(event: LinkDeletedEvent): Promise<void> {
    const { linkId, shortCode } = event.data;
    this.logger.log(`Link ${shortCode} deleted`);
    // TODO: Update campaign stats, handle cleanup
  }
}
