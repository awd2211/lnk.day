import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookEventType {
  // Link events
  LINK_CREATED = 'link.created',
  LINK_UPDATED = 'link.updated',
  LINK_DELETED = 'link.deleted',
  LINK_CLICKED = 'link.clicked',
  LINK_MILESTONE = 'link.milestone',
  LINK_EXPIRED = 'link.expired',

  // QR events
  QR_CREATED = 'qr.created',
  QR_SCANNED = 'qr.scanned',
  QR_UPDATED = 'qr.updated',
  QR_DELETED = 'qr.deleted',

  // Page events
  PAGE_CREATED = 'page.created',
  PAGE_PUBLISHED = 'page.published',
  PAGE_UNPUBLISHED = 'page.unpublished',
  PAGE_DELETED = 'page.deleted',

  // Campaign events
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_ENDED = 'campaign.ended',
  CAMPAIGN_GOAL_REACHED = 'campaign.goal_reached',

  // Team events
  TEAM_MEMBER_ADDED = 'team.member_added',
  TEAM_MEMBER_REMOVED = 'team.member_removed',
  TEAM_ROLE_CHANGED = 'team.role_changed',

  // Analytics events
  ANALYTICS_THRESHOLD = 'analytics.threshold',
  ANALYTICS_ANOMALY = 'analytics.anomaly',
}

// Webhook filter configuration
export interface WebhookFilters {
  tags?: string[];           // Filter by link tags
  linkIds?: string[];        // Filter by specific links
  campaignIds?: string[];    // Filter by campaigns
  domains?: string[];        // Filter by domains
  threshold?: {              // Threshold conditions
    metric: 'clicks' | 'conversions' | 'revenue';
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    value: number;
  };
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILING = 'failing',
  DISABLED = 'disabled',
}

@Entity('webhook_endpoints')
@Index(['teamId', 'enabled'])
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ type: 'text' })
  secret: string;

  @Column('simple-array')
  events: WebhookEventType[];

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.ACTIVE })
  @Index()
  status: WebhookStatus;

  @Column({ default: true })
  @Index()
  enabled: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ default: 0 })
  consecutiveFailures: number;

  @Column({ nullable: true })
  lastTriggeredAt: Date;

  @Column({ nullable: true })
  lastSuccessAt: Date;

  @Column({ nullable: true })
  lastFailureAt: Date;

  @Column({ nullable: true })
  lastErrorMessage: string;

  @Column('jsonb', { nullable: true })
  headers: Record<string, string>;

  @Column('jsonb', { nullable: true })
  filters: WebhookFilters;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
