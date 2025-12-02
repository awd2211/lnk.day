import { PartialType } from '@nestjs/swagger';
import { CreateRedirectRuleTemplateDto } from './create-redirect-rule-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRedirectRuleTemplateDto extends PartialType(CreateRedirectRuleTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
