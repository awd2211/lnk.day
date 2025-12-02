import { PartialType } from '@nestjs/swagger';
import { CreateWebhookTemplateDto } from './create-webhook-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookTemplateDto extends PartialType(CreateWebhookTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
