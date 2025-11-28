import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LinkTemplateController } from './link-template.controller';
import { LinkTemplateService } from './link-template.service';
import { LinkTemplate, LinkTemplatePreset } from './entities/link-template.entity';
import { LinkModule } from '../link/link.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LinkTemplate, LinkTemplatePreset]),
    forwardRef(() => LinkModule),
  ],
  controllers: [LinkTemplateController],
  providers: [LinkTemplateService],
  exports: [LinkTemplateService],
})
export class LinkTemplateModule implements OnModuleInit {
  constructor(private readonly templateService: LinkTemplateService) {}

  async onModuleInit() {
    // Seed preset templates on startup if none exist
    await this.templateService.seedPresets();
  }
}
