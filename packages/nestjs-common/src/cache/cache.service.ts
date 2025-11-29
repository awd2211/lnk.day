import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.constants';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

const DEFAULT_TTL = 300; // 5 minutes
const NULL_TTL = 60; // 1 minute for negative cache

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefix: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.prefix = 'cache:';
  }

  private getKey(key: string, prefix?: string): string {
    return `${prefix || this.prefix}${key}`;
  }

  /**
   * Get value from cache
   * Returns: parsed value, 'NOT_FOUND' for negative cache, or null for cache miss
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | 'NOT_FOUND' | null> {
    const cacheKey = this.getKey(key, options?.prefix);
    try {
      const cached = await this.redis.get(cacheKey);

      if (cached === null) {
        return null; // Cache miss
      }

      if (cached === 'NULL') {
        return 'NOT_FOUND'; // Negative cache
      }

      return JSON.parse(cached) as T;
    } catch (error: any) {
      this.logger.error(`Cache get error for ${cacheKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const cacheKey = this.getKey(key, options?.prefix);
    const ttl = options?.ttl || DEFAULT_TTL;

    try {
      await this.redis.set(cacheKey, JSON.stringify(value), 'EX', ttl);
      this.logger.debug(`Cached: ${cacheKey} (TTL: ${ttl}s)`);
    } catch (error: any) {
      this.logger.error(`Cache set error for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Set negative cache (not found)
   */
  async setNotFound(key: string, options?: CacheOptions): Promise<void> {
    const cacheKey = this.getKey(key, options?.prefix);
    const ttl = options?.ttl || NULL_TTL;

    try {
      await this.redis.set(cacheKey, 'NULL', 'EX', ttl);
      this.logger.debug(`Cached not found: ${cacheKey}`);
    } catch (error: any) {
      this.logger.error(`Cache set not found error for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    const cacheKey = this.getKey(key, options?.prefix);

    try {
      await this.redis.del(cacheKey);
      this.logger.debug(`Deleted cache: ${cacheKey}`);
    } catch (error: any) {
      this.logger.error(`Cache delete error for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<void> {
    const cachePattern = this.getKey(pattern, options?.prefix);

    try {
      const keys = await this.redis.keys(cachePattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Deleted ${keys.length} keys matching: ${cachePattern}`);
      }
    } catch (error: any) {
      this.logger.error(`Cache delete pattern error for ${cachePattern}: ${error.message}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const cacheKey = this.getKey(key, options?.prefix);

    try {
      const exists = await this.redis.exists(cacheKey);
      return exists === 1;
    } catch (error: any) {
      this.logger.error(`Cache exists error for ${cacheKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get or set: returns cached value or executes factory and caches result
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T | null>,
    options?: CacheOptions,
  ): Promise<T | null> {
    // Check cache first
    const cached = await this.get<T>(key, options);

    if (cached === 'NOT_FOUND') {
      return null;
    }

    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute factory
    const value = await factory();

    if (value === null) {
      // Cache negative result
      await this.setNotFound(key, options);
      return null;
    }

    // Cache the result
    await this.set(key, value, options);
    return value;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, options?: CacheOptions): Promise<number> {
    const cacheKey = this.getKey(key, options?.prefix);

    try {
      const value = await this.redis.incr(cacheKey);
      if (options?.ttl) {
        await this.redis.expire(cacheKey, options.ttl);
      }
      return value;
    } catch (error: any) {
      this.logger.error(`Cache increment error for ${cacheKey}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }
}
