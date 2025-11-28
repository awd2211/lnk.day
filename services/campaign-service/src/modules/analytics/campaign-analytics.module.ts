import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaign/entities/campaign.entity';
import { CampaignAnalyticsService } from './campaign-analytics.service';
import {
  CampaignAnalyticsController,
  TeamAnalyticsController,
} from './campaign-analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign])],
  controllers: [CampaignAnalyticsController, TeamAnalyticsController],
  providers: [CampaignAnalyticsService],
  exports: [CampaignAnalyticsService],
})
export class CampaignAnalyticsModule {}
