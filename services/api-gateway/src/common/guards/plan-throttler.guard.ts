import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorageService, ThrottlerModuleOptions, THROTTLER_OPTIONS } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// 套餐对应的速率限制
export const PLAN_RATE_LIMITS = {
  free: {
    requestsPerMinute: 60,
    requestsPerHour: 500,
    requestsPerDay: 1000,
  },
  starter: {
    requestsPerMinute: 120,
    requestsPerHour: 2000,
    requestsPerDay: 10000,
  },
  pro: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 50000,
  },
  enterprise: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: -1, // unlimited
  },
};

export type PlanType = keyof typeof PLAN_RATE_LIMITS;

@Injectable()
export class PlanThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(THROTTLER_OPTIONS) protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorageService,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 从请求中获取用户套餐
    const user = (request as any).user;
    const plan: PlanType = user?.plan || 'free';
    const planLimits = PLAN_RATE_LIMITS[plan];

    // 获取请求标识（优先使用 API Key，其次使用用户 ID，最后使用 IP）
    const tracker = this.getTracker(request);

    // 检查每分钟限制
    const minuteKey = `rate_limit:minute:${tracker}`;
    const minuteResult = await this.checkLimit(
      minuteKey,
      planLimits.requestsPerMinute,
      60000,
    );

    if (!minuteResult.allowed) {
      this.throwThrottlingException(context, {
        limit: planLimits.requestsPerMinute,
        ttl: 60,
        remaining: 0,
        resetTime: minuteResult.resetTime,
      });
    }

    // 检查每小时限制
    const hourKey = `rate_limit:hour:${tracker}`;
    const hourResult = await this.checkLimit(
      hourKey,
      planLimits.requestsPerHour,
      3600000,
    );

    if (!hourResult.allowed) {
      this.throwThrottlingException(context, {
        limit: planLimits.requestsPerHour,
        ttl: 3600,
        remaining: 0,
        resetTime: hourResult.resetTime,
      });
    }

    // 检查每天限制（-1 表示无限制）
    if (planLimits.requestsPerDay !== -1) {
      const dayKey = `rate_limit:day:${tracker}`;
      const dayResult = await this.checkLimit(
        dayKey,
        planLimits.requestsPerDay,
        86400000,
      );

      if (!dayResult.allowed) {
        this.throwThrottlingException(context, {
          limit: planLimits.requestsPerDay,
          ttl: 86400,
          remaining: 0,
          resetTime: dayResult.resetTime,
        });
      }
    }

    // 设置响应头
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', planLimits.requestsPerMinute);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, planLimits.requestsPerMinute - minuteResult.count));
    response.setHeader('X-RateLimit-Reset', Math.ceil(minuteResult.resetTime / 1000));
    response.setHeader('X-RateLimit-Plan', plan);

    return true;
  }

  private getTracker(request: Request): string {
    // 优先使用 API Key
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      return `api:${apiKey}`;
    }

    // 其次使用用户 ID
    const user = (request as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // 最后使用 IP
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    return `ip:${ip}`;
  }

  private async checkLimit(
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    const now = Date.now();
    const record = await this.storageService.increment(key, ttlMs, limit, 0, 'default');

    return {
      allowed: record.totalHits <= limit,
      count: record.totalHits,
      resetTime: record.timeToExpire,
    };
  }

  private throwThrottlingException(
    context: ExecutionContext,
    details: { limit: number; ttl: number; remaining: number; resetTime: number },
  ): never {
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', details.limit);
    response.setHeader('X-RateLimit-Remaining', 0);
    response.setHeader('X-RateLimit-Reset', Math.ceil(details.resetTime / 1000));
    response.setHeader('Retry-After', Math.ceil(details.resetTime / 1000));

    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(details.resetTime / 1000)} seconds.`);
  }
}
