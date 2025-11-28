import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BioLink, BioLinkItem, BioLinkClick } from './entities/bio-link.entity';
import { BioLinkService } from './bio-link.service';
import { BioLinkController, BioLinkPublicController } from './bio-link.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BioLink, BioLinkItem, BioLinkClick])],
  controllers: [BioLinkController, BioLinkPublicController],
  providers: [BioLinkService],
  exports: [BioLinkService],
})
export class BioLinkModule {}
