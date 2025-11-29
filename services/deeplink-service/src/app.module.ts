import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  MetricsModule,
  MetricsInterceptor,
  TracingModule,
  CircuitBreakerModule,
  VersionModule,
  AuthModule,
  TimeoutModule,
  LoggerModule,
} from '@lnk/nestjs-common';
import { DeepLinkModule } from './modules/deeplink/deeplink.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    VersionModule,
    MetricsModule.forRoot({ serviceName: 'deeplink-service' }),
    TracingModule.forRoot({
      serviceName: 'deeplink-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    TimeoutModule,
    LoggerModule,
    AuthModule.forValidation(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        retryAttempts: 3,
        retryDelay: 3000,
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'lnk_deeplinks'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    DeepLinkModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
