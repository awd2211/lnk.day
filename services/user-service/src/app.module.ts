import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

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
    }),
    ScheduleModule.forRoot(),
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
        synchronize: configService.get('NODE_ENV') !== 'production',
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
})
export class AppModule {}
