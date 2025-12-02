import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepLinkTemplate } from './entities/deeplink-template.entity';
import { DeepLinkTemplateService } from './template.service';
import { DeepLinkTemplateController } from './template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeepLinkTemplate])],
  controllers: [DeepLinkTemplateController],
  providers: [DeepLinkTemplateService],
  exports: [DeepLinkTemplateService],
})
export class DeepLinkTemplateModule {}
