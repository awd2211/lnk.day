import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SagaOrchestrator,
  SagaBuilder,
  createStepHandler,
  SagaExecutionResult,
} from '@lnk/nestjs-common';

/**
 * 创建 Campaign Saga Payload
 */
export interface CreateCampaignSagaPayload {
  userId: string;
  teamId?: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  goals?: {
    type: string;
    target: number;
  }[];
  notifyOnGoalReached?: boolean;
}

/**
 * 创建 Campaign Saga
 *
 * 处理跨服务的 Campaign 创建事务：
 * 1. 验证用户 Campaign 配额
 * 2. 创建 Campaign 记录
 * 3. 初始化 Campaign 目标
 * 4. 设置通知订阅
 */
@Injectable()
export class CreateCampaignSaga implements OnModuleInit {
  private readonly logger = new Logger(CreateCampaignSaga.name);
  private readonly SAGA_TYPE = 'create-campaign';

  constructor(private readonly sagaOrchestrator: SagaOrchestrator) {}

  onModuleInit() {
    this.registerSaga();
  }

  private registerSaga(): void {
    const sagaConfig = SagaBuilder.create(this.SAGA_TYPE)
      // 步骤 1: 验证 Campaign 配额
      .step(
        'check-campaign-quota',
        'user-service',
        createStepHandler<CreateCampaignSagaPayload, { allowed: boolean; limit: number }>(
          async (payload, ctx) => {
            this.logger.debug(`Checking campaign quota for user ${payload.userId}`);
            // const quota = await this.userServiceClient.getCampaignQuota(payload.userId);
            return { allowed: true, limit: 10 };
          },
          async (payload, ctx) => {
            this.logger.debug('Compensating: check-campaign-quota (no-op)');
          },
        ),
        { retryable: true },
      )
      // 步骤 2: 创建 Campaign 记录
      .step(
        'create-campaign-record',
        'campaign-service',
        createStepHandler<CreateCampaignSagaPayload, { campaignId: string }>(
          async (payload, ctx) => {
            this.logger.debug(`Creating campaign: ${payload.name}`);
            // const campaign = await this.campaignService.create(payload);
            const campaignId = `campaign_${Date.now()}`;
            return { campaignId };
          },
          async (payload, ctx) => {
            const result = ctx.previousResults['create-campaign-record'];
            if (result?.campaignId) {
              this.logger.debug(`Compensating: deleting campaign ${result.campaignId}`);
              // await this.campaignService.delete(result.campaignId);
            }
          },
        ),
      )
      // 步骤 3: 初始化 Campaign 目标
      .step(
        'init-campaign-goals',
        'campaign-service',
        createStepHandler<CreateCampaignSagaPayload, { goalIds: string[] }>(
          async (payload, ctx) => {
            const campaignId = ctx.previousResults['create-campaign-record']?.campaignId;
            if (!payload.goals?.length) {
              return { goalIds: [] };
            }
            this.logger.debug(`Initializing ${payload.goals.length} goals for campaign ${campaignId}`);
            // const goals = await this.goalsService.createForCampaign(campaignId, payload.goals);
            return { goalIds: payload.goals.map((_, i) => `goal_${i}`) };
          },
          async (payload, ctx) => {
            const result = ctx.previousResults['init-campaign-goals'];
            if (result?.goalIds?.length) {
              this.logger.debug(`Compensating: deleting ${result.goalIds.length} goals`);
              // await this.goalsService.deleteMultiple(result.goalIds);
            }
          },
        ),
      )
      // 步骤 4: 设置通知订阅
      .step(
        'setup-notifications',
        'notification-service',
        createStepHandler<CreateCampaignSagaPayload, { subscriptionId?: string }>(
          async (payload, ctx) => {
            if (!payload.notifyOnGoalReached) {
              return { subscriptionId: undefined };
            }
            const campaignId = ctx.previousResults['create-campaign-record']?.campaignId;
            this.logger.debug(`Setting up goal notifications for campaign ${campaignId}`);
            // const sub = await this.notificationClient.subscribe(payload.userId, 'campaign.goal.reached', campaignId);
            return { subscriptionId: `sub_${campaignId}` };
          },
          async (payload, ctx) => {
            const result = ctx.previousResults['setup-notifications'];
            if (result?.subscriptionId) {
              this.logger.debug(`Compensating: canceling subscription ${result.subscriptionId}`);
              // await this.notificationClient.unsubscribe(result.subscriptionId);
            }
          },
        ),
        { retryable: true },
      )
      .withRetries(3)
      .withTimeout(30000)
      .build();

    this.sagaOrchestrator.registerSaga(sagaConfig);
    this.logger.log(`Saga registered: ${this.SAGA_TYPE}`);
  }

  async execute(payload: CreateCampaignSagaPayload): Promise<SagaExecutionResult> {
    return this.sagaOrchestrator.execute(this.SAGA_TYPE, payload);
  }
}
