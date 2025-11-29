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
import { CampaignModule } from './modules/campaign/campaign.module';
import { TemplateModule } from './modules/template/template.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { GoalsModule } from './modules/goals/goals.module';
import { CampaignAnalyticsModule } from './modules/analytics/campaign-analytics.module';
import { HealthModule } from './modules/health/health.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    VersionModule,
    MetricsModule.forRoot({ serviceName: 'campaign-service' }),
    TracingModule.forRoot({
      serviceName: 'campaign-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    TimeoutModule,
    LoggerModule,
    AuthModule.forValidation(),
    RabbitMQModule,
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
        database: config.get('DB_NAME', 'lnk_campaigns'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    CampaignModule,
    TemplateModule,
    CollaborationModule,
    GoalsModule,
    CampaignAnalyticsModule,
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
