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
  CTR = 'ctr', // Click-through rate
  ENGAGEMENT_RATE = 'engagement_rate',
  BOUNCE_RATE = 'bounce_rate', // Lower is better
  SESSION_DURATION = 'session_duration',
  PAGE_VIEWS = 'page_views',
  FORM_SUBMISSIONS = 'form_submissions',
  SIGNUPS = 'signups',
  PURCHASES = 'purchases',
  AVERAGE_ORDER_VALUE = 'average_order_value',
  RETURN_VISITORS = 'return_visitors',
  SOCIAL_SHARES = 'social_shares',
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
    // A/B test integration
    linkedABTestId?: string;
    linkedVariantId?: string;
    // Goal comparison
    compareWithGoalId?: string;
    benchmarkValue?: number;
    // Attribution settings
    attributionModel?: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
    attributionWindow?: number; // days
    // Advanced settings
    isInverse?: boolean; // true for metrics where lower is better (e.g., bounce rate)
    unitLabel?: string; // e.g., "%", "seconds", "¥"
    decimalPlaces?: number;
  };

  @Column('jsonb', { default: [] })
  history: Array<{
    timestamp: Date;
    value: number;
    source?: string; // What triggered this update
  }>;

  @Column('jsonb', { nullable: true })
  projection?: {
    estimatedCompletionDate?: Date;
    dailyRate?: number;
    weeklyTrend?: number; // percentage change
    confidence?: number; // 0-100
    lastCalculatedAt?: Date;
  };

  @Column({ nullable: true })
  startValue?: number; // Initial value when goal was created

  @Column({ nullable: true })
  baselineValue?: number; // Historical baseline for comparison

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  reachedAt?: Date;
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
