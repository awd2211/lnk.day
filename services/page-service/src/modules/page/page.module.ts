import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageController } from './page.controller';
import { PageInternalController } from './page-internal.controller';
import { PageService } from './page.service';
import { Page } from './entities/page.entity';
import { PageComment } from './entities/comment.entity';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Page, PageComment])],
  controllers: [PageController, CommentController, PageInternalController],
  providers: [PageService, CommentService],
  exports: [PageService, CommentService],
})
export class PageModule {}
