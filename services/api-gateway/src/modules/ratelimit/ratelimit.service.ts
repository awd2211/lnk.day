import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PLAN_RATE_LIMITS, PlanType } from '../../common/guards/plan-throttler.guard';

export interface RateLimitInfo {
  identifier: string;
  plan: PlanType;
  limits: {
    minute: { limit: number; used: number; remaining: number; resetAt: Date };
    hour: { limit: number; used: number; remaining: number; resetAt: Date };
    day: { limit: number; used: number; remaining: number; resetAt: Date };
  };
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  topUsers: Array<{ identifier: string; requests: number }>;
  byPlan: Record<PlanType, { requests: number; blocked: number }>;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    try {
      this.redis = new Redis(redisUrl);
    } catch (error: any) {
      this.logger.warn(`Redis not available: ${error.message}`);
    }
  }

  // 获取用户当前的速率限制状态
  async getRateLimitInfo(
    identifier: string,
    plan: PlanType = 'free',
  ): Promise<RateLimitInfo> {
    const limits = PLAN_RATE_LIMITS[plan];
    const now = Date.now();

    const [minuteUsed, hourUsed, dayUsed] = await Promise.all([
      this.getUsage(`rate_limit:minute:${identifier}`),
      this.getUsage(`rate_limit:hour:${identifier}`),
      this.getUsage(`rate_limit:day:${identifier}`),
    ]);

    // 计算重置时间
    const minuteResetAt = new Date(now + (60000 - (now % 60000)));
    const hourResetAt = new Date(now + (3600000 - (now % 3600000)));
    const dayResetAt = new Date(now + (86400000 - (now % 86400000)));

    return {
      identifier,
      plan,
      limits: {
        minute: {
          limit: limits.requestsPerMinute,
          used: minuteUsed,
          remaining: Math.max(0, limits.requestsPerMinute - minuteUsed),
          resetAt: minuteResetAt,
        },
        hour: {
          limit: limits.requestsPerHour,
          used: hourUsed,
          remaining: Math.max(0, limits.requestsPerHour - hourUsed),
          resetAt: hourResetAt,
        },
        day: {
          limit: limits.requestsPerDay,
          used: dayUsed,
          remaining:
            limits.requestsPerDay === -1
              ? -1
              : Math.max(0, limits.requestsPerDay - dayUsed),
          resetAt: dayResetAt,
        },
      },
    };
  }

  // 获取某个键的使用量
  private async getUsage(key: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  }

  // 获取全局速率限制统计
  async getStats(): Promise<RateLimitStats> {
    // 简化实现，实际应该从 Redis 获取统计数据
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topUsers: [],
      byPlan: {
        free: { requests: 0, blocked: 0 },
        starter: { requests: 0, blocked: 0 },
        pro: { requests: 0, blocked: 0 },
        enterprise: { requests: 0, blocked: 0 },
      },
    };
  }

  // 重置用户的速率限制
  async resetRateLimit(identifier: string): Promise<void> {
    if (!this.redis) return;

    const keys = [
      `rate_limit:minute:${identifier}`,
      `rate_limit:hour:${identifier}`,
      `rate_limit:day:${identifier}`,
    ];

    await this.redis.del(...keys);
    this.logger.log(`Rate limit reset for ${identifier}`);
  }

  // 临时提升用户的速率限制
  async boostRateLimit(
    identifier: string,
    multiplier: number,
    durationMs: number,
  ): Promise<void> {
    if (!this.redis) return;

    const boostKey = `rate_limit:boost:${identifier}`;
    await this.redis.set(boostKey, multiplier.toString(), 'PX', durationMs);

    this.logger.log(
      `Rate limit boosted ${multiplier}x for ${identifier} for ${durationMs}ms`,
    );
  }

  // 检查是否有速率限制提升
  async getBoostMultiplier(identifier: string): Promise<number> {
    if (!this.redis) return 1;

    try {
      const value = await this.redis.get(`rate_limit:boost:${identifier}`);
      return value ? parseFloat(value) : 1;
    } catch {
      return 1;
    }
  }

  // 添加到黑名单
  async addToBlacklist(
    identifier: string,
    reason: string,
    durationMs?: number,
  ): Promise<void> {
    if (!this.redis) return;

    const blacklistKey = `rate_limit:blacklist:${identifier}`;
    const data = JSON.stringify({ reason, addedAt: new Date().toISOString() });

    if (durationMs) {
      await this.redis.set(blacklistKey, data, 'PX', durationMs);
    } else {
      await this.redis.set(blacklistKey, data);
    }

    this.logger.warn(`Added ${identifier} to blacklist: ${reason}`);
  }

  // 检查是否在黑名单
  async isBlacklisted(identifier: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const value = await this.redis.get(`rate_limit:blacklist:${identifier}`);
      return !!value;
    } catch {
      return false;
    }
  }

  // 从黑名单移除
  async removeFromBlacklist(identifier: string): Promise<void> {
    if (!this.redis) return;

    await this.redis.del(`rate_limit:blacklist:${identifier}`);
    this.logger.log(`Removed ${identifier} from blacklist`);
  }

  // 获取所有套餐的限制配置
  getPlanLimits(): typeof PLAN_RATE_LIMITS {
    return PLAN_RATE_LIMITS;
  }
}
