import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { RedisModule } from './common/redis/redis.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { LinkModule } from './modules/link/link.module';
import { AuthModule } from './modules/auth/auth.module';
import { FolderModule } from './modules/folder/folder.module';
import { ABTestModule } from './modules/abtest/abtest.module';
import { SearchModule } from './modules/search/search.module';
import { DeepLinkModule } from './modules/deeplink/deeplink.module';
import { BatchModule } from './modules/batch/batch.module';
import { PreviewModule } from './modules/preview/preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
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
    AuthModule,
    LinkModule,
    FolderModule,
    ABTestModule,
    SearchModule,
    DeepLinkModule,
    BatchModule,
    PreviewModule,
  ],
})
export class AppModule {}
