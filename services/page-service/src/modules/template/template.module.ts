import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { PageTemplate, TemplateFavorite } from './entities/page-template.entity';
import { PageModule } from '../page/page.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PageTemplate, TemplateFavorite]),
    forwardRef(() => PageModule),
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule implements OnModuleInit {
  constructor(private readonly templateService: TemplateService) {}

  async onModuleInit() {
    // Seed default templates on startup if none exist
    await this.templateService.seedDefaultTemplates();
  }
}
