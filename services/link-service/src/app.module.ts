import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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

import { RedisModule } from './common/redis/redis.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { NotificationModule } from './common/notification/notification.module';
import { LinkModule } from './modules/link/link.module';
import { FolderModule } from './modules/folder/folder.module';
import { ABTestModule } from './modules/abtest/abtest.module';
import { SearchModule } from './modules/search/search.module';
import { DeepLinkModule } from './modules/deeplink/deeplink.module';
import { BatchModule } from './modules/batch/batch.module';
import { PreviewModule } from './modules/preview/preview.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SecurityModule } from './modules/security/security.module';
import { RedirectRulesModule } from './modules/redirect-rules/redirect-rules.module';
import { LinkTemplateModule } from './modules/link-template/link-template.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { HealthModule } from './modules/health/health.module';
import { LinkSagaModule } from './saga/saga.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MetricsModule.forRoot({
      serviceName: 'link-service',
    }),
    TracingModule.forRoot({
      serviceName: 'link-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    VersionModule,
    TimeoutModule,
    LoggerModule,
    AuthModule.forValidation(),
    RedisModule,
    RabbitMQModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432'), 10),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'lnk_links'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    NotificationModule,
    LinkModule,
    FolderModule,
    ABTestModule,
    SearchModule,
    DeepLinkModule,
    BatchModule,
    PreviewModule,
    AnalyticsModule,
    SecurityModule,
    RedirectRulesModule,
    LinkTemplateModule,
    ModerationModule,
    HealthModule,
    LinkSagaModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
