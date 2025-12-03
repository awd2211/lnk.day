/**
 * Redirect Rule Template types
 * Used for configuring conditional redirects (A/B testing, geo, device, time-based)
 */

import { BaseTemplate, BaseCreateTemplateDto } from './base';

export type RedirectRuleCategory = 'ab_test' | 'geo' | 'device' | 'time' | 'custom';

export interface AbTestVariant {
  name: string;
  url: string;
  weight: number;
}

export interface GeoPreset {
  name: string;
  countries: string[];
  regions?: string[];
  url: string;
}

export interface DevicePreset {
  name: string;
  devices: string[];
  os?: string[];
  browsers?: string[];
  url: string;
}

export interface TimePreset {
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
  timezone: string;
  url: string;
}

export interface RedirectRuleTemplate extends BaseTemplate {
  category: RedirectRuleCategory;
  abTestVariants?: AbTestVariant[];
  geoPresets?: GeoPreset[];
  devicePresets?: DevicePreset[];
  timePresets?: TimePreset[];
  defaultUrl?: string;
}

export interface CreateRedirectRuleTemplateDto extends BaseCreateTemplateDto {
  category?: RedirectRuleCategory;
  abTestVariants?: AbTestVariant[];
  geoPresets?: GeoPreset[];
  devicePresets?: DevicePreset[];
  timePresets?: TimePreset[];
  defaultUrl?: string;
}
