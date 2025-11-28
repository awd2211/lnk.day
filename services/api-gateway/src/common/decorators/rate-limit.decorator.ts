import { SetMetadata, applyDecorators } from '@nestjs/common';

// 自定义速率限制元数据键
export const RATE_LIMIT_KEY = 'rate_limit';

// 速率限制配置接口
export interface RateLimitConfig {
  // 每分钟请求数
  perMinute?: number;
  // 每小时请求数
  perHour?: number;
  // 每天请求数
  perDay?: number;
  // 是否跳过速率限制（用于内部 API）
  skip?: boolean;
  // 使用的限制策略
  strategy?: 'ip' | 'user' | 'apiKey' | 'auto';
  // 自定义限制倍数（基于套餐限制）
  multiplier?: number;
}

// 预定义的速率限制配置
export const RateLimitPresets = {
  // 非常严格 - 用于敏感操作
  strict: {
    perMinute: 5,
    perHour: 20,
    perDay: 50,
  },
  // 标准 - 用于一般 API
  standard: {
    perMinute: 60,
    perHour: 500,
    perDay: 2000,
  },
  // 宽松 - 用于读取操作
  relaxed: {
    perMinute: 120,
    perHour: 2000,
    perDay: 10000,
  },
  // 批量操作
  bulk: {
    perMinute: 10,
    perHour: 100,
    perDay: 500,
  },
  // 认证相关
  auth: {
    perMinute: 10,
    perHour: 50,
    perDay: 100,
  },
  // 搜索操作
  search: {
    perMinute: 30,
    perHour: 300,
    perDay: 1000,
  },
  // 导出操作
  export: {
    perMinute: 2,
    perHour: 10,
    perDay: 20,
  },
  // 无限制（内部使用）
  unlimited: {
    skip: true,
  },
};

/**
 * 设置端点的速率限制
 * @param config 速率限制配置或预设名称
 * @example
 * @RateLimit({ perMinute: 10, perHour: 100 })
 * @RateLimit('strict')
 */
export function RateLimit(config: RateLimitConfig | keyof typeof RateLimitPresets) {
  const resolvedConfig = typeof config === 'string' ? RateLimitPresets[config] : config;
  return SetMetadata(RATE_LIMIT_KEY, resolvedConfig);
}

/**
 * 跳过速率限制
 */
export function SkipRateLimit() {
  return SetMetadata(RATE_LIMIT_KEY, { skip: true });
}

/**
 * 应用严格速率限制
 */
export function StrictRateLimit() {
  return RateLimit('strict');
}

/**
 * 应用认证速率限制
 */
export function AuthRateLimit() {
  return RateLimit('auth');
}

/**
 * 应用批量操作速率限制
 */
export function BulkRateLimit() {
  return RateLimit('bulk');
}

/**
 * 应用导出速率限制
 */
export function ExportRateLimit() {
  return RateLimit('export');
}
