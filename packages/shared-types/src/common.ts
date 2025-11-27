// Common utility types

export type UUID = string;

export type Timestamp = Date | string;

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Date;
}

// Domain types
export interface Domain {
  id: string;
  domain: string;
  teamId: string;
  verified: boolean;
  dnsRecords: DnsRecord[];
  sslStatus: SslStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  verified: boolean;
}

export enum SslStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

// Analytics types
export interface ClickEvent {
  id: string;
  linkId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  referer?: string;
  country?: string;
  region?: string;
  city?: string;
  device: DeviceInfo;
  browser: BrowserInfo;
  os: OsInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  brand?: string;
  model?: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
}

export interface OsInfo {
  name: string;
  version: string;
}

// Webhook types
export interface Webhook {
  id: string;
  teamId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum WebhookEvent {
  LINK_CREATED = 'link.created',
  LINK_UPDATED = 'link.updated',
  LINK_DELETED = 'link.deleted',
  LINK_CLICKED = 'link.clicked',
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_UPDATED = 'campaign.updated',
}

// API Key types
export interface ApiKey {
  id: string;
  teamId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiScope[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

export enum ApiScope {
  LINKS_READ = 'links:read',
  LINKS_WRITE = 'links:write',
  CAMPAIGNS_READ = 'campaigns:read',
  CAMPAIGNS_WRITE = 'campaigns:write',
  ANALYTICS_READ = 'analytics:read',
  TEAM_READ = 'team:read',
  TEAM_WRITE = 'team:write',
}

// Billing types
export interface Subscription {
  id: string;
  teamId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIALING = 'TRIALING',
}

// Usage limits
export interface UsageLimits {
  linksPerMonth: number;
  clicksPerMonth: number;
  customDomains: number;
  teamMembers: number;
  apiRequests: number;
}

export interface UsageStats {
  linksCreated: number;
  clicksTracked: number;
  apiCalls: number;
  period: {
    start: Date;
    end: Date;
  };
}
