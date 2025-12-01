import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule, MetricsInterceptor, TracingModule, CircuitBreakerModule, HttpRetryModule, VersionModule, TimeoutModule, LoggerModule } from '@lnk/nestjs-common';

import { AuthModule } from './modules/auth/auth.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { HealthModule } from './modules/health/health.module';
import { RateLimitModule } from './modules/ratelimit/ratelimit.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { OpenApiModule } from './modules/openapi/openapi.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    TimeoutModule,
    LoggerModule,
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
    HealthModule,  // 放在 ProxyModule 之前，确保 /health 路由优先匹配
    RateLimitModule,
    MobileModule,  // 移动端 API 模块
    OpenApiModule, // 开放 API 模块
    ProxyModule,   // 代理模块最后导入，因为它使用 @All('*') 捕获所有请求
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
