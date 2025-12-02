import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Webhook, WebhookPlatform, WebhookEvent } from './entities/webhook.entity';
import { CreateWebhookDto, UpdateWebhookDto, WebhookTestResult } from './dto/webhook.dto';

export interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, any>;
  timestamp: string;
  teamId: string;
  webhookId: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly defaultSecret: string;

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepository: Repository<Webhook>,
    private readonly configService: ConfigService,
  ) {
    const configuredSecret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!configuredSecret) {
      this.logger.warn('WEBHOOK_SECRET not configured, using random default');
      this.defaultSecret = crypto.randomBytes(32).toString('hex');
    } else {
      this.defaultSecret = configuredSecret;
    }
  }

  // ========== Webhook CRUD ==========

  async create(teamId: string, userId: string, dto: CreateWebhookDto): Promise<Webhook> {
    if (!this.isValidWebhookUrl(dto.webhookUrl)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    const secret = dto.secret || crypto.randomBytes(32).toString('hex');

    const webhook = this.webhookRepository.create({
      teamId,
      userId,
      ...dto,
      secret,
      enabled: true,
    });

    return this.webhookRepository.save(webhook);
  }

  async findAll(teamId: string, platform?: WebhookPlatform): Promise<Webhook[]> {
    const where: any = { teamId };
    if (platform) {
      where.platform = platform;
    }

    return this.webhookRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findAllWithPagination(
    teamId: string,
    options?: {
      platform?: WebhookPlatform;
      enabled?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      search?: string;
    },
  ): Promise<{ items: Webhook[]; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Math.min(Number(options?.limit) || 20, 100);
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';

    const queryBuilder = this.webhookRepository.createQueryBuilder('webhook');

    // Team filter
    queryBuilder.where('webhook.teamId = :teamId', { teamId });

    // Platform filter
    if (options?.platform) {
      queryBuilder.andWhere('webhook.platform = :platform', { platform: options.platform });
    }

    // Enabled filter
    if (options?.enabled !== undefined) {
      queryBuilder.andWhere('webhook.enabled = :enabled', { enabled: options.enabled });
    }

    // Search
    if (options?.search) {
      queryBuilder.andWhere(
        '(webhook.name ILIKE :search OR webhook.webhookUrl ILIKE :search OR webhook.description ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // Sorting (whitelist allowed fields)
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'successCount', 'failureCount', 'lastTriggeredAt', 'platform', 'enabled'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`webhook.${safeSortBy}`, safeSortOrder);

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: string, teamId: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, teamId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async update(id: string, teamId: string, dto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.findOne(id, teamId);

    if (dto.webhookUrl && !this.isValidWebhookUrl(dto.webhookUrl)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    Object.assign(webhook, dto);
    return this.webhookRepository.save(webhook);
  }

  async delete(id: string, teamId: string): Promise<void> {
    const webhook = await this.findOne(id, teamId);
    await this.webhookRepository.remove(webhook);
  }

  async toggle(id: string, teamId: string): Promise<Webhook> {
    const webhook = await this.findOne(id, teamId);
    webhook.enabled = !webhook.enabled;
    return this.webhookRepository.save(webhook);
  }

  async setEnabled(id: string, teamId: string, enabled: boolean): Promise<Webhook> {
    const webhook = await this.findOne(id, teamId);
    webhook.enabled = enabled;
    return this.webhookRepository.save(webhook);
  }

  async regenerateSecret(id: string, teamId: string): Promise<string> {
    const webhook = await this.findOne(id, teamId);
    const newSecret = crypto.randomBytes(32).toString('hex');
    webhook.secret = newSecret;
    await this.webhookRepository.save(webhook);
    return newSecret;
  }

  async getDeliveries(
    webhookId: string,
    teamId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    // 确保 webhook 存在且属于该团队
    await this.findOne(webhookId, teamId);

    // 这里简化实现，实际应该有单独的 delivery 表
    // 目前返回模拟数据基于 webhook 的成功/失败计数
    const webhook = await this.findOne(webhookId, teamId);

    return {
      items: [],
      total: webhook.successCount + webhook.failureCount,
      page,
      limit,
    };
  }

  async retryDelivery(
    deliveryId: string,
    teamId: string,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    // 简化实现 - 实际应该从 delivery 表中获取原始数据并重新发送
    return {
      success: true,
      statusCode: 200,
    };
  }

  // ========== Webhook Firing ==========

  async fireEvent(event: WebhookEvent, teamId: string, data: Record<string, any>): Promise<number> {
    const webhooks = await this.webhookRepository.find({
      where: { event, teamId, enabled: true },
    });

    if (webhooks.length === 0) {
      this.logger.debug(`No webhooks for event ${event} in team ${teamId}`);
      return 0;
    }

    const matchingWebhooks = webhooks.filter((wh) => this.matchesFilters(wh, data));

    const results = await Promise.allSettled(
      matchingWebhooks.map((wh) => this.sendWebhook(wh, event, data)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`Fired ${successCount}/${matchingWebhooks.length} webhooks for event ${event}`);

    return successCount;
  }

  private async sendWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    data: Record<string, any>,
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      teamId: webhook.teamId,
      webhookId: webhook.id,
    };

    const signature = this.generateSignature(payload, webhook.secret || this.defaultSecret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'X-Webhook-Id': webhook.id,
      'X-Timestamp': payload.timestamp,
      ...webhook.headers,
    };

    if (webhook.platform === WebhookPlatform.MAKE) {
      headers['X-Make-Request'] = 'true';
    } else if (webhook.platform === WebhookPlatform.N8N) {
      headers['X-N8N-Request'] = 'true';
    }

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.webhookRepository.update(webhook.id, {
        successCount: () => 'successCount + 1',
        lastTriggeredAt: new Date(),
        lastError: undefined,
      });

      this.logger.debug(`Webhook ${webhook.id} sent successfully in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      await this.webhookRepository.update(webhook.id, {
        failureCount: () => 'failureCount + 1',
        lastTriggeredAt: new Date(),
        lastError: error.message,
      });

      this.logger.error(`Webhook ${webhook.id} failed: ${error.message}`);
      throw error;
    }
  }

  async testWebhook(id: string, teamId: string): Promise<WebhookTestResult> {
    const webhook = await this.findOne(id, teamId);

    const testPayload: WebhookPayload = {
      event: webhook.event,
      data: { test: true, message: 'This is a test webhook from lnk.day' },
      timestamp: new Date().toISOString(),
      teamId,
      webhookId: webhook.id,
    };

    const signature = this.generateSignature(testPayload, webhook.secret || this.defaultSecret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': webhook.event,
      'X-Webhook-Id': webhook.id,
      'X-Webhook-Test': 'true',
      ...webhook.headers,
    };

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      return {
        success: response.ok,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // ========== Helpers ==========

  private matchesFilters(webhook: Webhook, data: Record<string, any>): boolean {
    const { filters } = webhook;

    if (!filters) return true;

    if (filters.linkIds?.length && !filters.linkIds.includes(data.linkId)) {
      return false;
    }
    if (filters.pageIds?.length && !filters.pageIds.includes(data.pageId)) {
      return false;
    }
    if (filters.campaignIds?.length && !filters.campaignIds.includes(data.campaignId)) {
      return false;
    }

    if (filters.tags?.length) {
      const dataTags = data.tags || [];
      if (!filters.tags.some((tag: string) => dataTags.includes(tag))) {
        return false;
      }
    }

    if (filters.conditions?.length) {
      for (const condition of filters.conditions) {
        const fieldValue = data[condition.field];
        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(value: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case 'eq':
        return value === compareValue;
      case 'ne':
        return value !== compareValue;
      case 'gt':
        return value > compareValue;
      case 'lt':
        return value < compareValue;
      case 'contains':
        return String(value).includes(String(compareValue));
      case 'startsWith':
        return String(value).startsWith(String(compareValue));
      default:
        return true;
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // ========== Platform-Specific Helpers ==========

  getMakeWebhookTemplate(): string {
    return `
在 Make.com 中创建一个新场景：
1. 添加 "Webhooks" 模块 → "Custom Webhook"
2. 复制生成的 Webhook URL
3. 在此处粘贴 URL 并选择事件类型
4. 保存后运行测试以验证连接
    `.trim();
  }

  getN8nWebhookTemplate(): string {
    return `
在 n8n 中创建一个新工作流：
1. 添加 "Webhook" 触发器节点
2. 选择 HTTP 方法为 POST
3. 复制生成的 Webhook URL
4. 在此处粘贴 URL 并选择事件类型
5. 激活工作流后运行测试
    `.trim();
  }

  getAvailableEvents(): Array<{ event: WebhookEvent; description: string }> {
    return [
      { event: 'link.created', description: '创建新链接时触发' },
      { event: 'link.clicked', description: '链接被点击时触发' },
      { event: 'link.updated', description: '链接更新时触发' },
      { event: 'link.deleted', description: '链接删除时触发' },
      { event: 'link.milestone', description: '链接达到里程碑时触发（如100次点击）' },
      { event: 'qr.scanned', description: 'QR码被扫描时触发' },
      { event: 'page.published', description: 'Bio页面发布时触发' },
      { event: 'page.viewed', description: 'Bio页面被访问时触发' },
      { event: 'comment.created', description: '新留言时触发' },
      { event: 'user.invited', description: '邀请新用户时触发' },
      { event: 'campaign.started', description: '营销活动开始时触发' },
      { event: 'campaign.ended', description: '营销活动结束时触发' },
      { event: 'form.submitted', description: '表单提交时触发' },
      { event: 'conversion.tracked', description: '追踪到转化时触发' },
    ];
  }

  async getStats(teamId: string): Promise<{
    total: number;
    enabled: number;
    byPlatform: Record<WebhookPlatform, number>;
    byEvent: Record<string, number>;
    totalSuccesses: number;
    totalFailures: number;
  }> {
    const webhooks = await this.webhookRepository.find({ where: { teamId } });

    const stats = {
      total: webhooks.length,
      enabled: webhooks.filter((w) => w.enabled).length,
      byPlatform: {} as Record<WebhookPlatform, number>,
      byEvent: {} as Record<string, number>,
      totalSuccesses: 0,
      totalFailures: 0,
    };

    for (const webhook of webhooks) {
      stats.byPlatform[webhook.platform] = (stats.byPlatform[webhook.platform] || 0) + 1;
      stats.byEvent[webhook.event] = (stats.byEvent[webhook.event] || 0) + 1;
      stats.totalSuccesses += webhook.successCount;
      stats.totalFailures += webhook.failureCount;
    }

    return stats;
  }

  // ========== Global Stats (for admin console) ==========
  async getGlobalStats(): Promise<{
    totalWebhooks: number;
    activeWebhooks: number;
    failedWebhooks: number;
    totalDeliveries: number;
    successRate: number;
    byPlatform: Record<WebhookPlatform, number>;
  }> {
    const webhooks = await this.webhookRepository.find();

    const totalWebhooks = webhooks.length;
    const activeWebhooks = webhooks.filter((w) => w.enabled).length;
    let totalSuccesses = 0;
    let totalFailures = 0;
    const byPlatform = {} as Record<WebhookPlatform, number>;

    for (const webhook of webhooks) {
      totalSuccesses += webhook.successCount;
      totalFailures += webhook.failureCount;
      byPlatform[webhook.platform] = (byPlatform[webhook.platform] || 0) + 1;
    }

    const totalDeliveries = totalSuccesses + totalFailures;
    const successRate = totalDeliveries > 0 ? (totalSuccesses / totalDeliveries) * 100 : 0;
    const failedWebhooks = webhooks.filter((w) => w.failureCount > 0).length;

    return {
      totalWebhooks,
      activeWebhooks,
      failedWebhooks,
      totalDeliveries,
      successRate: Math.round(successRate * 100) / 100,
      byPlatform,
    };
  }
}
