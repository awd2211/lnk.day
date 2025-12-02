import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoTemplate } from './entities/seo-template.entity';
import { SeoTemplateService } from './seo-template.service';
import { SeoTemplateController } from './seo-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SeoTemplate])],
  controllers: [SeoTemplateController],
  providers: [SeoTemplateService],
  exports: [SeoTemplateService],
})
export class SeoTemplateModule {}
