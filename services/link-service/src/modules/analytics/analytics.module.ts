import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ThirdPartyAnalyticsService } from './third-party-analytics.service';
import { PixelConfigEntity } from './entities/pixel-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PixelConfigEntity])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ThirdPartyAnalyticsService],
  exports: [AnalyticsService, ThirdPartyAnalyticsService],
})
export class AnalyticsModule {}
