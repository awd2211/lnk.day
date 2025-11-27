import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { Link } from '../link/entities/link.entity';
import { LinkModule } from '../link/link.module';

@Module({
  imports: [TypeOrmModule.forFeature([Link]), LinkModule],
  controllers: [BatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
