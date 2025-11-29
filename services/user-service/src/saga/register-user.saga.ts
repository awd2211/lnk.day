import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SagaOrchestrator,
  SagaBuilder,
  createStepHandler,
  SagaExecutionResult,
} from '@lnk/nestjs-common';

/**
 * 用户注册 Saga Payload
 */
export interface RegisterUserSagaPayload {
  email: string;
  password: string;
  name?: string;
  plan?: string;
  referralCode?: string;
}

/**
 * 用户注册 Saga
 *
 * 处理跨服务的用户注册事务：
 * 1. 创建用户账户
 * 2. 初始化用户配额
 * 3. 创建默认团队
 * 4. 发送欢迎邮件
 */
@Injectable()
export class RegisterUserSaga implements OnModuleInit {
  private readonly logger = new Logger(RegisterUserSaga.name);
  private readonly SAGA_TYPE = 'register-user';

  constructor(private readonly sagaOrchestrator: SagaOrchestrator) {}

  onModuleInit() {
    this.registerSaga();
  }

  private registerSaga(): void {
    const sagaConfig = SagaBuilder.create(this.SAGA_TYPE)
      // 步骤 1: 创建用户账户
      .step(
        'create-user-account',
        'user-service',
        createStepHandler<RegisterUserSagaPayload, { userId: string }>(
          async (payload, ctx) => {
            this.logger.debug(`Creating user account for ${payload.email}`);
            // 实际实现：创建用户记录
            // const user = await this.userService.create(payload);
            const userId = `user_${Date.now()}`;
            return { userId };
          },
          async (payload, ctx) => {
            const userResult = ctx.previousResults['create-user-account'];
            if (userResult?.userId) {
              this.logger.debug(`Compensating: deleting user ${userResult.userId}`);
              // await this.userService.delete(userResult.userId);
            }
          },
        ),
      )
      // 步骤 2: 初始化用户配额
      .step(
        'init-quota',
        'user-service',
        createStepHandler<RegisterUserSagaPayload, { quotaId: string }>(
          async (payload, ctx) => {
            const userId = ctx.previousResults['create-user-account']?.userId;
            this.logger.debug(`Initializing quota for user ${userId}`);
            // const quota = await this.quotaService.initializeForUser(userId, payload.plan);
            return { quotaId: `quota_${userId}` };
          },
          async (payload, ctx) => {
            const quotaResult = ctx.previousResults['init-quota'];
            if (quotaResult?.quotaId) {
              this.logger.debug(`Compensating: deleting quota ${quotaResult.quotaId}`);
              // await this.quotaService.delete(quotaResult.quotaId);
            }
          },
        ),
        { retryable: true },
      )
      // 步骤 3: 创建默认团队
      .step(
        'create-default-team',
        'user-service',
        createStepHandler<RegisterUserSagaPayload, { teamId: string }>(
          async (payload, ctx) => {
            const userId = ctx.previousResults['create-user-account']?.userId;
            this.logger.debug(`Creating default team for user ${userId}`);
            // const team = await this.teamService.createPersonalTeam(userId);
            return { teamId: `team_${userId}` };
          },
          async (payload, ctx) => {
            const teamResult = ctx.previousResults['create-default-team'];
            if (teamResult?.teamId) {
              this.logger.debug(`Compensating: deleting team ${teamResult.teamId}`);
              // await this.teamService.delete(teamResult.teamId);
            }
          },
        ),
      )
      // 步骤 4: 发送欢迎邮件
      .step(
        'send-welcome-email',
        'notification-service',
        createStepHandler<RegisterUserSagaPayload, { sent: boolean }>(
          async (payload, ctx) => {
            this.logger.debug(`Sending welcome email to ${payload.email}`);
            // await this.notificationClient.sendEmail('welcome', payload.email, { ... });
            return { sent: true };
          },
          async (payload, ctx) => {
            // 邮件发送不需要补偿（已发送的邮件无法撤回）
            this.logger.debug(`Compensating: send-welcome-email (no-op)`);
          },
        ),
        { retryable: true, maxRetries: 2 },
      )
      .withRetries(3)
      .withTimeout(60000)
      .build();

    this.sagaOrchestrator.registerSaga(sagaConfig);
    this.logger.log(`Saga registered: ${this.SAGA_TYPE}`);
  }

  async execute(payload: RegisterUserSagaPayload): Promise<SagaExecutionResult> {
    return this.sagaOrchestrator.execute(this.SAGA_TYPE, payload);
  }
}
