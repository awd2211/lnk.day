import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaign/entities/campaign.entity';
import { CampaignAnalyticsService } from './campaign-analytics.service';
import {
  CampaignAnalyticsController,
  TeamAnalyticsController,
} from './campaign-analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign]), AuthModule],
  controllers: [CampaignAnalyticsController, TeamAnalyticsController],
  providers: [CampaignAnalyticsService],
  exports: [CampaignAnalyticsService],
})
export class CampaignAnalyticsModule {}
