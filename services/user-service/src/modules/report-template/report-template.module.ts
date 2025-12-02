import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportTemplateService } from './report-template.service';
import { ReportTemplateController } from './report-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReportTemplate])],
  controllers: [ReportTemplateController],
  providers: [ReportTemplateService],
  exports: [ReportTemplateService],
})
export class ReportTemplateModule {}
