export interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  description?: string;
  domain: string;
  teamId: string;
  userId: string;
  tags: string[];
  utmParams?: UtmParams;
  settings: LinkSettings;
  stats: LinkStats;
  status: LinkStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface LinkSettings {
  passwordProtected: boolean;
  password?: string;
  geoTargeting: GeoTarget[];
  deviceTargeting: DeviceTarget[];
  scheduling?: LinkSchedule;
  cloaking: boolean;
}

export interface GeoTarget {
  country: string;
  region?: string;
  city?: string;
  targetUrl: string;
}

export interface DeviceTarget {
  deviceType: DeviceType;
  targetUrl: string;
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

export interface LinkSchedule {
  startDate?: Date;
  endDate?: Date;
  timezone: string;
}

export interface LinkStats {
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: Date;
}

export enum LinkStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

export interface CreateLinkRequest {
  originalUrl: string;
  customSlug?: string;
  domain?: string;
  title?: string;
  tags?: string[];
  utmParams?: UtmParams;
  settings?: Partial<LinkSettings>;
  expiresAt?: Date;
}

export interface UpdateLinkRequest {
  originalUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  utmParams?: UtmParams;
  settings?: Partial<LinkSettings>;
  expiresAt?: Date;
}

export interface QRCode {
  id: string;
  linkId: string;
  style: QRCodeStyle;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRCodeStyle {
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  logoUrl?: string;
  cornerStyle: 'square' | 'rounded' | 'dots';
  format: 'png' | 'svg' | 'pdf';
}
