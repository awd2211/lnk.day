import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  BioLinkTemplateCategory,
  LayoutType,
  IndustryType,
  ButtonStyle,
  BorderRadius,
} from '../entities/bio-link-template-preset.entity';

class ThemeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  backgroundGradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({ enum: ['filled', 'outlined', 'soft', 'glass'] })
  @IsOptional()
  @IsEnum(['filled', 'outlined', 'soft', 'glass'])
  buttonStyle?: ButtonStyle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonTextColor?: string;

  @ApiPropertyOptional({ enum: ['none', 'small', 'medium', 'large', 'full'] })
  @IsOptional()
  @IsEnum(['none', 'small', 'medium', 'large', 'full'])
  buttonBorderRadius?: BorderRadius;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarBorderColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardBackground?: string;
}

class BlockDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty()
  @IsInt()
  order: number;
}

export class CreateBioLinkTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['theme', 'layout', 'industry'] })
  @IsOptional()
  @IsEnum(['theme', 'layout', 'industry'])
  category?: BioLinkTemplateCategory;

  @ApiPropertyOptional({ enum: ['single_column', 'two_column', 'card_grid', 'masonry'] })
  @IsOptional()
  @IsEnum(['single_column', 'two_column', 'card_grid', 'masonry'])
  layoutType?: LayoutType;

  @ApiPropertyOptional({
    enum: [
      'influencer',
      'business',
      'restaurant',
      'education',
      'ecommerce',
      'music',
      'fitness',
      'portfolio',
      'nonprofit',
      'healthcare',
      'other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'influencer',
    'business',
    'restaurant',
    'education',
    'ecommerce',
    'music',
    'fitness',
    'portfolio',
    'nonprofit',
    'healthcare',
    'other',
  ])
  industry?: IndustryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiPropertyOptional({ type: ThemeDto })
  @IsOptional()
  @Type(() => ThemeDto)
  theme?: ThemeDto;

  @ApiPropertyOptional({ type: [BlockDto] })
  @IsOptional()
  @IsArray()
  @Type(() => BlockDto)
  defaultBlocks?: BlockDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

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

export class UpdateBioLinkTemplateDto extends PartialType(CreateBioLinkTemplateDto) {}
