import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SagaOrchestrator,
  SagaBuilder,
  createStepHandler,
  SagaContext,
  SagaExecutionResult,
} from '@lnk/nestjs-common';

/**
 * 创建链接 Saga 的 Payload
 */
export interface CreateLinkSagaPayload {
  userId: string;
  teamId?: string;
  originalUrl: string;
  customAlias?: string;
  campaignId?: string;
  tags?: string[];
  expiresAt?: string;
}

/**
 * 创建链接 Saga
 *
 * 处理跨服务的链接创建事务：
 * 1. 验证用户配额
 * 2. 创建链接记录
 * 3. 更新 Campaign 统计（如果关联了 Campaign）
 * 4. 更新缓存
 */
@Injectable()
export class CreateLinkSaga implements OnModuleInit {
  private readonly logger = new Logger(CreateLinkSaga.name);
  private readonly SAGA_TYPE = 'create-link';

  constructor(private readonly sagaOrchestrator: SagaOrchestrator) {}

  onModuleInit() {
    this.registerSaga();
  }

  /**
   * 注册 Saga 定义
   */
  private registerSaga(): void {
    const sagaConfig = SagaBuilder.create(this.SAGA_TYPE)
      // 步骤 1: 检查用户配额
      .step(
        'check-quota',
        'user-service',
        createStepHandler<CreateLinkSagaPayload, { allowed: boolean; remaining: number }>(
          async (payload, ctx) => {
            this.logger.debug(`Checking quota for user ${payload.userId}`);
            // 实际实现会调用 user-service API
            // const response = await this.userServiceClient.checkQuota(payload.userId);
            return { allowed: true, remaining: 100 };
          },
          async (payload, ctx) => {
            // 配额检查无需补偿
            this.logger.debug(`Compensating quota check (no-op)`);
          },
        ),
        { retryable: true, maxRetries: 2 },
      )
      // 步骤 2: 创建链接记录
      .step(
        'create-link-record',
        'link-service',
        createStepHandler<CreateLinkSagaPayload, { linkId: string; shortCode: string }>(
          async (payload, ctx) => {
            this.logger.debug(`Creating link record for ${payload.originalUrl}`);
            // 实际实现会创建数据库记录
            // const link = await this.linkService.create(payload);
            const linkId = `link_${Date.now()}`;
            const shortCode = Math.random().toString(36).substring(2, 8);
            return { linkId, shortCode };
          },
          async (payload, ctx) => {
            // 补偿：删除已创建的链接
            const linkResult = ctx.previousResults['create-link-record'];
            if (linkResult?.linkId) {
              this.logger.debug(`Compensating: deleting link ${linkResult.linkId}`);
              // await this.linkService.delete(linkResult.linkId);
            }
          },
        ),
      )
      // 步骤 3: 更新 Campaign 统计
      .step(
        'update-campaign-stats',
        'campaign-service',
        createStepHandler<CreateLinkSagaPayload, { updated: boolean }>(
          async (payload, ctx) => {
            if (!payload.campaignId) {
              this.logger.debug(`No campaign associated, skipping`);
              return { updated: false };
            }

            this.logger.debug(`Updating campaign ${payload.campaignId} stats`);
            // 实际实现会调用 campaign-service API
            // await this.campaignServiceClient.incrementLinkCount(payload.campaignId);
            return { updated: true };
          },
          async (payload, ctx) => {
            // 补偿：减少 Campaign 链接计数
            if (payload.campaignId) {
              this.logger.debug(
                `Compensating: decrementing campaign ${payload.campaignId} link count`,
              );
              // await this.campaignServiceClient.decrementLinkCount(payload.campaignId);
            }
          },
        ),
        { retryable: true },
      )
      // 步骤 4: 更新缓存
      .step(
        'update-cache',
        'link-service',
        createStepHandler<CreateLinkSagaPayload, { cached: boolean }>(
          async (payload, ctx) => {
            const linkResult = ctx.previousResults['create-link-record'];
            this.logger.debug(`Updating cache for ${linkResult?.shortCode}`);
            // 实际实现会更新 Redis 缓存
            // await this.cacheService.set(`link:${linkResult.shortCode}`, linkResult);
            return { cached: true };
          },
          async (payload, ctx) => {
            // 补偿：清除缓存
            const linkResult = ctx.previousResults['create-link-record'];
            if (linkResult?.shortCode) {
              this.logger.debug(`Compensating: clearing cache for ${linkResult.shortCode}`);
              // await this.cacheService.del(`link:${linkResult.shortCode}`);
            }
          },
        ),
      )
      .withRetries(3)
      .withRetryDelay(1000)
      .withTimeout(30000)
      .build();

    this.sagaOrchestrator.registerSaga(sagaConfig);
    this.logger.log(`Saga registered: ${this.SAGA_TYPE}`);
  }

  /**
   * 执行创建链接 Saga
   */
  async execute(payload: CreateLinkSagaPayload): Promise<SagaExecutionResult> {
    return this.sagaOrchestrator.execute(this.SAGA_TYPE, payload, {
      initiatedBy: payload.userId,
      initiatedAt: new Date().toISOString(),
    });
  }
}
