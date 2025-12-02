import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookTemplate } from './entities/webhook-template.entity';
import { WebhookTemplateService } from './template.service';
import { WebhookTemplateController } from './template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookTemplate])],
  controllers: [WebhookTemplateController],
  providers: [WebhookTemplateService],
  exports: [WebhookTemplateService],
})
export class WebhookTemplateModule {}
