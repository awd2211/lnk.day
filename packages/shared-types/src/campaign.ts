export interface Campaign {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  userId: string;
  channels: CampaignChannel[];
  status: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  tags: string[];
  stats: CampaignStats;
  createdAt: Date;
  updatedAt: Date;
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum CampaignChannel {
  EMAIL = 'EMAIL',
  SOCIAL = 'SOCIAL',
  PAID_ADS = 'PAID_ADS',
  SMS = 'SMS',
  DISPLAY = 'DISPLAY',
  AFFILIATE = 'AFFILIATE',
  OTHER = 'OTHER',
}

export interface CampaignStats {
  totalLinks: number;
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  channels: CampaignChannel[];
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  tags?: string[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  channels?: CampaignChannel[];
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  tags?: string[];
}

// Deep Links
export interface DeepLink {
  id: string;
  linkId: string;
  iosConfig?: IosDeepLinkConfig;
  androidConfig?: AndroidDeepLinkConfig;
  fallbackUrl: string;
  deferredDeepLinking: boolean;
  attributionWindow: number; // hours
  createdAt: Date;
  updatedAt: Date;
}

export interface IosDeepLinkConfig {
  bundleId: string;
  appStoreUrl: string;
  universalLinkPath?: string;
  customScheme?: string;
}

export interface AndroidDeepLinkConfig {
  packageName: string;
  playStoreUrl: string;
  appLinkPath?: string;
  customScheme?: string;
}
