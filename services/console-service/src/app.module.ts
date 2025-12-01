import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  VersionModule,
  MetricsModule,
  MetricsInterceptor,
  TracingModule,
  CircuitBreakerModule,
  LoggerModule,
  AuthModule,
} from '@lnk/nestjs-common';
import { AdminModule } from './modules/admin/admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SystemModule } from './modules/system/system.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AutomationModule } from './modules/automation/automation.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule.forRoot({ serviceName: 'console-service' }),
    TracingModule.forRoot({
      serviceName: 'console-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    LoggerModule,
    AuthModule.forValidation(),
    // Main console database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '60030'), 10),
        retryAttempts: 3,
        retryDelay: 3000,
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'lnk_console'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    // Users database connection (read-only for dashboard stats)
    TypeOrmModule.forRootAsync({
      name: 'usersConnection',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '60030'), 10),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: 'lnk_users',
        entities: [],
        synchronize: false,
      }),
    }),
    // Links database connection (read-only for dashboard stats)
    TypeOrmModule.forRootAsync({
      name: 'linksConnection',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '60030'), 10),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: 'lnk_links',
        entities: [],
        synchronize: false,
      }),
    }),
    VersionModule,
    AdminModule,
    DashboardModule,
    SystemModule,
    ProxyModule,
    HealthModule,
    AuditModule,
    AlertsModule,
    AutomationModule,
    TemplatesModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
