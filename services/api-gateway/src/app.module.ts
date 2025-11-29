import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule, MetricsInterceptor, TracingModule, CircuitBreakerModule, HttpRetryModule, VersionModule } from '@lnk/nestjs-common';

import { AuthModule } from './modules/auth/auth.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { HealthModule } from './modules/health/health.module';
import { RateLimitModule } from './modules/ratelimit/ratelimit.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MetricsModule.forRoot({
      serviceName: 'api-gateway',
    }),
    TracingModule.forRoot({
      serviceName: 'api-gateway',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    HttpRetryModule,
    VersionModule,
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
    RateLimitModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
