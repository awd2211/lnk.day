import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SavedSearchVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
}

export interface SearchFilters {
  domains?: string[];
  tags?: string[];
  status?: string[];
  campaignIds?: string[];
  folderIds?: string[];
  minClicks?: number;
  maxClicks?: number;
  startDate?: string;
  endDate?: string;
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'teams';
  enabled: boolean;
  // Email specific
  recipients?: string[];
  // Slack/Teams specific
  webhookUrl?: string;
  channelName?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'on_match';  // on_match: 当有新链接匹配时
  recipients: string[];  // Email addresses (legacy support)
  threshold?: number;    // 新结果数量阈值
  channels?: NotificationChannel[];  // Multi-channel support
  includeTopResults?: boolean;  // 是否包含前10个结果
  includeSummary?: boolean;     // 是否包含统计摘要
}

@Entity('saved_searches')
@Index(['teamId', 'userId'])
@Index(['teamId', 'visibility'])
export class SavedSearch {
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

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  query: string;

  @Column('jsonb', { nullable: true })
  filters: SearchFilters;

  @Column('jsonb', { nullable: true })
  sort: SearchSort;

  @Column({
    type: 'enum',
    enum: SavedSearchVisibility,
    default: SavedSearchVisibility.PRIVATE,
  })
  visibility: SavedSearchVisibility;

  @Column('jsonb', { nullable: true })
  notification: NotificationSettings;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ nullable: true })
  lastResultCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
