import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type WebhookTemplatePlatform = 'slack' | 'discord' | 'teams' | 'custom';

@Entity('webhook_template_presets')
export class WebhookTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ default: 'custom' })
  @Index()
  platform: WebhookTemplatePlatform;

  @Column({ nullable: true })
  url?: string;

  @Column({ default: 'POST' })
  method: 'GET' | 'POST' | 'PUT';

  @Column('jsonb', { nullable: true })
  headers?: Record<string, string>;

  @Column('jsonb', { nullable: true })
  slackConfig?: {
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };

  @Column('jsonb', { nullable: true })
  discordConfig?: {
    username?: string;
    avatarUrl?: string;
  };

  @Column('jsonb', { nullable: true })
  teamsConfig?: {
    themeColor?: string;
    sections?: any[];
  };

  @Column('jsonb', { nullable: true })
  payloadTemplate?: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
