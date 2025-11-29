import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignTemplate } from './template.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignTemplate, Campaign]), AuthModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
