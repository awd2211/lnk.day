import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  SagaDefinition,
  SagaStepDefinition,
  SagaContext,
  SagaExecutionResult,
  SagaBuilderConfig,
  SagaOptions,
} from './saga.types';
import { ISagaStore, SAGA_STORE } from './saga.store';

const DEFAULT_OPTIONS: Required<SagaOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  persistState: true,
};

/**
 * Saga 协调器 - 负责执行和协调分布式事务
 */
@Injectable()
export class SagaOrchestrator implements OnModuleDestroy {
  private readonly logger = new Logger(SagaOrchestrator.name);
  private readonly registeredSagas = new Map<string, SagaBuilderConfig>();
  private readonly runningTimeouts = new Set<NodeJS.Timeout>();

  constructor(
    @Inject(SAGA_STORE)
    private readonly sagaStore: ISagaStore,
  ) {}

  onModuleDestroy() {
    // 清理所有定时器
    this.runningTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.runningTimeouts.clear();
  }

  /**
   * 注册 Saga 定义
   */
  registerSaga(config: SagaBuilderConfig): void {
    this.registeredSagas.set(config.sagaType, config);
    this.logger.log(`Saga registered: ${config.sagaType} with ${config.steps.length} steps`);
  }

  /**
   * 启动 Saga 执行
   */
  async execute<TPayload = any>(
    sagaType: string,
    payload: TPayload,
    metadata?: Record<string, any>,
  ): Promise<SagaExecutionResult> {
    const config = this.registeredSagas.get(sagaType);
    if (!config) {
      throw new Error(`Saga type not registered: ${sagaType}`);
    }

    const sagaId = uuidv4();
    const options = { ...DEFAULT_OPTIONS, ...config.options };
    const startTime = Date.now();

    // 创建 Saga 定义
    const saga: SagaDefinition = {
      sagaId,
      sagaType,
      status: 'PENDING',
      steps: config.steps.map((step) => ({
        name: step.name,
        service: step.service,
        status: 'PENDING',
      })),
      payload: payload as Record<string, any>,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options.maxRetries,
    };

    // 持久化初始状态
    if (options.persistState) {
      await this.sagaStore.save(saga);
    }

    this.logger.log(`Starting saga: ${sagaType} [${sagaId}]`);

    try {
      // 更新状态为运行中
      saga.status = 'RUNNING';
      await this.sagaStore.updateStatus(sagaId, 'RUNNING');

      // 执行步骤
      const results: Record<string, any> = {};
      const completedSteps: string[] = [];

      for (const stepDef of config.steps) {
        const step = saga.steps.find((s) => s.name === stepDef.name)!;

        const context: SagaContext = {
          sagaId,
          sagaType,
          currentStep: stepDef.name,
          previousResults: { ...results },
          metadata: metadata || {},
        };

        try {
          // 更新步骤状态
          await this.sagaStore.updateStepStatus(sagaId, stepDef.name, 'RUNNING');

          // 执行步骤（带超时）
          const stepResult = await this.executeWithTimeout(
            stepDef.handler.execute(payload, context),
            stepDef.timeout || options.timeout,
            `Step ${stepDef.name} timeout`,
          );

          results[stepDef.name] = stepResult;
          completedSteps.push(stepDef.name);

          await this.sagaStore.updateStepStatus(
            sagaId,
            stepDef.name,
            'COMPLETED',
            stepResult,
          );

          this.logger.debug(`Step completed: ${stepDef.name} [${sagaId}]`);
        } catch (error: any) {
          this.logger.error(`Step failed: ${stepDef.name} [${sagaId}] - ${error.message}`);

          await this.sagaStore.updateStepStatus(
            sagaId,
            stepDef.name,
            'FAILED',
            undefined,
            error.message,
          );

          // 检查是否可重试
          if (stepDef.retryable && saga.retryCount < (stepDef.maxRetries || options.maxRetries)) {
            saga.retryCount++;
            await this.sagaStore.save(saga);

            // 延迟重试
            await this.delay(options.retryDelay * saga.retryCount);
            continue;
          }

          // 开始补偿
          const compensatedSteps = await this.compensate(
            config,
            completedSteps,
            payload,
            context,
          );

          await this.sagaStore.updateStatus(sagaId, 'FAILED', error.message);

          return {
            sagaId,
            sagaType,
            status: 'FAILED',
            error: error.message,
            completedSteps,
            failedStep: stepDef.name,
            compensatedSteps,
            duration: Date.now() - startTime,
          };
        }
      }

      // 所有步骤成功
      saga.result = results;
      await this.sagaStore.updateStatus(sagaId, 'COMPLETED');

      this.logger.log(`Saga completed: ${sagaType} [${sagaId}]`);

      return {
        sagaId,
        sagaType,
        status: 'COMPLETED',
        result: results,
        completedSteps,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error(`Saga execution error: ${sagaType} [${sagaId}] - ${error.message}`);
      await this.sagaStore.updateStatus(sagaId, 'FAILED', error.message);

      return {
        sagaId,
        sagaType,
        status: 'FAILED',
        error: error.message,
        completedSteps: [],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行补偿事务
   */
  private async compensate<TPayload>(
    config: SagaBuilderConfig,
    completedSteps: string[],
    payload: TPayload,
    context: SagaContext,
  ): Promise<string[]> {
    const compensatedSteps: string[] = [];

    this.logger.warn(`Starting compensation for saga [${context.sagaId}]`);

    // 逆序补偿
    for (const stepName of completedSteps.reverse()) {
      const stepDef = config.steps.find((s) => s.name === stepName);
      if (!stepDef) continue;

      try {
        await this.sagaStore.updateStepStatus(context.sagaId, stepName, 'COMPENSATING');

        await stepDef.handler.compensate(payload, {
          ...context,
          currentStep: stepName,
        });

        await this.sagaStore.updateStepStatus(context.sagaId, stepName, 'COMPENSATED');
        compensatedSteps.push(stepName);

        this.logger.debug(`Step compensated: ${stepName} [${context.sagaId}]`);
      } catch (error: any) {
        this.logger.error(
          `Compensation failed for step ${stepName} [${context.sagaId}]: ${error.message}`,
        );
        // 补偿失败也继续尝试其他步骤
      }
    }

    return compensatedSteps;
  }

  /**
   * 带超时执行
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeout);
      this.runningTimeouts.add(timeoutHandle);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle!);
      this.runningTimeouts.delete(timeoutHandle!);
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      this.runningTimeouts.add(timeout);
    });
  }

  /**
   * 获取 Saga 状态
   */
  async getSagaStatus(sagaId: string): Promise<SagaDefinition | null> {
    return this.sagaStore.findById(sagaId);
  }

  /**
   * 获取失败的 Saga 列表
   */
  async getFailedSagas(): Promise<SagaDefinition[]> {
    return this.sagaStore.findByStatus('FAILED');
  }

  /**
   * 重试失败的 Saga
   */
  async retrySaga(sagaId: string): Promise<SagaExecutionResult | null> {
    const saga = await this.sagaStore.findById(sagaId);
    if (!saga || saga.status !== 'FAILED') {
      return null;
    }

    // 重置状态并重新执行
    saga.retryCount++;
    await this.sagaStore.save(saga);

    return this.execute(saga.sagaType, saga.payload);
  }
}
