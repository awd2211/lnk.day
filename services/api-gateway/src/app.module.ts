import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { HealthModule } from './modules/health/health.module';
import { ZapierModule } from './modules/zapier/zapier.module';
import { AuditModule } from './modules/audit/audit.module';
import { RateLimitModule } from './modules/ratelimit/ratelimit.module';
import { HubSpotModule } from './modules/hubspot/hubspot.module';
import { SalesforceModule } from './modules/salesforce/salesforce.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { SecurityModule } from './modules/security/security.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'lnk_gateway'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: 1000, // 1 second
          limit: config.get('RATE_LIMIT_SHORT', 10),
        },
        {
          name: 'medium',
          ttl: 60000, // 1 minute
          limit: config.get('RATE_LIMIT_MEDIUM', 100),
        },
        {
          name: 'long',
          ttl: 3600000, // 1 hour
          limit: config.get('RATE_LIMIT_LONG', 1000),
        },
      ],
    }),
    AuthModule,
    ProxyModule,
    HealthModule,
    ZapierModule,
    AuditModule,
    RateLimitModule,
    HubSpotModule,
    SalesforceModule,
    ShopifyModule,
    SecurityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
