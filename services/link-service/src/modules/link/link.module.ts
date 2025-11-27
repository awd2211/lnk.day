import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LinkController } from './link.controller';
import { LinkService } from './link.service';
import { Link } from './entities/link.entity';
import { LinkSchedule } from './entities/link-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Link, LinkSchedule])],
  controllers: [LinkController],
  providers: [LinkService],
  exports: [LinkService],
})
export class LinkModule {}
