import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { LinkPreview } from './entities/link-preview.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LinkPreview])],
  controllers: [PreviewController],
  providers: [PreviewService],
  exports: [PreviewService],
})
export class PreviewModule {}
