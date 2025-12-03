import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesController } from './templates.controller';
import { PublicTemplatesController } from './public-templates.controller';
import { TemplatesService } from './templates.service';
import {
  LinkTemplatePreset,
  UTMTemplatePreset,
  CampaignTemplatePreset,
  BioLinkTemplatePreset,
  QRStylePreset,
  DeepLinkTemplatePreset,
  WebhookTemplatePreset,
  RedirectRuleTemplatePreset,
  SeoTemplatePreset,
  ReportTemplatePreset,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LinkTemplatePreset,
      UTMTemplatePreset,
      CampaignTemplatePreset,
      BioLinkTemplatePreset,
      QRStylePreset,
      DeepLinkTemplatePreset,
      WebhookTemplatePreset,
      RedirectRuleTemplatePreset,
      SeoTemplatePreset,
      ReportTemplatePreset,
    ]),
  ],
  controllers: [TemplatesController, PublicTemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
