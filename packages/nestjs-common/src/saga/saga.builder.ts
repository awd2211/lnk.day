import {
  SagaStepDefinition,
  SagaStepHandler,
  SagaBuilderConfig,
  SagaOptions,
} from './saga.types';

/**
 * Saga 构建器 - 流畅 API 创建 Saga 定义
 *
 * @example
 * const createOrderSaga = SagaBuilder.create('create-order')
 *   .step('reserve-inventory', 'inventory-service', {
 *     execute: async (payload, ctx) => { ... },
 *     compensate: async (payload, ctx) => { ... },
 *   })
 *   .step('process-payment', 'payment-service', {
 *     execute: async (payload, ctx) => { ... },
 *     compensate: async (payload, ctx) => { ... },
 *   })
 *   .step('create-shipment', 'shipping-service', {
 *     execute: async (payload, ctx) => { ... },
 *     compensate: async (payload, ctx) => { ... },
 *   })
 *   .withRetries(3)
 *   .withTimeout(30000)
 *   .build();
 */
export class SagaBuilder {
  private sagaType: string;
  private steps: SagaStepDefinition[] = [];
  private options: SagaOptions = {};

  private constructor(sagaType: string) {
    this.sagaType = sagaType;
  }

  /**
   * 创建 Saga 构建器
   */
  static create(sagaType: string): SagaBuilder {
    return new SagaBuilder(sagaType);
  }

  /**
   * 添加步骤
   */
  step(
    name: string,
    service: string,
    handler: SagaStepHandler,
    options?: {
      retryable?: boolean;
      maxRetries?: number;
      timeout?: number;
    },
  ): SagaBuilder {
    this.steps.push({
      name,
      service,
      handler,
      ...options,
    });
    return this;
  }

  /**
   * 设置最大重试次数
   */
  withRetries(maxRetries: number): SagaBuilder {
    this.options.maxRetries = maxRetries;
    return this;
  }

  /**
   * 设置重试延迟（毫秒）
   */
  withRetryDelay(delay: number): SagaBuilder {
    this.options.retryDelay = delay;
    return this;
  }

  /**
   * 设置超时时间（毫秒）
   */
  withTimeout(timeout: number): SagaBuilder {
    this.options.timeout = timeout;
    return this;
  }

  /**
   * 设置是否持久化状态
   */
  withPersistence(persist: boolean): SagaBuilder {
    this.options.persistState = persist;
    return this;
  }

  /**
   * 构建 Saga 配置
   */
  build(): SagaBuilderConfig {
    if (this.steps.length === 0) {
      throw new Error('Saga must have at least one step');
    }

    return {
      sagaType: this.sagaType,
      steps: this.steps,
      options: this.options,
    };
  }
}

/**
 * 创建简单的步骤处理器
 */
export function createStepHandler<TPayload = any, TResult = any>(
  execute: SagaStepHandler<TPayload, TResult>['execute'],
  compensate: SagaStepHandler<TPayload, TResult>['compensate'],
): SagaStepHandler<TPayload, TResult> {
  return { execute, compensate };
}
