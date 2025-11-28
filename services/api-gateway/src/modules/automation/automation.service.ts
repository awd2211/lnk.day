import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import {
  AutomationWebhook,
  AutomationPlatform,
  WebhookEvent,
} from './entities/automation-webhook.entity';

export interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, any>;
  timestamp: string;
  teamId: string;
  webhookId: string;
}

export interface CreateWebhookDto {
  name: string;
  platform: AutomationPlatform;
  webhookUrl: string;
  event: WebhookEvent;
  filters?: AutomationWebhook['filters'];
  headers?: Record<string, string>;
  secret?: string;
}

export interface UpdateWebhookDto {
  name?: string;
  webhookUrl?: string;
  event?: WebhookEvent;
  enabled?: boolean;
  filters?: AutomationWebhook['filters'];
  headers?: Record<string, string>;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);
  private readonly defaultSecret: string;

  constructor(
    @InjectRepository(AutomationWebhook)
    private readonly webhookRepository: Repository<AutomationWebhook>,
    private readonly configService: ConfigService,
  ) {
    this.defaultSecret = this.configService.get('WEBHOOK_SECRET', 'automation-secret');
  }

  // ========== Webhook CRUD ==========

  async create(teamId: string, userId: string, dto: CreateWebhookDto): Promise<AutomationWebhook> {
    // 验证 URL
    if (!this.isValidWebhookUrl(dto.webhookUrl)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    // 生成唯一 secret
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

  async findAll(teamId: string, platform?: AutomationPlatform): Promise<AutomationWebhook[]> {
    const where: any = { teamId };
    if (platform) {
      where.platform = platform;
    }

    return this.webhookRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, teamId: string): Promise<AutomationWebhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, teamId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateWebhookDto,
  ): Promise<AutomationWebhook> {
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

  async toggle(id: string, teamId: string): Promise<AutomationWebhook> {
    const webhook = await this.findOne(id, teamId);
    webhook.enabled = !webhook.enabled;
    return this.webhookRepository.save(webhook);
  }

  // ========== Webhook Firing ==========

  async fireEvent(
    event: WebhookEvent,
    teamId: string,
    data: Record<string, any>,
  ): Promise<number> {
    const webhooks = await this.webhookRepository.find({
      where: { event, teamId, enabled: true },
    });

    if (webhooks.length === 0) {
      this.logger.debug(`No webhooks for event ${event} in team ${teamId}`);
      return 0;
    }

    // 过滤符合条件的 webhooks
    const matchingWebhooks = webhooks.filter((wh) => this.matchesFilters(wh, data));

    // 并行发送 webhooks
    const results = await Promise.allSettled(
      matchingWebhooks.map((wh) => this.sendWebhook(wh, event, data)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(
      `Fired ${successCount}/${matchingWebhooks.length} webhooks for event ${event}`,
    );

    return successCount;
  }

  private async sendWebhook(
    webhook: AutomationWebhook,
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

    // 添加平台特定的头部
    if (webhook.platform === AutomationPlatform.MAKE) {
      headers['X-Make-Request'] = 'true';
    } else if (webhook.platform === AutomationPlatform.N8N) {
      headers['X-N8N-Request'] = 'true';
    }

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 更新成功统计
      await this.webhookRepository.update(webhook.id, {
        successCount: () => 'successCount + 1',
        lastTriggeredAt: new Date(),
        lastError: null,
      });

      this.logger.debug(
        `Webhook ${webhook.id} sent successfully in ${Date.now() - startTime}ms`,
      );
    } catch (error: any) {
      // 更新失败统计
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

    const signature = this.generateSignature(
      testPayload,
      webhook.secret || this.defaultSecret,
    );

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

  private matchesFilters(webhook: AutomationWebhook, data: Record<string, any>): boolean {
    const { filters } = webhook;

    if (!filters) return true;

    // 检查 ID 过滤器
    if (filters.linkIds?.length && !filters.linkIds.includes(data.linkId)) {
      return false;
    }
    if (filters.pageIds?.length && !filters.pageIds.includes(data.pageId)) {
      return false;
    }
    if (filters.campaignIds?.length && !filters.campaignIds.includes(data.campaignId)) {
      return false;
    }

    // 检查标签过滤器
    if (filters.tags?.length) {
      const dataTags = data.tags || [];
      if (!filters.tags.some((tag: string) => dataTags.includes(tag))) {
        return false;
      }
    }

    // 检查条件过滤器
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

  private evaluateCondition(
    value: any,
    operator: string,
    compareValue: any,
  ): boolean {
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

  getStats(teamId: string): Promise<{
    total: number;
    enabled: number;
    byPlatform: Record<AutomationPlatform, number>;
    byEvent: Record<string, number>;
    totalSuccesses: number;
    totalFailures: number;
  }> {
    return this.webhookRepository
      .createQueryBuilder('webhook')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN webhook.enabled THEN 1 ELSE 0 END)', 'enabled')
      .addSelect('webhook.platform', 'platform')
      .addSelect('webhook.event', 'event')
      .addSelect('SUM(webhook.successCount)', 'totalSuccesses')
      .addSelect('SUM(webhook.failureCount)', 'totalFailures')
      .where('webhook.teamId = :teamId', { teamId })
      .groupBy('webhook.platform')
      .addGroupBy('webhook.event')
      .getRawMany()
      .then((results) => {
        const stats = {
          total: 0,
          enabled: 0,
          byPlatform: {} as Record<AutomationPlatform, number>,
          byEvent: {} as Record<string, number>,
          totalSuccesses: 0,
          totalFailures: 0,
        };

        for (const row of results) {
          stats.total += parseInt(row.total, 10);
          stats.enabled += parseInt(row.enabled, 10);
          stats.totalSuccesses += parseInt(row.totalSuccesses || '0', 10);
          stats.totalFailures += parseInt(row.totalFailures || '0', 10);

          if (row.platform) {
            stats.byPlatform[row.platform] =
              (stats.byPlatform[row.platform] || 0) + parseInt(row.total, 10);
          }
          if (row.event) {
            stats.byEvent[row.event] =
              (stats.byEvent[row.event] || 0) + parseInt(row.total, 10);
          }
        }

        return stats;
      });
  }
}
