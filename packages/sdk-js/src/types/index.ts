// ========== Common Types ==========

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, any>;
}

// ========== Link Types ==========

export interface Link {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  title?: string;
  description?: string;
  tags: string[];
  teamId: string;
  userId: string;
  campaignId?: string;
  expiresAt?: string;
  password?: string;
  isActive: boolean;
  clickCount: number;
  uniqueClickCount: number;
  lastClickedAt?: string;
  metadata?: Record<string, any>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLinkParams {
  originalUrl: string;
  customCode?: string;
  title?: string;
  description?: string;
  tags?: string[];
  campaignId?: string;
  expiresAt?: string;
  password?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  metadata?: Record<string, any>;
}

export interface UpdateLinkParams {
  originalUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  campaignId?: string;
  expiresAt?: string;
  password?: string;
  isActive?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  metadata?: Record<string, any>;
}

export interface LinkFilter {
  search?: string;
  tags?: string[];
  campaignId?: string;
  isActive?: boolean;
  hasPassword?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

// ========== Campaign Types ==========

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  userId: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  linkCount: number;
  totalClicks: number;
  totalConversions: number;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignParams {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateCampaignParams {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  tags?: string[];
  metadata?: Record<string, any>;
}

// ========== QR Code Types ==========

export interface QRCode {
  id: string;
  linkId: string;
  shortUrl: string;
  format: 'png' | 'svg' | 'pdf';
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  logoUrl?: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  scanCount: number;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQRCodeParams {
  linkId: string;
  format?: 'png' | 'svg' | 'pdf';
  size?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export interface QRCodeStyle {
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  cornerRadius?: number;
  dotStyle?: 'square' | 'rounded' | 'dots';
}

// ========== Analytics Types ==========

export interface AnalyticsSummary {
  totalClicks: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
  topCountries: Array<{ country: string; clicks: number }>;
  topDevices: Array<{ device: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
}

export interface ClickEvent {
  id: string;
  linkId: string;
  timestamp: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  isUnique: boolean;
  isConversion: boolean;
}

export interface TimeSeriesData {
  date: string;
  clicks: number;
  uniqueVisitors: number;
  conversions?: number;
}

export interface AnalyticsQuery {
  linkId?: string;
  campaignId?: string;
  startDate: string;
  endDate: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  groupBy?: ('country' | 'device' | 'browser' | 'referrer')[];
}

// ========== Team Types ==========

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'core' | 'growth' | 'premium' | 'enterprise';
  memberCount: number;
  linkLimit: number;
  linkUsage: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  email: string;
  name?: string;
  joinedAt: string;
}

export interface InviteParams {
  email: string;
  role?: 'admin' | 'member' | 'viewer';
}

// ========== Webhook Types ==========

export interface Webhook {
  id: string;
  teamId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export type WebhookEvent =
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.clicked'
  | 'campaign.created'
  | 'campaign.updated'
  | 'campaign.completed'
  | 'qr.scanned'
  | 'goal.reached';

export interface CreateWebhookParams {
  url: string;
  events: WebhookEvent[];
  secret?: string;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: WebhookEvent[];
  isActive?: boolean;
}

// ========== SDK Configuration ==========

export interface LnkClientConfig {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  onTokenRefresh?: (newToken: string) => void;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}
