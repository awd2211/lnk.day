import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const DEFAULT_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

@Injectable()
export class TokenBlacklistService implements OnModuleDestroy {
  private localCache = new Set<string>(); // Fallback for when Redis is unavailable
  private useRedis = true;

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.checkRedisConnection();
  }

  private async checkRedisConnection(): Promise<void> {
    try {
      await this.redis.ping();
      this.useRedis = true;
    } catch {
      console.warn('Redis not available, falling back to in-memory token blacklist');
      this.useRedis = false;
    }
  }

  async addToBlacklist(token: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || DEFAULT_TTL;

    if (this.useRedis) {
      try {
        await this.redis.setex(`${TOKEN_BLACKLIST_PREFIX}${token}`, ttl, '1');
        return;
      } catch (error) {
        console.error('Redis error, falling back to local cache:', error);
        this.useRedis = false;
      }
    }

    // Fallback to local cache
    this.localCache.add(token);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    if (this.useRedis) {
      try {
        const result = await this.redis.exists(`${TOKEN_BLACKLIST_PREFIX}${token}`);
        return result === 1;
      } catch (error) {
        console.error('Redis error, checking local cache:', error);
        this.useRedis = false;
      }
    }

    // Fallback to local cache
    return this.localCache.has(token);
  }

  async removeFromBlacklist(token: string): Promise<void> {
    if (this.useRedis) {
      try {
        await this.redis.del(`${TOKEN_BLACKLIST_PREFIX}${token}`);
        return;
      } catch (error) {
        console.error('Redis error:', error);
        this.useRedis = false;
      }
    }

    this.localCache.delete(token);
  }

  async onModuleDestroy(): Promise<void> {
    // Redis connection cleanup is handled by the module
  }
}
