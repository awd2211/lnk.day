/**
 * DeepLink Template types
 * Used for configuring mobile deep linking (iOS/Android)
 */

import { BaseTemplate, BaseCreateTemplateDto } from './base';

export type DeepLinkCategory = 'social' | 'commerce' | 'media' | 'utility' | 'custom';

export interface DeepLinkTemplateIosConfig {
  bundleId?: string;
  appStoreId?: string;
  customScheme?: string;
  universalLink?: string;
  fallbackUrl?: string;
}

export interface DeepLinkTemplateAndroidConfig {
  packageName?: string;
  playStoreUrl?: string;
  customScheme?: string;
  appLinks?: string[];
  fallbackUrl?: string;
}

export interface DeepLinkTemplate extends BaseTemplate {
  category: DeepLinkCategory;
  ios?: DeepLinkTemplateIosConfig;
  android?: DeepLinkTemplateAndroidConfig;
  fallbackUrl?: string;
  enableDeferred?: boolean;
}

export interface CreateDeepLinkTemplateDto extends BaseCreateTemplateDto {
  category?: string;
  ios?: DeepLinkTemplateIosConfig;
  android?: DeepLinkTemplateAndroidConfig;
  fallbackUrl?: string;
  enableDeferred?: boolean;
}
