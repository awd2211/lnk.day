import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import {
  WebhookEndpoint,
  WebhookEventType,
  WebhookStatus,
} from './entities/webhook-endpoint.entity';
import { WebhookDelivery, DeliveryStatus } from './entities/webhook-delivery.entity';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/create-webhook.dto';
import { WebhookService } from './webhook.service';

@Injectable()
export class WebhookEndpointService {
  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly webhookRepository: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepository: Repository<WebhookDelivery>,
    private readonly webhookService: WebhookService,
  ) {}

  async create(
    dto: CreateWebhookDto,
    userId: string,
    teamId: string,
  ): Promise<WebhookEndpoint> {
    // 生成密钥
    const secret = this.generateSecret();

    const webhook = this.webhookRepository.create({
      ...dto,
      userId,
      teamId,
      secret,
      enabled: true,
      status: WebhookStatus.ACTIVE,
    });

    return this.webhookRepository.save(webhook);
  }

  async findAll(
    teamId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ webhooks: WebhookEndpoint[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [webhooks, total] = await this.webhookRepository.findAndCount({
      where: { teamId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'name',
        'url',
        'events',
        'status',
        'enabled',
        'description',
        'successCount',
        'failureCount',
        'lastTriggeredAt',
        'lastSuccessAt',
        'lastFailureAt',
        'createdAt',
      ],
    });

    return { webhooks, total };
  }

  async findOne(id: string): Promise<WebhookEndpoint> {
    const webhook = await this.webhookRepository.findOne({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }
    return webhook;
  }

  async update(id: string, dto: UpdateWebhookDto): Promise<WebhookEndpoint> {
    const webhook = await this.findOne(id);
    Object.assign(webhook, dto);

    // 如果更新了 URL，重置失败计数
    if (dto.url && dto.url !== webhook.url) {
      webhook.consecutiveFailures = 0;
      webhook.status = WebhookStatus.ACTIVE;
    }

    return this.webhookRepository.save(webhook);
  }

  async remove(id: string): Promise<void> {
    const webhook = await this.findOne(id);
    await this.webhookRepository.remove(webhook);
  }

  async enable(id: string): Promise<WebhookEndpoint> {
    const webhook = await this.findOne(id);
    webhook.enabled = true;
    webhook.status = WebhookStatus.ACTIVE;
    webhook.consecutiveFailures = 0;
    return this.webhookRepository.save(webhook);
  }

  async disable(id: string): Promise<WebhookEndpoint> {
    const webhook = await this.findOne(id);
    webhook.enabled = false;
    webhook.status = WebhookStatus.INACTIVE;
    return this.webhookRepository.save(webhook);
  }

  async regenerateSecret(id: string): Promise<{ secret: string }> {
    const webhook = await this.findOne(id);
    webhook.secret = this.generateSecret();
    await this.webhookRepository.save(webhook);
    return { secret: webhook.secret };
  }

  async testWebhook(
    id: string,
    event: WebhookEventType,
  ): Promise<{ success: boolean; message: string }> {
    const webhook = await this.findOne(id);

    const testPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
        webhookId: id,
      },
    };

    try {
      await this.webhookService.send(
        {
          id: webhook.id,
          teamId: webhook.teamId,
          url: webhook.url,
          secret: webhook.secret,
          events: webhook.events as any,
          enabled: true,
        },
        testPayload,
      );

      return {
        success: true,
        message: 'Test webhook queued for delivery',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send test webhook',
      };
    }
  }

  async getDeliveries(
    webhookId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: { webhookId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { deliveries, total };
  }

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${deliveryId} not found`);
    }

    if (delivery.status === DeliveryStatus.SUCCESS) {
      throw new BadRequestException('Cannot retry a successful delivery');
    }

    const webhook = await this.findOne(delivery.webhookId);

    await this.webhookService.send(
      {
        id: webhook.id,
        teamId: webhook.teamId,
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events as any,
        enabled: true,
      },
      {
        event: delivery.event as any,
        timestamp: new Date().toISOString(),
        data: delivery.payload,
      },
    );

    delivery.status = DeliveryStatus.RETRYING;
    delivery.attempts += 1;
    return this.deliveryRepository.save(delivery);
  }

  async getWebhooksByTeam(teamId: string): Promise<WebhookEndpoint[]> {
    return this.webhookRepository.find({
      where: { teamId, enabled: true },
    });
  }

  async recordDeliveryResult(
    webhookId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId },
    });

    if (!webhook) return;

    webhook.lastTriggeredAt = new Date();

    if (success) {
      webhook.successCount += 1;
      webhook.lastSuccessAt = new Date();
      webhook.consecutiveFailures = 0;
      webhook.status = WebhookStatus.ACTIVE;
    } else {
      webhook.failureCount += 1;
      webhook.lastFailureAt = new Date();
      webhook.lastErrorMessage = error || 'Unknown error';
      webhook.consecutiveFailures += 1;

      // 连续失败 5 次后标记为 failing
      if (webhook.consecutiveFailures >= 5) {
        webhook.status = WebhookStatus.FAILING;
      }

      // 连续失败 10 次后禁用
      if (webhook.consecutiveFailures >= 10) {
        webhook.enabled = false;
        webhook.status = WebhookStatus.DISABLED;
      }
    }

    await this.webhookRepository.save(webhook);
  }

  private generateSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }
}
