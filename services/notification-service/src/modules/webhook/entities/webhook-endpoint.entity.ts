import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookEventType {
  LINK_CREATED = 'link.created',
  LINK_UPDATED = 'link.updated',
  LINK_DELETED = 'link.deleted',
  LINK_CLICKED = 'link.clicked',
  LINK_MILESTONE = 'link.milestone',
  PAGE_PUBLISHED = 'page.published',
  PAGE_UNPUBLISHED = 'page.unpublished',
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_ENDED = 'campaign.ended',
  TEAM_MEMBER_ADDED = 'team.member_added',
  TEAM_MEMBER_REMOVED = 'team.member_removed',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILING = 'failing',
  DISABLED = 'disabled',
}

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
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
  status: WebhookStatus;

  @Column({ default: true })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
