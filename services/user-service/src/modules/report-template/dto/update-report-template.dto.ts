import { PartialType } from '@nestjs/swagger';
import { CreateReportTemplateDto } from './create-report-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReportTemplateDto extends PartialType(CreateReportTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
