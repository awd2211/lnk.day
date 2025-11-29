import { SagaDefinition, SagaStep, SagaStatus, SagaStepStatus } from '@lnk/shared-types';

/**
 * Saga 步骤处理器
 */
export interface SagaStepHandler<TPayload = any, TResult = any> {
  /**
   * 执行步骤
   */
  execute(payload: TPayload, context: SagaContext): Promise<TResult>;

  /**
   * 补偿/回滚步骤
   */
  compensate(payload: TPayload, context: SagaContext): Promise<void>;
}

/**
 * Saga 上下文
 */
export interface SagaContext {
  sagaId: string;
  sagaType: string;
  currentStep: string;
  previousResults: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Saga 步骤定义
 */
export interface SagaStepDefinition {
  name: string;
  service: string;
  handler: SagaStepHandler;
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Saga 配置选项
 */
export interface SagaOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  persistState?: boolean;
}

/**
 * Saga 构建器配置
 */
export interface SagaBuilderConfig {
  sagaType: string;
  steps: SagaStepDefinition[];
  options?: SagaOptions;
}

/**
 * Saga 执行结果
 */
export interface SagaExecutionResult {
  sagaId: string;
  sagaType: string;
  status: SagaStatus;
  result?: Record<string, any>;
  error?: string;
  completedSteps: string[];
  failedStep?: string;
  compensatedSteps?: string[];
  duration: number;
}

export { SagaDefinition, SagaStep, SagaStatus, SagaStepStatus };
