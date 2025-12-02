import { PartialType } from '@nestjs/swagger';
import { CreateAutomationTemplateDto } from './create-automation-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAutomationTemplateDto extends PartialType(CreateAutomationTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
