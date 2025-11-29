import { Controller, Get, Post, Param, HttpCode } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

@Controller('circuit-breakers')
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * 获取所有熔断器状态
   * GET /circuit-breakers
   */
  @Get()
  getAllStats() {
    return {
      circuitBreakers: this.circuitBreakerService.getAllStats(),
    };
  }

  /**
   * 获取特定熔断器状态
   * GET /circuit-breakers/:name
   */
  @Get(':name')
  getStats(@Param('name') name: string) {
    const breaker = this.circuitBreakerService.get(name);
    if (!breaker) {
      return {
        error: 'Circuit breaker not found',
        name,
      };
    }
    return {
      name,
      ...breaker.getStats(),
    };
  }

  /**
   * 重置特定熔断器
   * POST /circuit-breakers/:name/reset
   */
  @Post(':name/reset')
  @HttpCode(200)
  reset(@Param('name') name: string) {
    const success = this.circuitBreakerService.reset(name);
    return {
      success,
      name,
      message: success
        ? 'Circuit breaker reset successfully'
        : 'Circuit breaker not found',
    };
  }

  /**
   * 重置所有熔断器
   * POST /circuit-breakers/reset-all
   */
  @Post('reset-all')
  @HttpCode(200)
  resetAll() {
    this.circuitBreakerService.resetAll();
    return {
      success: true,
      message: 'All circuit breakers reset',
    };
  }
}
