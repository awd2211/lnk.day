import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BioLink, BioLinkItem, BioLinkClick, BioLinkSubscriber, BioLinkContact } from './entities/bio-link.entity';
import { BioLinkService } from './bio-link.service';
import { BioLinkTemplatesService } from './bio-link-templates.service';
import { BioLinkController, BioLinkPublicController } from './bio-link.controller';
import { BioLinkTemplatesController } from './bio-link-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BioLink, BioLinkItem, BioLinkClick, BioLinkSubscriber, BioLinkContact])],
  controllers: [BioLinkController, BioLinkPublicController, BioLinkTemplatesController],
  providers: [BioLinkService, BioLinkTemplatesService],
  exports: [BioLinkService, BioLinkTemplatesService],
})
export class BioLinkModule {}
