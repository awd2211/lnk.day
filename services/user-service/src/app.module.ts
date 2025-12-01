import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
// ScheduleModule 暂时禁用，与多个 @Global() 模块存在冲突
// import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';
import {
  MetricsModule,
  MetricsInterceptor,
  TracingModule,
  CircuitBreakerModule,
  VersionModule,
  TimeoutModule,
  LoggerModule,
  serviceConfigPresets,
} from '@lnk/nestjs-common';

import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';
import { ApiKeyModule } from './modules/apikey/apikey.module';
import { QuotaModule } from './modules/quota/quota.module';
import { BillingModule } from './modules/billing/billing.module';
import { SSOModule } from './modules/sso/sso.module';
import { EmailModule } from './modules/email/email.module';
import { RedisModule } from './modules/redis/redis.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { LdapModule } from './modules/auth/ldap/ldap.module';
import { NotificationModule } from './common/notification/notification.module';
import { HealthModule } from './modules/health/health.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { UserSagaModule } from './saga/saga.module';
// import { TenantModule } from './modules/tenant/tenant.module';
import { SecurityModule } from './modules/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: serviceConfigPresets.withAuth.concat(
        Joi.object({
          NOTIFICATION_SERVICE_URL: Joi.string().uri().optional(),
          STRIPE_SECRET_KEY: Joi.string().optional(),
        }),
      ),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // Rate limiting - 防止暴力破解
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 60,
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 600,
      },
    ]),
    // ScheduleModule.forRoot(), // 暂时禁用
    MetricsModule.forRoot({
      serviceName: 'user-service',
    }),
    TracingModule.forRoot({
      serviceName: 'user-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    VersionModule,
    TimeoutModule,
    LoggerModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432'), 10),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'lnk_users'),
        autoLoadEntities: true,
        synchronize: false, // 禁用自动同步，使用迁移
        migrationsRun: configService.get('RUN_MIGRATIONS', 'false') === 'true',
        migrations: ['dist/database/migrations/*.js'],
        migrationsTableName: 'migrations',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    RedisModule,
    EmailModule,
    NotificationModule,
    UserModule,
    AuthModule,
    TeamModule,
    ApiKeyModule,
    QuotaModule,
    BillingModule,
    SSOModule,
    PrivacyModule,
    LdapModule,
    HealthModule,
    RabbitMQModule,
    UserSagaModule,
    // TenantModule, // Temporarily disabled due to API mismatch
    SecurityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
