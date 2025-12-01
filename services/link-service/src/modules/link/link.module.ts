import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LinkController, LinkInternalController, LinkStatsInternalController } from './link.controller';
import { LinkService } from './link.service';
import { ShortCodeGeneratorService } from './shortcode-generator.service';
import { ShortCodeGeneratorController } from './shortcode-generator.controller';
import { Link } from './entities/link.entity';
import { LinkSchedule } from './entities/link-schedule.entity';
import { SecurityModule } from '../security/security.module';
import { FolderModule } from '../folder/folder.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Link, LinkSchedule]),
    SecurityModule,
    forwardRef(() => FolderModule),
  ],
  controllers: [
    LinkController,
    LinkInternalController,
    LinkStatsInternalController,
    ShortCodeGeneratorController,
  ],
  providers: [LinkService, ShortCodeGeneratorService],
  exports: [LinkService, ShortCodeGeneratorService],
})
export class LinkModule {}
