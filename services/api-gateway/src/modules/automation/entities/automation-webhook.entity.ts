import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AutomationPlatform {
  ZAPIER = 'zapier',
  MAKE = 'make',
  N8N = 'n8n',
  PIPEDREAM = 'pipedream',
  CUSTOM = 'custom',
}

export type WebhookEvent =
  | 'link.created'
  | 'link.clicked'
  | 'link.updated'
  | 'link.deleted'
  | 'link.milestone'
  | 'qr.scanned'
  | 'page.published'
  | 'page.viewed'
  | 'comment.created'
  | 'user.invited'
  | 'campaign.started'
  | 'campaign.ended'
  | 'form.submitted'
  | 'conversion.tracked';

@Entity('automation_webhooks')
@Index(['teamId', 'platform', 'event'])
@Index(['teamId', 'enabled'])
export class AutomationWebhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  teamId: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: AutomationPlatform,
    default: AutomationPlatform.CUSTOM,
  })
  platform: AutomationPlatform;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  webhookUrl: string;

  @Column({ type: 'varchar', length: 100 })
  event: WebhookEvent;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret?: string;

  @Column('jsonb', { default: {} })
  filters: {
    linkIds?: string[];
    pageIds?: string[];
    campaignIds?: string[];
    tags?: string[];
    conditions?: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith';
      value: any;
    }>;
  };

  @Column('jsonb', { default: {} })
  headers: Record<string, string>;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastError?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
