import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
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
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;

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

  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded. Please try again later.',
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // 从请求中获取用户套餐
    const user = (request as any).user;
    const plan: PlanType = user?.plan || 'free';
    const planLimits = PLAN_RATE_LIMITS[plan];

    // 设置响应头
    response.setHeader('X-RateLimit-Limit', planLimits.requestsPerMinute);
    response.setHeader('X-RateLimit-Plan', plan);

    // 调用父类的 canActivate
    return super.canActivate(context);
  }
}
