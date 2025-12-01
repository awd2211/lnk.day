import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LinkController, LinkInternalController, LinkStatsInternalController } from './link.controller';
import { LinkService } from './link.service';
import { Link } from './entities/link.entity';
import { LinkSchedule } from './entities/link-schedule.entity';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Link, LinkSchedule]),
    SecurityModule,
  ],
  controllers: [LinkController, LinkInternalController, LinkStatsInternalController],
  providers: [LinkService],
  exports: [LinkService],
})
export class LinkModule {}
