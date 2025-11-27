import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface PlanLimits {
  maxLinks: number;
  maxClicks: number;
  maxQrCodes: number;
  maxTeamMembers: number;
  maxCustomDomains: number;
  maxCampaigns: number;
  maxApiRequests: number;
  retentionDays: number;
  features: {
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
  };
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.FREE]: {
    maxLinks: 25,
    maxClicks: 1000,
    maxQrCodes: 5,
    maxTeamMembers: 1,
    maxCustomDomains: 0,
    maxCampaigns: 1,
    maxApiRequests: 100,
    retentionDays: 30,
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
    },
  },
  [PlanType.STARTER]: {
    maxLinks: 500,
    maxClicks: 50000,
    maxQrCodes: 50,
    maxTeamMembers: 3,
    maxCustomDomains: 1,
    maxCampaigns: 10,
    maxApiRequests: 10000,
    retentionDays: 180,
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
    },
  },
  [PlanType.PRO]: {
    maxLinks: 5000,
    maxClicks: 500000,
    maxQrCodes: 500,
    maxTeamMembers: 10,
    maxCustomDomains: 5,
    maxCampaigns: 50,
    maxApiRequests: 100000,
    retentionDays: 365,
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
    },
  },
  [PlanType.ENTERPRISE]: {
    maxLinks: -1, // Unlimited
    maxClicks: -1,
    maxQrCodes: -1,
    maxTeamMembers: -1,
    maxCustomDomains: -1,
    maxCampaigns: -1,
    maxApiRequests: -1,
    retentionDays: -1,
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
    },
  },
};

export { PLAN_LIMITS };

@Entity('team_quotas')
export class TeamQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  teamId: string;

  @Column({ type: 'enum', enum: PlanType, default: PlanType.FREE })
  plan: PlanType;

  @Column({ default: 0 })
  linksUsed: number;

  @Column({ default: 0 })
  clicksUsed: number;

  @Column({ default: 0 })
  qrCodesUsed: number;

  @Column({ default: 0 })
  apiRequestsUsed: number;

  @Column({ nullable: true })
  billingCycleStart?: Date;

  @Column({ nullable: true })
  billingCycleEnd?: Date;

  @Column('jsonb', { nullable: true })
  customLimits?: Partial<PlanLimits>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('quota_usage_logs')
export class QuotaUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  resourceType: string;

  @Column()
  action: string;

  @Column({ default: 1 })
  amount: number;

  @Column({ nullable: true })
  resourceId?: string;

  @CreateDateColumn()
  timestamp: Date;
}
