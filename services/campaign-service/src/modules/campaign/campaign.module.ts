import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { CampaignInternalController } from './campaign-internal.controller';
import { CampaignService } from './campaign.service';
import { Campaign } from './entities/campaign.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Campaign])],
  controllers: [CampaignController, CampaignInternalController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
