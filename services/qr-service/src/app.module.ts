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
} from '@lnk/nestjs-common';
import { QrModule } from './modules/qr/qr.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { GS1Module } from './modules/gs1/gs1.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule.forRoot({ serviceName: 'qr-service' }),
    TracingModule.forRoot({
      serviceName: 'qr-service',
      jaegerEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    CircuitBreakerModule,
    VersionModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'lnk_qr'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    QrModule,
    TrackingModule,
    GS1Module,
    HealthModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
