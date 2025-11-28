import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

export { REDIS_CLIENT };

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const redisUrl = configService.get('REDIS_URL', 'redis://localhost:60031');

        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed after 3 retries. Continuing without Redis.');
              return null; // Stop retrying
            }
            return Math.min(times * 1000, 3000);
          },
          lazyConnect: true,
        });

        redis.on('error', (err) => {
          logger.warn(`Redis connection error: ${err.message}`);
        });

        redis.on('connect', () => {
          logger.log('Redis connected');
        });

        // Attempt to connect but don't block if it fails
        redis.connect().catch((err) => {
          logger.warn(`Redis initial connection failed: ${err.message}. Service will continue with limited functionality.`);
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
