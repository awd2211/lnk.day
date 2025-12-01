import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { REDIS_CLIENT } from './cache.constants';

// 缓存配置
export interface DistributedCacheConfig {
  prefix?: string;
  ttl?: number;
  staleWhileRevalidate?: number; // 允许返回过期数据同时后台刷新
  lockTimeout?: number; // 分布式锁超时
  compressionThreshold?: number; // 压缩阈值(字节)
  serializer?: 'json' | 'msgpack';
}

// 缓存统计
export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  errors: number;
  avgLatency: number;
}

// 缓存条目
interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  version?: string;
}

// 批量操作结果
export interface BulkResult<T> {
  results: Map<string, T | null>;
  errors: Map<string, Error>;
}

@Injectable()
export class DistributedCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedCacheService.name);
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    errors: 0,
    avgLatency: 0,
  };
  private latencySum = 0;
  private latencyCount = 0;
  private readonly subscribers: Map<string, Set<(value: any) => void>> = new Map();
  private readonly refreshingKeys: Set<string> = new Set();

  // 默认配置
  private readonly defaultConfig: Required<DistributedCacheConfig> = {
    prefix: 'dc:',
    ttl: 300,
    staleWhileRevalidate: 60,
    lockTimeout: 5000,
    compressionThreshold: 1024,
    serializer: 'json',
  };

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy() {
    this.subscribers.clear();
    this.refreshingKeys.clear();
  }

  // ==================== 核心方法 ====================

  /**
   * 获取缓存值（支持 stale-while-revalidate）
   */
  async get<T>(
    key: string,
    config?: Partial<DistributedCacheConfig>,
  ): Promise<T | null> {
    const start = Date.now();
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKey = this.buildKey(key, cfg.prefix);

    try {
      const raw = await this.redis.get(cacheKey);

      if (!raw) {
        this.stats.misses++;
        this.updateLatency(start);
        return null;
      }

      const entry = this.deserialize<CacheEntry<T>>(raw);
      const now = Date.now();

      // 检查是否完全过期
      if (entry.expiresAt < now - cfg.staleWhileRevalidate * 1000) {
        this.stats.misses++;
        this.updateLatency(start);
        return null;
      }

      // 检查是否需要后台刷新（stale but usable）
      if (entry.expiresAt < now) {
        this.stats.staleHits++;
        // 触发后台刷新事件（不阻塞返回）
        this.notifyStale(key);
      } else {
        this.stats.hits++;
      }

      this.updateLatency(start);
      return entry.data;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache get error for ${cacheKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(
    key: string,
    value: T,
    config?: Partial<DistributedCacheConfig>,
  ): Promise<void> {
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKey = this.buildKey(key, cfg.prefix);

    try {
      const entry: CacheEntry<T> = {
        data: value,
        createdAt: Date.now(),
        expiresAt: Date.now() + cfg.ttl * 1000,
        version: this.generateVersion(),
      };

      const serialized = this.serialize(entry);
      const totalTtl = cfg.ttl + cfg.staleWhileRevalidate;

      await this.redis.set(cacheKey, serialized, 'EX', totalTtl);
      this.logger.debug(`Cached: ${cacheKey} (TTL: ${totalTtl}s)`);
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache set error for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string, config?: Partial<DistributedCacheConfig>): Promise<void> {
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKey = this.buildKey(key, cfg.prefix);

    try {
      await this.redis.del(cacheKey);
      this.logger.debug(`Deleted: ${cacheKey}`);
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache delete error for ${cacheKey}: ${error.message}`);
    }
  }

  // ==================== 高级方法 ====================

  /**
   * Get or Set 模式（带分布式锁防止缓存击穿）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    config?: Partial<DistributedCacheConfig>,
  ): Promise<T | null> {
    const cfg = { ...this.defaultConfig, ...config };

    // 先尝试获取缓存
    const cached = await this.get<T>(key, cfg);
    if (cached !== null) {
      return cached;
    }

    // 获取分布式锁
    const lockKey = `lock:${key}`;
    const lockAcquired = await this.acquireLock(lockKey, cfg.lockTimeout);

    if (!lockAcquired) {
      // 等待锁释放后重试获取缓存
      await this.waitForLock(lockKey, cfg.lockTimeout);
      return this.get<T>(key, cfg);
    }

    try {
      // 双重检查
      const doubleCheck = await this.get<T>(key, cfg);
      if (doubleCheck !== null) {
        return doubleCheck;
      }

      // 执行工厂函数
      const value = await factory();
      await this.set(key, value, cfg);
      return value;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 批量获取
   */
  async mget<T>(
    keys: string[],
    config?: Partial<DistributedCacheConfig>,
  ): Promise<Map<string, T | null>> {
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKeys = keys.map(k => this.buildKey(k, cfg.prefix));
    const results = new Map<string, T | null>();

    try {
      const values = await this.redis.mget(...cacheKeys);

      keys.forEach((key, index) => {
        const raw = values[index];
        if (raw) {
          try {
            const entry = this.deserialize<CacheEntry<T>>(raw);
            if (entry.expiresAt > Date.now() - cfg.staleWhileRevalidate * 1000) {
              results.set(key, entry.data);
              this.stats.hits++;
            } else {
              results.set(key, null);
              this.stats.misses++;
            }
          } catch {
            results.set(key, null);
            this.stats.errors++;
          }
        } else {
          results.set(key, null);
          this.stats.misses++;
        }
      });
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache mget error: ${error.message}`);
      keys.forEach(k => results.set(k, null));
    }

    return results;
  }

  /**
   * 批量设置
   */
  async mset<T>(
    entries: Map<string, T>,
    config?: Partial<DistributedCacheConfig>,
  ): Promise<void> {
    const cfg = { ...this.defaultConfig, ...config };
    const pipeline = this.redis.pipeline();
    const totalTtl = cfg.ttl + cfg.staleWhileRevalidate;

    entries.forEach((value, key) => {
      const cacheKey = this.buildKey(key, cfg.prefix);
      const entry: CacheEntry<T> = {
        data: value,
        createdAt: Date.now(),
        expiresAt: Date.now() + cfg.ttl * 1000,
      };
      pipeline.set(cacheKey, this.serialize(entry), 'EX', totalTtl);
    });

    try {
      await pipeline.exec();
      this.logger.debug(`Bulk cached ${entries.size} keys`);
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache mset error: ${error.message}`);
    }
  }

  /**
   * 按模式删除
   */
  async deletePattern(
    pattern: string,
    config?: Partial<DistributedCacheConfig>,
  ): Promise<number> {
    const cfg = { ...this.defaultConfig, ...config };
    const cachePattern = this.buildKey(pattern, cfg.prefix);

    try {
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          cachePattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      this.logger.debug(`Deleted ${deletedCount} keys matching: ${cachePattern}`);
      return deletedCount;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache deletePattern error: ${error.message}`);
      return 0;
    }
  }

  /**
   * 标签缓存（支持按标签批量失效）
   */
  async setWithTags<T>(
    key: string,
    value: T,
    tags: string[],
    config?: Partial<DistributedCacheConfig>,
  ): Promise<void> {
    const cfg = { ...this.defaultConfig, ...config };
    const cacheKey = this.buildKey(key, cfg.prefix);

    const pipeline = this.redis.pipeline();

    // 设置缓存值
    const entry: CacheEntry<T> = {
      data: value,
      createdAt: Date.now(),
      expiresAt: Date.now() + cfg.ttl * 1000,
    };
    const totalTtl = cfg.ttl + cfg.staleWhileRevalidate;
    pipeline.set(cacheKey, this.serialize(entry), 'EX', totalTtl);

    // 将 key 添加到每个标签集合
    tags.forEach(tag => {
      const tagKey = this.buildKey(`tag:${tag}`, cfg.prefix);
      pipeline.sadd(tagKey, cacheKey);
      pipeline.expire(tagKey, totalTtl);
    });

    await pipeline.exec();
  }

  /**
   * 按标签失效缓存
   */
  async invalidateByTag(
    tag: string,
    config?: Partial<DistributedCacheConfig>,
  ): Promise<number> {
    const cfg = { ...this.defaultConfig, ...config };
    const tagKey = this.buildKey(`tag:${tag}`, cfg.prefix);

    try {
      const keys = await this.redis.smembers(tagKey);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys, tagKey);
      this.logger.debug(`Invalidated ${keys.length} keys by tag: ${tag}`);
      return keys.length;
    } catch (error: any) {
      this.stats.errors++;
      this.logger.error(`Cache invalidateByTag error: ${error.message}`);
      return 0;
    }
  }

  // ==================== 分布式锁 ====================

  private async acquireLock(lockKey: string, timeout: number): Promise<boolean> {
    const fullKey = this.buildKey(lockKey, this.defaultConfig.prefix);
    const token = crypto.randomUUID();

    try {
      const result = await this.redis.set(
        fullKey,
        token,
        'PX',
        timeout,
        'NX',
      );
      return result === 'OK';
    } catch {
      return false;
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    const fullKey = this.buildKey(lockKey, this.defaultConfig.prefix);
    await this.redis.del(fullKey);
  }

  private async waitForLock(lockKey: string, timeout: number): Promise<void> {
    const fullKey = this.buildKey(lockKey, this.defaultConfig.prefix);
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const exists = await this.redis.exists(fullKey);
      if (!exists) return;
      await this.sleep(50);
    }
  }

  // ==================== 订阅机制 ====================

  /**
   * 订阅 stale 事件（用于后台刷新）
   */
  onStale(key: string, callback: (key: string) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    const wrapper = () => callback(key);
    this.subscribers.get(key)!.add(wrapper);

    return () => {
      this.subscribers.get(key)?.delete(wrapper);
    };
  }

  private notifyStale(key: string): void {
    if (this.refreshingKeys.has(key)) return;

    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      this.refreshingKeys.add(key);
      setTimeout(() => {
        callbacks.forEach(cb => {
          try {
            cb(key);
          } catch (e) {
            this.logger.error(`Stale callback error: ${e}`);
          }
        });
        this.refreshingKeys.delete(key);
      }, 0);
    }
  }

  // ==================== 统计信息 ====================

  getStats(): CacheStats {
    return {
      ...this.stats,
      avgLatency: this.latencyCount > 0 ? this.latencySum / this.latencyCount : 0,
    };
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.staleHits = 0;
    this.stats.errors = 0;
    this.latencySum = 0;
    this.latencyCount = 0;
  }

  // ==================== 辅助方法 ====================

  private buildKey(key: string, prefix: string): string {
    return `${prefix}${key}`;
  }

  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(raw: string): T {
    return JSON.parse(raw);
  }

  private generateVersion(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  private updateLatency(start: number): void {
    const latency = Date.now() - start;
    this.latencySum += latency;
    this.latencyCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取原始 Redis 客户端
   */
  getClient(): Redis {
    return this.redis;
  }
}
