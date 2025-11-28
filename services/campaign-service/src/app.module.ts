import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignModule } from './modules/campaign/campaign.module';
import { TemplateModule } from './modules/template/template.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { GoalsModule } from './modules/goals/goals.module';
import { CampaignAnalyticsModule } from './modules/analytics/campaign-analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
