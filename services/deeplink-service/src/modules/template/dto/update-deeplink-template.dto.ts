import { PartialType } from '@nestjs/swagger';
import { CreateDeepLinkTemplateDto } from './create-deeplink-template.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeepLinkTemplateDto extends PartialType(CreateDeepLinkTemplateDto) {
  @ApiPropertyOptional({ description: '是否收藏' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
