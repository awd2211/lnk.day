import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { WebhookFilters } from './entities/webhook-endpoint.entity';

export interface WebhookConfig {
  id: string;
  teamId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  enabled: boolean;
  filters?: WebhookFilters;
  headers?: Record<string, string>;
}

export type WebhookEvent =
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.clicked'
  | 'link.milestone'
  | 'link.expired'
  | 'qr.created'
  | 'qr.scanned'
  | 'qr.updated'
  | 'qr.deleted'
  | 'page.created'
  | 'page.published'
  | 'page.unpublished'
  | 'page.deleted'
  | 'campaign.created'
  | 'campaign.started'
  | 'campaign.ended'
  | 'campaign.goal_reached'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.role_changed'
  | 'analytics.threshold'
  | 'analytics.anomaly';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectQueue('webhook')
    private readonly webhookQueue: Queue,
  ) {}

  async send(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    if (!config.enabled) {
      this.logger.debug(`Webhook ${config.id} is disabled, skipping`);
      return;
    }

    if (!config.events.includes(payload.event)) {
      this.logger.debug(`Webhook ${config.id} not subscribed to ${payload.event}, skipping`);
      return;
    }

    // Check filters
    if (!this.matchesFilters(config.filters, payload.data)) {
      this.logger.debug(`Webhook ${config.id} filters not matched, skipping`);
      return;
    }

    const signature = this.generateSignature(payload, config.secret);

    await this.webhookQueue.add(
      'deliver',
      {
        webhookId: config.id,
        url: config.url,
        payload,
        signature,
        headers: config.headers,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendToAll(teamId: string, webhooks: WebhookConfig[], payload: WebhookPayload): Promise<void> {
    const promises = webhooks
      .filter((w) => w.teamId === teamId)
      .map((webhook) => this.send(webhook, payload));

    await Promise.all(promises);
  }

  /**
   * Check if event data matches webhook filters
   */
  matchesFilters(filters: WebhookFilters | undefined, data: Record<string, any>): boolean {
    if (!filters) return true;

    // Check tag filter
    if (filters.tags && filters.tags.length > 0) {
      const dataTags = data.tags || [];
      const hasMatchingTag = filters.tags.some((tag) => dataTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Check link ID filter
    if (filters.linkIds && filters.linkIds.length > 0) {
      if (!filters.linkIds.includes(data.link_id) && !filters.linkIds.includes(data.linkId)) {
        return false;
      }
    }

    // Check campaign ID filter
    if (filters.campaignIds && filters.campaignIds.length > 0) {
      if (!filters.campaignIds.includes(data.campaign_id) && !filters.campaignIds.includes(data.campaignId)) {
        return false;
      }
    }

    // Check domain filter
    if (filters.domains && filters.domains.length > 0) {
      if (!filters.domains.includes(data.domain)) {
        return false;
      }
    }

    // Check threshold condition
    if (filters.threshold) {
      const { metric, operator, value } = filters.threshold;
      const metricValue = data[metric] || data[`total_${metric}`] || 0;

      switch (operator) {
        case 'gt':
          if (!(metricValue > value)) return false;
          break;
        case 'gte':
          if (!(metricValue >= value)) return false;
          break;
        case 'lt':
          if (!(metricValue < value)) return false;
          break;
        case 'lte':
          if (!(metricValue <= value)) return false;
          break;
        case 'eq':
          if (metricValue !== value) return false;
          break;
      }
    }

    return true;
  }

  generateSignature(payload: WebhookPayload, secret: string): string {
    const body = JSON.stringify(payload);
    return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
