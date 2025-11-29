import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ABTestStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export enum ABTestMetric {
  CLICKS = 'clicks',
  CONVERSIONS = 'conversions',
  CONVERSION_RATE = 'conversion_rate',
  REVENUE = 'revenue',
  TIME_ON_PAGE = 'time_on_page',
  BOUNCE_RATE = 'bounce_rate',
}

export interface ABTestVariant {
  id: string;
  name: string;
  targetUrl: string;
  trafficPercentage: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
  bounces?: number;
  totalTimeOnPage?: number; // milliseconds
  uniqueVisitors?: number;
}

export interface ABTestSettings {
  minimumSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  primaryMetric: ABTestMetric;
  autoComplete: boolean;
  autoSelectWinner: boolean;
  maxDuration?: number; // days
  minConversions?: number;
  trafficAllocationMethod: 'equal' | 'weighted' | 'bandit';
}

export interface StatisticalResult {
  isSignificant: boolean;
  confidenceLevel: number;
  pValue: number;
  uplift: number; // percentage improvement
  powerAnalysis: number;
  recommendedSampleSize: number;
}

@Entity('ab_tests')
@Index(['status', 'startedAt'])
export class ABTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column('jsonb')
  variants: ABTestVariant[];

  @Column({ type: 'enum', enum: ABTestStatus, default: ABTestStatus.DRAFT })
  @Index()
  status: ABTestStatus;

  @Column({ nullable: true })
  winnerVariantId?: string;

  @Column('simple-array', { default: '' })
  trackingGoals: string[];

  @Column('jsonb', { default: {} })
  settings: ABTestSettings;

  @Column('jsonb', { nullable: true })
  statisticalResults?: Record<string, StatisticalResult>;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  scheduledEndDate?: Date;

  @Column({ default: 0 })
  totalClicks: number;

  @Column({ default: 0 })
  totalConversions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ nullable: true })
  campaignId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('ab_test_events')
@Index(['testId', 'variantId'])
@Index(['testId', 'timestamp'])
export class ABTestEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  testId: string;

  @Column()
  @Index()
  variantId: string;

  @Column()
  visitorId: string;

  @Column()
  eventType: string; // click, conversion, bounce, engagement

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  value?: number;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  device?: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
