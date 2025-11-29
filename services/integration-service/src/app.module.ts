import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule, MetricsInterceptor, TracingModule, VersionModule, CircuitBreakerModule, TimeoutModule, LoggerModule, AuthModule } from '@lnk/nestjs-common';

import { ZapierModule } from './modules/zapier/zapier.module';
import { HubSpotModule } from './modules/hubspot/hubspot.module';
import { SalesforceModule } from './modules/salesforce/salesforce.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    VersionModule,
    MetricsModule.forRoot({
      serviceName: 'integration-service',
    }),
    TracingModule.forRoot({
      serviceName: 'integration-service',
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
        port: parseInt(config.get('DB_PORT', '60030'), 10),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'lnk_integrations'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    ZapierModule,
    HubSpotModule,
    SalesforceModule,
    ShopifyModule,
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
