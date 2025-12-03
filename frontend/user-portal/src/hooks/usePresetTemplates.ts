import { useQuery } from '@tanstack/react-query';
import { presetTemplateService } from '@/lib/api';

// ==================== Link Templates ====================
export interface PresetLinkTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  defaults: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    passwordProtection?: boolean;
    expirationDays?: number;
    iosTargeting?: object;
    androidTargeting?: object;
    redirectType?: string;
  };
  createdAt: string;
}

export function usePresetLinkTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['preset-link-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getLinkTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetLinkTemplate[], ...data.pagination };
    },
  });
}

// ==================== UTM Templates ====================
export interface PresetUTMTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  platform?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  createdAt: string;
}

export function usePresetUTMTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  platform?: string;
}) {
  return useQuery({
    queryKey: ['preset-utm-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getUTMTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetUTMTemplate[], ...data.pagination };
    },
  });
}

export function usePresetUTMPlatforms() {
  return useQuery({
    queryKey: ['preset-utm-platforms'],
    queryFn: async () => {
      const { data } = await presetTemplateService.getUTMPlatforms();
      return data as { value: string; label: string }[];
    },
  });
}

// ==================== Campaign Templates ====================
export interface PresetCampaignTemplate {
  id: string;
  name: string;
  description?: string;
  scenario?: string;
  config: {
    targetAudience?: string;
    objectives?: string[];
    channels?: string[];
    budget?: { min?: number; max?: number };
    duration?: { days?: number };
  };
  createdAt: string;
}

export function usePresetCampaignTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  scenario?: string;
}) {
  return useQuery({
    queryKey: ['preset-campaign-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getCampaignTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetCampaignTemplate[], ...data.pagination };
    },
  });
}

// ==================== Bio Link Templates ====================
export interface PresetBioLinkTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  industry?: string;
  theme: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    fontFamily?: string;
  };
  layout: {
    headerStyle?: string;
    blockSpacing?: number;
    borderRadius?: number;
  };
  createdAt: string;
}

export function usePresetBioLinkTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  industry?: string;
}) {
  return useQuery({
    queryKey: ['preset-bio-link-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getBioLinkTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetBioLinkTemplate[], ...data.pagination };
    },
  });
}

// ==================== QR Styles ====================
export interface PresetQRStyle {
  id: string;
  name: string;
  description?: string;
  category?: string;
  style: {
    foregroundColor?: string;
    backgroundColor?: string;
    dotStyle?: string;
    cornerStyle?: string;
    logoUrl?: string;
    logoSize?: number;
    margin?: number;
    errorCorrectionLevel?: string;
  };
  createdAt: string;
}

export function usePresetQRStyles(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['preset-qr-styles', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getQRStyles(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetQRStyle[], ...data.pagination };
    },
  });
}

// ==================== DeepLink Templates ====================
export interface PresetDeepLinkTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  ios: {
    bundleId?: string;
    appStoreId?: string;
    customScheme?: string;
    universalLink?: string;
    fallbackUrl?: string;
  };
  android: {
    packageName?: string;
    playStoreUrl?: string;
    customScheme?: string;
    appLinks?: string;
    fallbackUrl?: string;
  };
  fallbackUrl?: string;
  createdAt: string;
}

export function usePresetDeepLinkTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['preset-deeplink-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getDeepLinkTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetDeepLinkTemplate[], ...data.pagination };
    },
  });
}

export function usePresetDeepLinkCategories() {
  return useQuery({
    queryKey: ['preset-deeplink-categories'],
    queryFn: async () => {
      const { data } = await presetTemplateService.getDeepLinkCategories();
      return data as { value: string; label: string }[];
    },
  });
}

// ==================== Webhook Templates ====================
export interface PresetWebhookTemplate {
  id: string;
  name: string;
  description?: string;
  platform: 'slack' | 'discord' | 'teams' | 'custom';
  config: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    messageTemplate?: string;
    payloadTemplate?: Record<string, unknown>;
    channel?: string;
    username?: string;
    iconEmoji?: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export function usePresetWebhookTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  platform?: string;
}) {
  return useQuery({
    queryKey: ['preset-webhook-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getWebhookTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetWebhookTemplate[], ...data.pagination };
    },
  });
}

export function usePresetWebhookPlatforms() {
  return useQuery({
    queryKey: ['preset-webhook-platforms'],
    queryFn: async () => {
      const { data } = await presetTemplateService.getWebhookPlatforms();
      return data as { value: string; label: string }[];
    },
  });
}

// ==================== Redirect Rule Templates ====================
export interface PresetRedirectRuleTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'ab_test' | 'geo' | 'device' | 'time' | 'custom';
  config: {
    variants?: Array<{ name: string; url: string; weight: number }>;
    geoRules?: Array<{ countries?: string[]; regions?: string[]; url: string }>;
    deviceRules?: Array<{ devices?: string[]; os?: string[]; browsers?: string[]; url: string }>;
    timeRules?: Array<{ startTime?: string; endTime?: string; days?: string[]; timezone?: string; url: string }>;
    defaultUrl?: string;
  };
  createdAt: string;
}

export function usePresetRedirectRuleTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['preset-redirect-rule-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getRedirectRuleTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetRedirectRuleTemplate[], ...data.pagination };
    },
  });
}

export function usePresetRedirectRuleCategories() {
  return useQuery({
    queryKey: ['preset-redirect-rule-categories'],
    queryFn: async () => {
      const { data } = await presetTemplateService.getRedirectRuleCategories();
      return data as { value: string; label: string }[];
    },
  });
}

// ==================== SEO Templates ====================
export interface PresetSeoTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  config: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    favicon?: string;
    canonicalUrl?: string;
    robots?: string;
  };
  createdAt: string;
}

export function usePresetSeoTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['preset-seo-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getSeoTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetSeoTemplate[], ...data.pagination };
    },
  });
}

export function usePresetSeoCategories() {
  return useQuery({
    queryKey: ['preset-seo-categories'],
    queryFn: async () => {
      const { data } = await presetTemplateService.getSeoCategories();
      return data as { value: string; label: string }[];
    },
  });
}

// ==================== Report Templates ====================
export interface PresetReportTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  config: {
    metrics: string[];
    dimensions: string[];
    filters?: Record<string, unknown>;
    dateRange: {
      type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
      startDate?: string;
      endDate?: string;
    };
    format: 'pdf' | 'csv' | 'excel';
    schedule?: {
      frequency: string;
      recipients: string[];
    };
  };
  createdAt: string;
}

export function usePresetReportTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['preset-report-templates', params],
    queryFn: async () => {
      const { data } = await presetTemplateService.getReportTemplates(params);
      // API returns { items, pagination } format
      return { data: data.items as PresetReportTemplate[], ...data.pagination };
    },
  });
}

export function usePresetReportCategories() {
  return useQuery({
    queryKey: ['preset-report-categories'],
    queryFn: async () => {
      const { data } = await presetTemplateService.getReportCategories();
      return data as { value: string; label: string }[];
    },
  });
}
