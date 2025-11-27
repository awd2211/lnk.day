import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum CampaignType {
  MARKETING = 'marketing',
  SOCIAL = 'social',
  EMAIL = 'email',
  AFFILIATE = 'affiliate',
  OTHER = 'other',
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface CampaignGoal {
  type: 'clicks' | 'conversions' | 'revenue';
  target: number;
  current: number;
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: CampaignType, default: CampaignType.MARKETING })
  type: CampaignType;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column('simple-array', { default: '' })
  channels: string[];

  @Column('jsonb', { default: {} })
  utmParams: UTMParams;

  @Column('jsonb', { nullable: true })
  goal?: CampaignGoal;

  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  spent: number;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column('simple-array', { default: '' })
  linkIds: string[];

  @Column({ default: 0 })
  totalLinks: number;

  @Column({ default: 0 })
  totalClicks: number;

  @Column({ default: 0 })
  uniqueClicks: number;

  @Column({ default: 0 })
  conversions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  revenue: number;

  @Column('jsonb', { default: {} })
  settings: {
    autoArchiveOnEnd?: boolean;
    notifyOnGoalReached?: boolean;
    dailyBudgetLimit?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
