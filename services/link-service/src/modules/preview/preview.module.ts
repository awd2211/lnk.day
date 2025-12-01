import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { PersonalizedPreviewController } from './personalized-preview.controller';
import { PersonalizedPreviewService } from './personalized-preview.service';
import { LinkPreview } from './entities/link-preview.entity';
import {
  PreviewConfig,
  PreviewTemplate,
  PreviewAnalytics,
} from './entities/preview-config.entity';
import { Link } from '../link/entities/link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LinkPreview,
      PreviewConfig,
      PreviewTemplate,
      PreviewAnalytics,
      Link,
    ]),
  ],
  controllers: [PreviewController, PersonalizedPreviewController],
  providers: [PreviewService, PersonalizedPreviewService],
  exports: [PreviewService, PersonalizedPreviewService],
})
export class PreviewModule {}
