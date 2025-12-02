import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WebhookPlatform, WebhookEvent } from '../../webhook/entities/webhook.entity';

/**
 * Webhook Template - 保存 Webhook 配置供复用
 */
@Entity('webhook_templates')
@Index(['teamId', 'isFavorite'])
@Index(['teamId', 'platform'])
@Index(['teamId', 'createdAt'])
export class WebhookTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  createdBy: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  // ========== Webhook 配置 ==========

  @Column({
    type: 'enum',
    enum: WebhookPlatform,
    default: WebhookPlatform.CUSTOM,
  })
  platform: WebhookPlatform;

  @Column({ nullable: true })
  webhookUrl?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  defaultEvent?: WebhookEvent;

  @Column({ nullable: true })
  secret?: string;

  @Column('jsonb', { default: {} })
  defaultFilters: {
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
  defaultHeaders: Record<string, string>;

  // Slack 特定配置
  @Column('jsonb', { nullable: true })
  slackConfig?: {
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };

  // Discord 特定配置
  @Column('jsonb', { nullable: true })
  discordConfig?: {
    username?: string;
    avatarUrl?: string;
  };

  // Teams 特定配置
  @Column('jsonb', { nullable: true })
  teamsConfig?: {
    title?: string;
    themeColor?: string;
  };

  // 消息模板
  @Column({ type: 'text', nullable: true })
  messageTemplate?: string;

  @Column('jsonb', { nullable: true })
  payloadTemplate?: Record<string, any>;

  // ========== 模板设置 ==========

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
