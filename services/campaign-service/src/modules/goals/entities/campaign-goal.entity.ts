import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GoalType {
  CLICKS = 'clicks',
  CONVERSIONS = 'conversions',
  REVENUE = 'revenue',
  UNIQUE_VISITORS = 'unique_visitors',
  CUSTOM = 'custom',
}

export enum GoalStatus {
  ACTIVE = 'active',
  REACHED = 'reached',
  FAILED = 'failed',
  PAUSED = 'paused',
}

export interface NotificationThreshold {
  percentage: number;
  notified: boolean;
  notifiedAt?: Date;
}

export interface NotificationChannels {
  email?: string[];
  webhook?: string;
  slack?: {
    webhookUrl: string;
    channel?: string;
  };
  teams?: {
    webhookUrl: string;
  };
  sms?: string[];
}

@Entity('campaign_goals')
export class CampaignGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  campaignId: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: GoalType })
  type: GoalType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  target: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  current: number;

  @Column({ nullable: true })
  currency?: string; // For revenue goals

  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.ACTIVE })
  status: GoalStatus;

  @Column('jsonb', { default: [] })
  thresholds: NotificationThreshold[];

  @Column('jsonb', { default: {} })
  notifications: NotificationChannels;

  @Column({ nullable: true })
  deadline?: Date;

  @Column({ default: true })
  enabled: boolean;

  @Column('jsonb', { default: {} })
  metadata: {
    customMetric?: string;
    formula?: string;
    description?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('goal_notifications')
export class GoalNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  goalId: string;

  @Column()
  @Index()
  campaignId: string;

  @Column()
  type: string; // threshold_reached, goal_reached, deadline_warning

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column('jsonb')
  channels: {
    email?: boolean;
    webhook?: boolean;
    slack?: boolean;
    teams?: boolean;
    sms?: boolean;
  };

  @Column('jsonb', { nullable: true })
  response?: Record<string, any>;

  @Column({ default: false })
  success: boolean;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  sentAt: Date;
}
