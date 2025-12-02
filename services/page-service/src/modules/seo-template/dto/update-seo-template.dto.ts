import { PartialType } from '@nestjs/swagger';
import { CreateSeoTemplateDto } from './create-seo-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSeoTemplateDto extends PartialType(CreateSeoTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
