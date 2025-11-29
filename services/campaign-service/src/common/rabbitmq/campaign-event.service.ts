import { Injectable, Inject, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CHANNEL, CAMPAIGN_EVENTS_EXCHANGE } from './rabbitmq.constants';
import {
  CampaignCreatedEvent,
  CampaignGoalReachedEvent,
  ROUTING_KEYS,
} from '@lnk/shared-types';

export interface CampaignCreatedData {
  campaignId: string;
  name: string;
  userId: string;
  teamId?: string;
}

export interface GoalReachedData {
  campaignId: string;
  goalId: string;
  goalName: string;
  targetValue: number;
  currentValue: number;
  userId: string;
}

export interface CampaignLinkEventData {
  campaignId: string;
  linkId: string;
  shortCode: string;
  teamId: string;
}

@Injectable()
export class CampaignEventService {
  private readonly logger = new Logger(CampaignEventService.name);
  private readonly serviceName = 'campaign-service';

  constructor(
    @Inject(RABBITMQ_CHANNEL)
    private readonly channel: amqplib.Channel | null,
  ) {
    if (!channel) {
      this.logger.warn('RabbitMQ channel not available - events will not be published');
    }
  }

  async publishCampaignCreated(data: CampaignCreatedData): Promise<void> {
    const event: CampaignCreatedEvent = {
      id: uuidv4(),
      type: 'campaign.created',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.CAMPAIGN_CREATED);
  }

  async publishGoalReached(data: GoalReachedData): Promise<void> {
    const event: CampaignGoalReachedEvent = {
      id: uuidv4(),
      type: 'campaign.goal.reached',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, ROUTING_KEYS.CAMPAIGN_GOAL_REACHED);
  }

  async publishCampaignLinkAdded(data: CampaignLinkEventData): Promise<void> {
    const event = {
      id: uuidv4(),
      type: 'campaign.link.added',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, 'campaign.link.added');
  }

  async publishCampaignLinkRemoved(data: CampaignLinkEventData): Promise<void> {
    const event = {
      id: uuidv4(),
      type: 'campaign.link.removed',
      timestamp: new Date().toISOString(),
      source: this.serviceName,
      data,
    };
    await this.publish(event, 'campaign.link.removed');
  }

  private async publish(event: any, routingKey: string): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`Skipping event publish (no channel): ${event.type}`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(CAMPAIGN_EVENTS_EXCHANGE, routingKey, message, {
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
