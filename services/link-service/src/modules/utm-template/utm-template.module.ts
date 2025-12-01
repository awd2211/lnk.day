import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UTMTemplate } from './entities/utm-template.entity';
import { UTMTemplateService } from './utm-template.service';
import { UTMTemplateController } from './utm-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UTMTemplate])],
  controllers: [UTMTemplateController],
  providers: [UTMTemplateService],
  exports: [UTMTemplateService],
})
export class UTMTemplateModule {}
