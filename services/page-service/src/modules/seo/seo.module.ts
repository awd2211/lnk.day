import { Module, forwardRef } from '@nestjs/common';

import { SeoService } from './seo.service';
import { SeoController, SeoPreviewController } from './seo.controller';
import { BioLinkModule } from '../bio-link/bio-link.module';
import { PageModule } from '../page/page.module';

@Module({
  imports: [
    forwardRef(() => BioLinkModule),
    forwardRef(() => PageModule),
  ],
  controllers: [SeoController, SeoPreviewController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
