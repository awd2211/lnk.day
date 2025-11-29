import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';
import {
  MetricsModule,
  MetricsInterceptor,
  TracingModule,
  CircuitBreakerModule,
  VersionModule,
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
    ScheduleModule.forRoot(),
    MetricsModule.forRoot({
      serviceName: 'user-service',
    }),
    TracingModule.forRoot({
      serviceName: 'user-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    VersionModule,
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
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
