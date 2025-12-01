import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import {
  LinkTemplatePreset,
  UTMTemplatePreset,
  CampaignTemplatePreset,
  BioLinkTemplatePreset,
  QRStylePreset,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LinkTemplatePreset,
      UTMTemplatePreset,
      CampaignTemplatePreset,
      BioLinkTemplatePreset,
      QRStylePreset,
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
