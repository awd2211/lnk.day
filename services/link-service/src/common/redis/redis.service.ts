import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly LINK_CACHE_TTL = 300; // 5 minutes
  private readonly NULL_CACHE_TTL = 60; // 1 minute for not found

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Get cached link by short code
   * Returns: Link object, 'NOT_FOUND' for negative cache, or null for cache miss
   */
  async getLink(shortCode: string): Promise<any | 'NOT_FOUND' | null> {
    const key = `link:${shortCode}`;
    try {
      const cached = await this.redis.get(key);

      if (cached === null) {
        return null; // Cache miss
      }

      if (cached === 'NULL') {
        return 'NOT_FOUND'; // Negative cache
      }

      return JSON.parse(cached);
    } catch (error: any) {
      this.logger.error(`Redis get error for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache link data
   */
  async setLink(link: any): Promise<void> {
    const key = `link:${link.shortCode}`;
    try {
      await this.redis.set(key, JSON.stringify(link), 'EX', this.LINK_CACHE_TTL);
      this.logger.debug(`Cached link: ${key}`);
    } catch (error: any) {
      this.logger.error(`Redis set error for ${key}: ${error.message}`);
    }
  }

  /**
   * Cache negative result (link not found)
   */
  async setNotFound(shortCode: string): Promise<void> {
    const key = `link:${shortCode}`;
    try {
      await this.redis.set(key, 'NULL', 'EX', this.NULL_CACHE_TTL);
      this.logger.debug(`Cached not found: ${key}`);
    } catch (error: any) {
      this.logger.error(`Redis set not found error for ${key}: ${error.message}`);
    }
  }

  /**
   * Delete cached link
   */
  async deleteLink(shortCode: string): Promise<void> {
    const key = `link:${shortCode}`;
    try {
      await this.redis.del(key);
      this.logger.debug(`Deleted cache: ${key}`);
    } catch (error: any) {
      this.logger.error(`Redis delete error for ${key}: ${error.message}`);
    }
  }

  /**
   * Invalidate cache by link ID (lookup shortCode first if needed)
   */
  async invalidateByShortCode(shortCode: string): Promise<void> {
    await this.deleteLink(shortCode);
  }
}
