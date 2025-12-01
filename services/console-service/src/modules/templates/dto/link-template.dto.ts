import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LinkTemplateCategory } from '../entities/link-template-preset.entity';

class LinkTemplateDefaultsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortCodePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortCodeSuffix?: string;

  @ApiPropertyOptional({ enum: ['301', '302', '307'] })
  @IsOptional()
  @IsString()
  redirectType?: '301' | '302' | '307';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordProtected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  tags?: string[];
}

export class CreateLinkTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ['marketing', 'social', 'email', 'qr', 'ecommerce', 'general'] })
  @IsOptional()
  @IsEnum(['marketing', 'social', 'email', 'qr', 'ecommerce', 'general'])
  category?: LinkTemplateCategory;

  @ApiPropertyOptional({ type: LinkTemplateDefaultsDto })
  @IsOptional()
  @IsObject()
  @Type(() => LinkTemplateDefaultsDto)
  defaults?: LinkTemplateDefaultsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLinkTemplateDto extends PartialType(CreateLinkTemplateDto) {}

export class ReorderLinkTemplatesDto {
  @ApiProperty({ type: [Object] })
  items: { id: string; sortOrder: number }[];
}
