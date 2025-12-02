import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SeoTemplateCategory } from '../entities/seo-template-preset.entity';

export class CreateSeoTemplateDto {
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

  @ApiPropertyOptional({ enum: ['general', 'landing_page', 'bio_link', 'product', 'article', 'profile'] })
  @IsOptional()
  @IsEnum(['general', 'landing_page', 'bio_link', 'product', 'article', 'profile'])
  category?: SeoTemplateCategory;

  // Meta tags
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitleTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaAuthor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaRobots?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaLanguage?: string;

  // Open Graph
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogTitleTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional({ enum: ['website', 'article', 'profile', 'product'] })
  @IsOptional()
  @IsString()
  ogType?: 'website' | 'article' | 'profile' | 'product';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogSiteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogLocale?: string;

  // Twitter Card
  @ApiPropertyOptional({ enum: ['summary', 'summary_large_image', 'app', 'player'] })
  @IsOptional()
  @IsString()
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterSite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterCreator?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterTitleTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterImage?: string;

  // Other
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrlPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  customMeta?: Array<{ name: string; content: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schemaConfig?: { type?: string; additionalProperties?: Record<string, any> };

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

export class UpdateSeoTemplateDto extends PartialType(CreateSeoTemplateDto) {}
