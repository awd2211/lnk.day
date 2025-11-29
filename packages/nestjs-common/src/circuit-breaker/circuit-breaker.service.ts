import { Injectable, Logger } from '@nestjs/common';
import {
  CircuitBreaker,
  CircuitBreakerOptions,
  CircuitBreakerState,
} from './circuit-breaker';
import { getAllCircuitBreakers, getCircuitBreaker } from './circuit-breaker.decorator';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * 创建或获取一个熔断器
   */
  getOrCreate(options: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(options.name)) {
      this.circuitBreakers.set(options.name, new CircuitBreaker(options));
      this.logger.log(`Created circuit breaker: ${options.name}`);
    }
    return this.circuitBreakers.get(options.name)!;
  }

  /**
   * 获取熔断器
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name) || getCircuitBreaker(name);
  }

  /**
   * 执行受熔断器保护的操作
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const circuitBreaker = this.getOrCreate({ name, ...options });
    return circuitBreaker.execute(fn);
  }

  /**
   * 获取所有熔断器的状态
   */
  getAllStats(): Record<
    string,
    {
      state: CircuitBreakerState;
      failureCount: number;
      successCount: number;
      lastFailureTime: number | null;
      nextAttemptTime: number | null;
    }
  > {
    const stats: Record<string, any> = {};

    // 合并服务中的熔断器和装饰器创建的熔断器
    const allBreakers = new Map([
      ...this.circuitBreakers,
      ...getAllCircuitBreakers(),
    ]);

    for (const [name, breaker] of allBreakers) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * 重置特定熔断器
   */
  reset(name: string): boolean {
    const breaker = this.get(name);
    if (breaker) {
      breaker.forceReset();
      return true;
    }
    return false;
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    const allBreakers = new Map([
      ...this.circuitBreakers,
      ...getAllCircuitBreakers(),
    ]);

    for (const breaker of allBreakers.values()) {
      breaker.forceReset();
    }
    this.logger.log('All circuit breakers reset');
  }
}
