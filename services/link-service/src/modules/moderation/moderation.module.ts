import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { FlaggedLink } from './entities/flagged-link.entity';
import { LinkReport } from './entities/link-report.entity';
import { Link } from '../link/entities/link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlaggedLink, LinkReport, Link]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
