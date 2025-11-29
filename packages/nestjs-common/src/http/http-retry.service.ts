import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // 毫秒
  maxDelay?: number; // 毫秒
  backoffMultiplier?: number;
  retryableErrors?: number[]; // HTTP 状态码
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [408, 429, 500, 502, 503, 504],
};

@Injectable()
export class HttpRetryService {
  private readonly logger = new Logger(HttpRetryService.name);

  /**
   * 使用指数退避重试执行 HTTP 请求
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries!; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // 检查是否应该重试
        if (attempt >= config.maxRetries!) {
          this.logger.error(
            `All ${config.maxRetries} retries failed: ${lastError.message}`,
          );
          throw lastError;
        }

        if (!this.shouldRetry(error, config)) {
          throw error;
        }

        // 计算退避延迟
        const delay = this.calculateDelay(attempt, config);

        this.logger.warn(
          `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );

        // 调用重试回调
        if (config.onRetry) {
          config.onRetry(attempt + 1, lastError);
        }

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 创建带重试的 fetch 包装器
   */
  createRetryableFetch(options: RetryOptions = {}) {
    return async (
      url: string,
      init?: RequestInit,
    ): Promise<Response> => {
      return this.executeWithRetry(async () => {
        const response = await fetch(url, init);

        if (!response.ok) {
          const error = new HttpError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
          );
          throw error;
        }

        return response;
      }, options);
    };
  }

  /**
   * 检查是否应该重试
   */
  private shouldRetry(error: any, config: RetryOptions): boolean {
    // 网络错误（ECONNREFUSED, ETIMEDOUT 等）
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.name === 'AbortError'
    ) {
      return true;
    }

    // HTTP 错误
    if (error instanceof HttpError) {
      return config.retryableErrors!.includes(error.statusCode);
    }

    // Axios 错误
    if (error.response?.status) {
      return config.retryableErrors!.includes(error.response.status);
    }

    // 默认不重试未知错误
    return false;
  }

  /**
   * 计算指数退避延迟
   */
  private calculateDelay(attempt: number, config: RetryOptions): number {
    const delay =
      config.initialDelay! * Math.pow(config.backoffMultiplier!, attempt);

    // 添加抖动（±10%）
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);

    return Math.min(delay + jitter, config.maxDelay!);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * HTTP 错误类
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * 重试装饰器
 */
export function WithRetry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      const config = { ...DEFAULT_OPTIONS, ...options };
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= config.maxRetries!; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          if (attempt >= config.maxRetries!) {
            logger.error(`All retries exhausted: ${lastError.message}`);
            throw lastError;
          }

          const delay =
            config.initialDelay! * Math.pow(config.backoffMultiplier!, attempt);
          logger.warn(
            `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
