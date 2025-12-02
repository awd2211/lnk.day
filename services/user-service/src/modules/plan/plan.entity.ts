import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PlanFeatures {
  customBranding: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  bulkOperations: boolean;
  abtesting: boolean;
  deepLinks: boolean;
  passwordProtection: boolean;
  expiringLinks: boolean;
  geoTargeting: boolean;
  deviceTargeting: boolean;
  webhooks: boolean;
  utmBuilder: boolean;
  socialPreview: boolean;
  qrCodeCustomization: boolean;
  linkRotation: boolean;
  retargeting: boolean;
  whiteLabel: boolean;
  sso: boolean;
  auditLogs: boolean;
  teamRoles: boolean;
  dedicatedSupport: boolean;
  customIntegrations: boolean;
}

export interface PlanLimits {
  maxLinks: number;
  maxClicks: number;
  maxQrCodes: number;
  maxTeamMembers: number;
  maxCustomDomains: number;
  maxCampaigns: number;
  maxApiRequests: number;
  maxBioLinks: number;
  maxFolders: number;
  retentionDays: number;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface OveragePricing {
  clicks: number;      // per 1000 clicks
  apiRequests: number; // per 1000 requests
  links: number;       // per link
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string; // free, starter, team, pro, enterprise

  @Column()
  name: string; // 显示名称

  @Column({ nullable: true })
  description: string;

  @Column('jsonb')
  limits: PlanLimits;

  @Column('jsonb')
  features: PlanFeatures;

  @Column('jsonb')
  pricing: PlanPricing;

  @Column('jsonb', { name: 'overage_pricing', nullable: true })
  overagePricing?: OveragePricing;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number; // 排序顺序

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // 是否启用

  @Column({ name: 'is_default', default: false })
  isDefault: boolean; // 是否为默认套餐（免费套餐）

  @Column({ name: 'is_public', default: true })
  isPublic: boolean; // 是否公开显示在定价页

  @Column({ name: 'trial_days', nullable: true })
  trialDays: number; // 试用天数

  @Column({ name: 'trial_requires_credit_card', default: false })
  trialRequiresCreditCard: boolean;

  @Column({ name: 'stripe_price_id_monthly', nullable: true })
  stripePriceIdMonthly: string; // Stripe 月付价格ID

  @Column({ name: 'stripe_price_id_yearly', nullable: true })
  stripePriceIdYearly: string; // Stripe 年付价格ID

  @Column({ name: 'badge_text', nullable: true })
  badgeText: string; // 角标文字，如 "Most Popular"

  @Column({ name: 'badge_color', nullable: true })
  badgeColor: string; // 角标颜色

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// 默认套餐配置（用于初始化数据库）
export const DEFAULT_PLANS: Partial<Plan>[] = [
  {
    code: 'free',
    name: '免费版',
    description: '适合个人用户体验',
    sortOrder: 0,
    isDefault: true,
    isPublic: true,
    trialDays: 0,
    limits: {
      maxLinks: 25,
      maxClicks: 1000,
      maxQrCodes: 5,
      maxTeamMembers: 1,
      maxCustomDomains: 0,
      maxCampaigns: 1,
      maxApiRequests: 0,
      maxBioLinks: 1,
      maxFolders: 3,
      retentionDays: 30,
    },
    features: {
      customBranding: false,
      advancedAnalytics: false,
      apiAccess: false,
      bulkOperations: false,
      abtesting: false,
      deepLinks: false,
      passwordProtection: false,
      expiringLinks: true,
      geoTargeting: false,
      deviceTargeting: false,
      webhooks: false,
      utmBuilder: false,
      socialPreview: false,
      qrCodeCustomization: false,
      linkRotation: false,
      retargeting: false,
      whiteLabel: false,
      sso: false,
      auditLogs: false,
      teamRoles: false,
      dedicatedSupport: false,
      customIntegrations: false,
    },
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
    },
  },
  {
    code: 'starter',
    name: '入门版',
    description: '适合个人用户和自由职业者',
    sortOrder: 1,
    isPublic: true,
    trialDays: 7,
    trialRequiresCreditCard: false,
    limits: {
      maxLinks: 500,
      maxClicks: 50000,
      maxQrCodes: 50,
      maxTeamMembers: 2,
      maxCustomDomains: 1,
      maxCampaigns: 5,
      maxApiRequests: 10000,
      maxBioLinks: 3,
      maxFolders: 10,
      retentionDays: 90,
    },
    features: {
      customBranding: true,
      advancedAnalytics: false,
      apiAccess: true,
      bulkOperations: true,
      abtesting: false,
      deepLinks: false,
      passwordProtection: true,
      expiringLinks: true,
      geoTargeting: false,
      deviceTargeting: false,
      webhooks: false,
      utmBuilder: true,
      socialPreview: true,
      qrCodeCustomization: false,
      linkRotation: false,
      retargeting: false,
      whiteLabel: false,
      sso: false,
      auditLogs: false,
      teamRoles: false,
      dedicatedSupport: false,
      customIntegrations: false,
    },
    pricing: {
      monthly: 29,
      yearly: 278,
      currency: 'USD',
    },
  },
  {
    code: 'team',
    name: '团队版',
    description: '适合小型团队协作',
    sortOrder: 2,
    isPublic: true,
    trialDays: 14,
    trialRequiresCreditCard: false,
    badgeText: '热门',
    badgeColor: '#10B981',
    limits: {
      maxLinks: 2000,
      maxClicks: 200000,
      maxQrCodes: 200,
      maxTeamMembers: 5,
      maxCustomDomains: 2,
      maxCampaigns: 25,
      maxApiRequests: 50000,
      maxBioLinks: 10,
      maxFolders: 50,
      retentionDays: 365,
    },
    features: {
      customBranding: true,
      advancedAnalytics: true,
      apiAccess: true,
      bulkOperations: true,
      abtesting: false,
      deepLinks: false,
      passwordProtection: true,
      expiringLinks: true,
      geoTargeting: false,
      deviceTargeting: false,
      webhooks: true,
      utmBuilder: true,
      socialPreview: true,
      qrCodeCustomization: true,
      linkRotation: false,
      retargeting: false,
      whiteLabel: false,
      sso: false,
      auditLogs: true,
      teamRoles: true,
      dedicatedSupport: false,
      customIntegrations: false,
    },
    pricing: {
      monthly: 49,
      yearly: 470,
      currency: 'USD',
    },
  },
  {
    code: 'pro',
    name: '专业版',
    description: '适合成长型企业',
    sortOrder: 3,
    isPublic: true,
    trialDays: 14,
    trialRequiresCreditCard: true,
    limits: {
      maxLinks: 10000,
      maxClicks: 1000000,
      maxQrCodes: 1000,
      maxTeamMembers: 20,
      maxCustomDomains: 10,
      maxCampaigns: 100,
      maxApiRequests: 200000,
      maxBioLinks: 50,
      maxFolders: 200,
      retentionDays: 730,
    },
    features: {
      customBranding: true,
      advancedAnalytics: true,
      apiAccess: true,
      bulkOperations: true,
      abtesting: true,
      deepLinks: true,
      passwordProtection: true,
      expiringLinks: true,
      geoTargeting: true,
      deviceTargeting: true,
      webhooks: true,
      utmBuilder: true,
      socialPreview: true,
      qrCodeCustomization: true,
      linkRotation: true,
      retargeting: true,
      whiteLabel: false,
      sso: false,
      auditLogs: true,
      teamRoles: true,
      dedicatedSupport: false,
      customIntegrations: false,
    },
    pricing: {
      monthly: 99,
      yearly: 950,
      currency: 'USD',
    },
    overagePricing: {
      clicks: 1,      // $1 per 1000 clicks
      apiRequests: 0.1, // $0.10 per 1000 requests
      links: 0.10,    // $0.10 per link
    },
  },
  {
    code: 'enterprise',
    name: '企业版',
    description: '适合大型企业，提供定制化服务',
    sortOrder: 4,
    isPublic: true,
    trialDays: 30,
    trialRequiresCreditCard: false,
    limits: {
      maxLinks: -1,
      maxClicks: -1,
      maxQrCodes: -1,
      maxTeamMembers: -1,
      maxCustomDomains: -1,
      maxCampaigns: -1,
      maxApiRequests: -1,
      maxBioLinks: -1,
      maxFolders: -1,
      retentionDays: -1,
    },
    features: {
      customBranding: true,
      advancedAnalytics: true,
      apiAccess: true,
      bulkOperations: true,
      abtesting: true,
      deepLinks: true,
      passwordProtection: true,
      expiringLinks: true,
      geoTargeting: true,
      deviceTargeting: true,
      webhooks: true,
      utmBuilder: true,
      socialPreview: true,
      qrCodeCustomization: true,
      linkRotation: true,
      retargeting: true,
      whiteLabel: true,
      sso: true,
      auditLogs: true,
      teamRoles: true,
      dedicatedSupport: true,
      customIntegrations: true,
    },
    pricing: {
      monthly: 299,
      yearly: 2870,
      currency: 'USD',
    },
  },
];
