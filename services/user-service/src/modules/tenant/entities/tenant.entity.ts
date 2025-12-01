import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  TRIAL = 'trial',
}

export enum TenantType {
  PERSONAL = 'personal',
  TEAM = 'team',
  ORGANIZATION = 'organization',
  ENTERPRISE = 'enterprise',
  RESELLER = 'reseller',
}

@Entity('tenants')
@Index(['status', 'type'])
@Index(['slug'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: TenantType,
    default: TenantType.TEAM,
  })
  type: TenantType;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'parent_tenant_id', nullable: true })
  parentTenantId: string;

  // 白标配置
  @Column({ type: 'jsonb', nullable: true })
  branding: {
    logo?: string;
    logoDark?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    customCss?: string;
  };

  // 域名配置
  @Column({ name: 'custom_domain', type: 'varchar', length: 255, nullable: true })
  customDomain: string;

  @Column({ name: 'app_domain', type: 'varchar', length: 255, nullable: true })
  appDomain: string;

  @Column({ name: 'short_domain', type: 'varchar', length: 255, nullable: true })
  shortDomain: string;

  // 联系信息
  @Column({ type: 'jsonb', nullable: true })
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
  };

  // 业务配置
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    timezone?: string;
    locale?: string;
    dateFormat?: string;
    currency?: string;
    defaultLinkExpiry?: number;
    allowPublicSignup?: boolean;
    requireEmailVerification?: boolean;
    require2FA?: boolean;
    ipWhitelist?: string[];
    allowedEmailDomains?: string[];
  };

  // 功能开关
  @Column({ type: 'jsonb', nullable: true })
  features: {
    analytics?: boolean;
    campaigns?: boolean;
    qrCodes?: boolean;
    bioLinks?: boolean;
    deepLinks?: boolean;
    customDomains?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
    sso?: boolean;
    auditLogs?: boolean;
    whiteLabel?: boolean;
    subAccounts?: boolean;
  };

  // 资源限制
  @Column({ type: 'jsonb', nullable: true })
  limits: {
    maxUsers?: number;
    maxTeams?: number;
    maxLinks?: number;
    maxClicks?: number;
    maxDomains?: number;
    maxApiKeys?: number;
    maxWebhooks?: number;
    storageQuota?: number; // in MB
  };

  // 计费信息
  @Column({ type: 'jsonb', nullable: true })
  billing: {
    plan?: string;
    customerId?: string;
    subscriptionId?: string;
    billingEmail?: string;
    taxId?: string;
    paymentMethod?: string;
  };

  // 试用期
  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt: Date;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('tenant_members')
@Index(['tenantId', 'userId'], { unique: true })
@Index(['userId'])
export class TenantMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'member' })
  role: string; // owner, admin, member

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ name: 'invited_by', nullable: true })
  invitedBy: string;

  @Column({ name: 'invited_at', type: 'timestamptz', nullable: true })
  invitedAt: Date;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('tenant_invitations')
@Index(['tenantId', 'email'], { unique: true })
@Index(['token'])
export class TenantInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, default: 'member' })
  role: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ name: 'invited_by' })
  invitedBy: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('tenant_audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'action'])
@Index(['userId'])
export class TenantAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('tenant_api_keys')
@Index(['tenantId', 'isActive'])
@Index(['keyHash'], { unique: true })
export class TenantApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 20 })
  keyPrefix: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255 })
  keyHash: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ type: 'jsonb', nullable: true })
  scopes: string[];

  @Column({ name: 'rate_limit', type: 'int', default: 1000 })
  rateLimit: number; // requests per hour

  @Column({ name: 'ip_whitelist', type: 'jsonb', nullable: true })
  ipWhitelist: string[];

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
