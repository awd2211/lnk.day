import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { Link } from '../link/entities/link.entity';
import { LinkModule } from '../link/link.module';
import { FolderModule } from '../folder/folder.module';

@Module({
  imports: [TypeOrmModule.forFeature([Link]), LinkModule, FolderModule],
  controllers: [BatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
