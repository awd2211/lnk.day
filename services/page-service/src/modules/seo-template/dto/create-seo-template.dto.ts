import { IsString, IsOptional, IsArray, IsObject, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeoTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '分类', default: 'general' })
  @IsOptional()
  @IsString()
  category?: 'general' | 'landing_page' | 'bio_link' | 'product' | 'article' | 'profile';

  // 基础 Meta
  @ApiPropertyOptional({ description: 'Meta 标题模板' })
  @IsOptional()
  @IsString()
  metaTitleTemplate?: string;

  @ApiPropertyOptional({ description: 'Meta 描述' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Meta 关键词' })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];

  @ApiPropertyOptional({ description: 'Meta 作者' })
  @IsOptional()
  @IsString()
  metaAuthor?: string;

  @ApiPropertyOptional({ description: 'Meta Robots' })
  @IsOptional()
  @IsString()
  metaRobots?: string;

  @ApiPropertyOptional({ description: 'Meta 语言' })
  @IsOptional()
  @IsString()
  metaLanguage?: string;

  // Open Graph
  @ApiPropertyOptional({ description: 'OG 标题模板' })
  @IsOptional()
  @IsString()
  ogTitleTemplate?: string;

  @ApiPropertyOptional({ description: 'OG 描述' })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional({ description: 'OG 类型' })
  @IsOptional()
  @IsString()
  ogType?: 'website' | 'article' | 'profile' | 'product';

  @ApiPropertyOptional({ description: 'OG 图片' })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional({ description: 'OG 站点名称' })
  @IsOptional()
  @IsString()
  ogSiteName?: string;

  @ApiPropertyOptional({ description: 'OG 地区' })
  @IsOptional()
  @IsString()
  ogLocale?: string;

  // Twitter Card
  @ApiPropertyOptional({ description: 'Twitter Card 类型' })
  @IsOptional()
  @IsString()
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';

  @ApiPropertyOptional({ description: 'Twitter 站点账号' })
  @IsOptional()
  @IsString()
  twitterSite?: string;

  @ApiPropertyOptional({ description: 'Twitter 创作者账号' })
  @IsOptional()
  @IsString()
  twitterCreator?: string;

  @ApiPropertyOptional({ description: 'Twitter 标题模板' })
  @IsOptional()
  @IsString()
  twitterTitleTemplate?: string;

  @ApiPropertyOptional({ description: 'Twitter 描述' })
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiPropertyOptional({ description: 'Twitter 图片' })
  @IsOptional()
  @IsString()
  twitterImage?: string;

  // 其他
  @ApiPropertyOptional({ description: 'Favicon' })
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiPropertyOptional({ description: 'Canonical URL 模式' })
  @IsOptional()
  @IsString()
  canonicalUrlPattern?: string;

  @ApiPropertyOptional({ description: '自定义 Meta 标签' })
  @IsOptional()
  @IsArray()
  customMeta?: Array<{
    name: string;
    content: string;
  }>;

  @ApiPropertyOptional({ description: 'JSON-LD Schema 配置' })
  @IsOptional()
  @IsObject()
  schemaConfig?: {
    type?: string;
    additionalProperties?: Record<string, any>;
  };
}
