/**
 * SEO Template types
 * Used for configuring SEO metadata for pages and links
 */

import { BaseTemplate, BaseCreateTemplateDto } from './base';

export type SeoCategory = 'ecommerce' | 'saas' | 'content' | 'social' | 'landing' | 'app' | 'local' | 'media';

export type OgType = 'website' | 'article' | 'profile' | 'product';

export type TwitterCardType = 'summary' | 'summary_large_image' | 'app' | 'player';

export interface CustomMeta {
  name: string;
  content: string;
}

export interface SchemaConfig {
  type?: string;
  additionalProperties?: Record<string, any>;
}

export interface SeoTemplate extends BaseTemplate {
  category: SeoCategory;
  // Meta tags
  metaTitleTemplate?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  metaAuthor?: string;
  metaRobots?: string;
  metaLanguage?: string;
  // Open Graph
  ogTitleTemplate?: string;
  ogDescription?: string;
  ogType?: OgType;
  ogImage?: string;
  ogSiteName?: string;
  ogLocale?: string;
  // Twitter
  twitterCard?: TwitterCardType;
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitleTemplate?: string;
  twitterDescription?: string;
  twitterImage?: string;
  // Other
  favicon?: string;
  canonicalUrlPattern?: string;
  customMeta?: CustomMeta[];
  schemaConfig?: SchemaConfig;
}

export interface CreateSeoTemplateDto extends BaseCreateTemplateDto {
  category?: SeoCategory;
  metaTitleTemplate?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  metaAuthor?: string;
  metaRobots?: string;
  metaLanguage?: string;
  ogTitleTemplate?: string;
  ogDescription?: string;
  ogType?: OgType;
  ogImage?: string;
  ogSiteName?: string;
  ogLocale?: string;
  twitterCard?: TwitterCardType;
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitleTemplate?: string;
  twitterDescription?: string;
  twitterImage?: string;
  favicon?: string;
  canonicalUrlPattern?: string;
  customMeta?: CustomMeta[];
  schemaConfig?: SchemaConfig;
}
