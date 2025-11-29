import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.constants';
import { CacheService } from './cache.service';

export interface CacheModuleOptions {
  redisUrl?: string;
  maxRetriesPerRequest?: number;
}

@Global()
@Module({})
export class CacheModule {
  static forRoot(options?: CacheModuleOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_CLIENT,
          useFactory: (configService: ConfigService) => {
            const logger = new Logger('CacheModule');
            const redisUrl = options?.redisUrl || configService.get<string>('REDIS_URL') || 'redis://localhost:60031';
            const maxRetries = options?.maxRetriesPerRequest ?? 3;

            const redis = new Redis(redisUrl, {
              maxRetriesPerRequest: maxRetries,
              retryStrategy: (times) => {
                if (times > maxRetries) {
                  logger.warn('Redis connection failed after retries. Continuing without Redis.');
                  return null;
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

            redis.connect().catch((err) => {
              logger.warn(`Redis initial connection failed: ${err.message}. Service will continue with limited functionality.`);
            });

            return redis;
          },
          inject: [ConfigService],
        },
        CacheService,
      ],
      exports: [REDIS_CLIENT, CacheService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => CacheModuleOptions | Promise<CacheModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: CacheModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_CLIENT,
          useFactory: async (configService: ConfigService, ...args: any[]) => {
            const logger = new Logger('CacheModule');
            const moduleOptions = await options.useFactory(configService, ...args);
            const redisUrl = moduleOptions?.redisUrl || configService.get<string>('REDIS_URL') || 'redis://localhost:60031';
            const maxRetries = moduleOptions?.maxRetriesPerRequest ?? 3;

            const redis = new Redis(redisUrl, {
              maxRetriesPerRequest: maxRetries,
              retryStrategy: (times) => {
                if (times > maxRetries) {
                  logger.warn('Redis connection failed after retries. Continuing without Redis.');
                  return null;
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

            redis.connect().catch((err) => {
              logger.warn(`Redis initial connection failed: ${err.message}. Service will continue with limited functionality.`);
            });

            return redis;
          },
          inject: [ConfigService, ...(options.inject || [])],
        },
        CacheService,
      ],
      exports: [REDIS_CLIENT, CacheService],
    };
  }
}
