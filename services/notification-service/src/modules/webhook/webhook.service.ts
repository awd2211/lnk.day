import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';

export interface WebhookConfig {
  id: string;
  teamId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  enabled: boolean;
}

export type WebhookEvent =
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.clicked'
  | 'link.milestone'
  | 'page.published'
  | 'team.member_added'
  | 'team.member_removed';

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

    const signature = this.generateSignature(payload, config.secret);

    await this.webhookQueue.add(
      'deliver',
      {
        webhookId: config.id,
        url: config.url,
        payload,
        signature,
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

  generateSignature(payload: WebhookPayload, secret: string): string {
    const body = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
