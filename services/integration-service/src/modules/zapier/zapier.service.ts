import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZapierSubscription } from './entities/zapier-subscription.entity';
import * as crypto from 'crypto';

export type TriggerEvent =
  | 'link.created'
  | 'link.clicked'
  | 'link.updated'
  | 'link.deleted'
  | 'link.milestone'
  | 'qr.scanned'
  | 'page.published'
  | 'user.invited'
  | 'campaign.started'
  | 'campaign.ended';

export interface TriggerPayload {
  event: TriggerEvent;
  data: Record<string, any>;
  timestamp: string;
  teamId: string;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable()
export class ZapierService {
  private readonly logger = new Logger(ZapierService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ZapierSubscription)
    private readonly subscriptionRepository: Repository<ZapierSubscription>,
  ) {
    this.webhookSecret = this.configService.get<string>('ZAPIER_WEBHOOK_SECRET', 'zapier-secret');
  }

  // ==================== Triggers (Instant) ====================

  async subscribeToTrigger(
    teamId: string,
    event: TriggerEvent,
    webhookUrl: string,
  ): Promise<ZapierSubscription> {
    const subscription = this.subscriptionRepository.create({
      teamId,
      event,
      webhookUrl,
      enabled: true,
    });

    return this.subscriptionRepository.save(subscription);
  }

  async unsubscribeFromTrigger(subscriptionId: string, teamId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, teamId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.subscriptionRepository.remove(subscription);
  }

  async getSubscriptions(teamId: string): Promise<ZapierSubscription[]> {
    return this.subscriptionRepository.find({
      where: { teamId, enabled: true },
    });
  }

  async fireTrigger(event: TriggerEvent, teamId: string, data: Record<string, any>): Promise<void> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { event, teamId, enabled: true },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No Zapier subscriptions for event ${event} in team ${teamId}`);
      return;
    }

    const payload: TriggerPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      teamId,
    };

    // Fire webhooks in parallel
    await Promise.all(
      subscriptions.map((sub) => this.sendWebhook(sub, payload)),
    );
  }

  private async sendWebhook(subscription: ZapierSubscription, payload: TriggerPayload): Promise<void> {
    try {
      const signature = this.generateSignature(JSON.stringify(payload));

      const response = await fetch(subscription.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lnk-Signature': signature,
          'X-Lnk-Event': payload.event,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
        // Mark subscription as failing
        subscription.failureCount = (subscription.failureCount || 0) + 1;
        subscription.lastFailure = new Date();

        // Disable after 5 consecutive failures
        if (subscription.failureCount >= 5) {
          subscription.enabled = false;
          this.logger.warn(`Disabled Zapier subscription ${subscription.id} after 5 failures`);
        }

        await this.subscriptionRepository.save(subscription);
      } else {
        // Reset failure count on success
        if (subscription.failureCount > 0) {
          subscription.failureCount = 0;
          subscription.lastFailure = null;
          await this.subscriptionRepository.save(subscription);
        }
        this.logger.debug(`Zapier webhook sent successfully for ${payload.event}`);
      }
    } catch (error) {
      this.logger.error(`Zapier webhook error: ${error.message}`);
    }
  }

  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
  }

  // ==================== Actions ====================

  async createLink(
    teamId: string,
    data: {
      url: string;
      title?: string;
      customSlug?: string;
      tags?: string[];
      folderId?: string;
    },
  ): Promise<ActionResult> {
    try {
      // Call link service API
      const linkServiceUrl = this.configService.get<string>('LINK_SERVICE_URL', 'http://localhost:60003');

      const response = await fetch(`${linkServiceUrl}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
        body: JSON.stringify({
          originalUrl: data.url,
          title: data.title,
          customSlug: data.customSlug,
          tags: data.tags,
          folderId: data.folderId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const link = await response.json();
      return { success: true, data: link };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateLink(
    teamId: string,
    linkId: string,
    data: {
      title?: string;
      originalUrl?: string;
      tags?: string[];
      enabled?: boolean;
    },
  ): Promise<ActionResult> {
    try {
      const linkServiceUrl = this.configService.get<string>('LINK_SERVICE_URL', 'http://localhost:60003');

      const response = await fetch(`${linkServiceUrl}/links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const link = await response.json();
      return { success: true, data: link };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteLink(teamId: string, linkId: string): Promise<ActionResult> {
    try {
      const linkServiceUrl = this.configService.get<string>('LINK_SERVICE_URL', 'http://localhost:60003');

      const response = await fetch(`${linkServiceUrl}/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLink(teamId: string, linkId: string): Promise<ActionResult> {
    try {
      const linkServiceUrl = this.configService.get<string>('LINK_SERVICE_URL', 'http://localhost:60003');

      const response = await fetch(`${linkServiceUrl}/links/${linkId}`, {
        headers: {
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const link = await response.json();
      return { success: true, data: link };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLinkStats(teamId: string, linkId: string): Promise<ActionResult> {
    try {
      const analyticsServiceUrl = this.configService.get<string>('ANALYTICS_SERVICE_URL', 'http://localhost:8000');

      const response = await fetch(`${analyticsServiceUrl}/api/analytics/links/${linkId}/stats`, {
        headers: {
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const stats = await response.json();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createQrCode(
    teamId: string,
    data: {
      url: string;
      size?: number;
      foregroundColor?: string;
      backgroundColor?: string;
      format?: 'png' | 'svg';
    },
  ): Promise<ActionResult> {
    try {
      const qrServiceUrl = this.configService.get<string>('QR_SERVICE_URL', 'http://localhost:60005');

      const response = await fetch(`${qrServiceUrl}/qr/dataurl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Team-Id': teamId,
        },
        body: JSON.stringify({
          url: data.url,
          options: {
            size: data.size || 300,
            foregroundColor: data.foregroundColor,
            backgroundColor: data.backgroundColor,
            format: data.format,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Polling Triggers (for legacy support) ====================

  async getRecentLinks(teamId: string, since?: Date): Promise<any[]> {
    try {
      const linkServiceUrl = this.configService.get<string>('LINK_SERVICE_URL', 'http://localhost:60003');

      let url = `${linkServiceUrl}/links?limit=100&sort=createdAt:desc`;
      if (since) {
        url += `&since=${since.toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json() as any;
      return result.links || [];
    } catch (error: any) {
      this.logger.error(`Failed to get recent links: ${error.message}`);
      return [];
    }
  }

  async getRecentClicks(teamId: string, since?: Date): Promise<any[]> {
    try {
      const analyticsServiceUrl = this.configService.get<string>('ANALYTICS_SERVICE_URL', 'http://localhost:8000');

      let url = `${analyticsServiceUrl}/api/analytics/clicks/recent?limit=100`;
      if (since) {
        url += `&since=${since.toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Team-Id': teamId,
          'X-Internal-Auth': this.configService.get<string>('INTERNAL_API_KEY'),
        },
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json() as any;
      return result.clicks || [];
    } catch (error: any) {
      this.logger.error(`Failed to get recent clicks: ${error.message}`);
      return [];
    }
  }

  // ==================== Sample Data (for Zapier Testing) ====================

  getSampleData(event: TriggerEvent): Record<string, any> {
    const samples: Record<TriggerEvent, Record<string, any>> = {
      'link.created': {
        id: 'link_abc123',
        shortCode: 'abc123',
        shortUrl: 'https://lnk.day/abc123',
        originalUrl: 'https://example.com/long-url',
        title: 'Sample Link',
        tags: ['sample', 'test'],
        createdAt: new Date().toISOString(),
      },
      'link.clicked': {
        linkId: 'link_abc123',
        shortCode: 'abc123',
        timestamp: new Date().toISOString(),
        country: 'US',
        city: 'New York',
        device: 'desktop',
        browser: 'Chrome',
        referer: 'https://google.com',
      },
      'link.updated': {
        id: 'link_abc123',
        changes: { title: 'New Title', tags: ['updated'] },
        updatedAt: new Date().toISOString(),
      },
      'link.deleted': {
        id: 'link_abc123',
        shortCode: 'abc123',
        deletedAt: new Date().toISOString(),
      },
      'link.milestone': {
        linkId: 'link_abc123',
        shortCode: 'abc123',
        milestone: 1000,
        currentClicks: 1000,
        reachedAt: new Date().toISOString(),
      },
      'qr.scanned': {
        qrId: 'qr_xyz789',
        linkId: 'link_abc123',
        timestamp: new Date().toISOString(),
        country: 'US',
        device: 'mobile',
      },
      'page.published': {
        pageId: 'page_123',
        slug: 'my-page',
        url: 'https://lnk.day/p/my-page',
        publishedAt: new Date().toISOString(),
      },
      'user.invited': {
        email: 'invited@example.com',
        teamId: 'team_123',
        role: 'member',
        invitedAt: new Date().toISOString(),
      },
      'campaign.started': {
        campaignId: 'camp_123',
        name: 'Sample Campaign',
        startedAt: new Date().toISOString(),
      },
      'campaign.ended': {
        campaignId: 'camp_123',
        name: 'Sample Campaign',
        endedAt: new Date().toISOString(),
        totalClicks: 5000,
      },
    };

    return samples[event] || {};
  }
}
