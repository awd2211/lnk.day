import { Inject } from '@nestjs/common';
import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker';

// 存储所有熔断器实例
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string): CircuitBreaker | undefined {
  return circuitBreakers.get(name);
}

export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
  return circuitBreakers;
}

/**
 * 熔断器装饰器
 * 用于包装需要熔断保护的方法
 *
 * @example
 * ```typescript
 * @WithCircuitBreaker({
 *   name: 'external-api',
 *   failureThreshold: 3,
 *   timeout: 10000,
 *   fallback: () => ({ data: null, fromCache: true }),
 * })
 * async callExternalApi(): Promise<ApiResponse> {
 *   // API 调用逻辑
 * }
 * ```
 */
export function WithCircuitBreaker(options: CircuitBreakerOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // 获取或创建熔断器
    if (!circuitBreakers.has(options.name)) {
      circuitBreakers.set(options.name, new CircuitBreaker(options));
    }
    const circuitBreaker = circuitBreakers.get(options.name)!;

    descriptor.value = async function (...args: any[]) {
      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * 用于注入熔断器服务的装饰器
 */
export const InjectCircuitBreaker = () => Inject('CIRCUIT_BREAKER_SERVICE');
