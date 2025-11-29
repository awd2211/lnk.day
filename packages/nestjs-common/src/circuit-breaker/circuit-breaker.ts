import { Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // 失败次数阈值
  successThreshold?: number; // 半开状态成功次数阈值
  timeout?: number; // 熔断器打开持续时间 (毫秒)
  fallback?: <T>() => T | Promise<T>; // 降级处理
}

export class CircuitBreaker {
  private readonly logger: Logger;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly fallback?: <T>() => T | Promise<T>;

  constructor(options: CircuitBreakerOptions) {
    this.logger = new Logger(`CircuitBreaker:${options.name}`);
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 30000; // 默认 30 秒
    this.fallback = options.fallback;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查是否应该尝试请求
    if (!this.canExecute()) {
      this.logger.warn(`Circuit breaker is OPEN, request blocked`);
      if (this.fallback) {
        return this.fallback() as Promise<T>;
      }
      throw new CircuitBreakerOpenError('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private canExecute(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      // 检查是否到了重试时间
      if (Date.now() >= (this.nextAttemptTime ?? 0)) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN 状态允许请求
    return true;
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      this.logger.log(
        `Success in HALF_OPEN state (${this.successCount}/${this.successThreshold})`,
      );

      if (this.successCount >= this.successThreshold) {
        this.reset();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // 重置失败计数
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态失败，立即打开熔断器
      this.transitionTo(CircuitBreakerState.OPEN);
      this.logger.warn(`Failure in HALF_OPEN state, reopening circuit breaker`);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount++;
      this.logger.warn(
        `Failure count: ${this.failureCount}/${this.failureThreshold}`,
      );

      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN);
      }
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    this.logger.log(`State transition: ${this.state} -> ${newState}`);
    this.state = newState;

    switch (newState) {
      case CircuitBreakerState.OPEN:
        this.nextAttemptTime = Date.now() + this.timeout;
        this.successCount = 0;
        break;
      case CircuitBreakerState.HALF_OPEN:
        this.successCount = 0;
        break;
      case CircuitBreakerState.CLOSED:
        this.reset();
        break;
    }
  }

  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.logger.log('Circuit breaker reset to CLOSED state');
  }

  // 手动重置
  forceReset(): void {
    this.reset();
  }

  // 手动打开
  forceOpen(): void {
    this.transitionTo(CircuitBreakerState.OPEN);
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
