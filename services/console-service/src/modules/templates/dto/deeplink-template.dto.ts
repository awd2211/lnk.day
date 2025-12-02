import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DeepLinkTemplateCategory } from '../entities/deeplink-template-preset.entity';

export class CreateDeepLinkTemplateDto {
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

  @ApiPropertyOptional({ enum: ['social', 'commerce', 'media', 'utility', 'custom'] })
  @IsOptional()
  @IsEnum(['social', 'commerce', 'media', 'utility', 'custom'])
  category?: DeepLinkTemplateCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  ios?: {
    bundleId?: string;
    appStoreId?: string;
    customScheme?: string;
    universalLink?: string;
    fallbackUrl?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  android?: {
    packageName?: string;
    playStoreUrl?: string;
    customScheme?: string;
    appLinks?: string[];
    fallbackUrl?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fallbackUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableDeferred?: boolean;

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

export class UpdateDeepLinkTemplateDto extends PartialType(CreateDeepLinkTemplateDto) {}
