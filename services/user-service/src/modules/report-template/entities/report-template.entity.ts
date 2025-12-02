import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReportCategory = 'traffic' | 'conversion' | 'engagement' | 'comparison' | 'custom';
export type DateRangeType = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';
export type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * Report Template - 保存报告配置供复用
 */
@Entity('report_templates')
@Index(['teamId', 'isFavorite'])
@Index(['teamId', 'category'])
@Index(['teamId', 'createdAt'])
export class ReportTemplate {
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

  // ========== 分类 ==========
  @Column({ default: 'custom' })
  @Index()
  category: ReportCategory;

  // ========== 指标配置 ==========
  @Column('simple-array')
  metrics: string[]; // ['clicks', 'unique_visitors', 'conversions', 'conversion_rate', 'avg_time_on_page']

  @Column('simple-array', { nullable: true })
  dimensions?: string[]; // ['date', 'country', 'device', 'browser', 'referrer', 'campaign']

  // ========== 筛选条件 ==========
  @Column('jsonb', { nullable: true })
  filters?: {
    linkIds?: string[];
    campaignIds?: string[];
    countries?: string[];
    devices?: string[];
    browsers?: string[];
    tags?: string[];
    [key: string]: any;
  };

  // ========== 时间范围 ==========
  @Column('jsonb')
  dateRange: {
    type: DateRangeType;
    startDate?: string; // ISO 格式，用于 custom 类型
    endDate?: string;
    compareWithPrevious?: boolean; // 是否与上一期对比
  };

  // ========== 分组与排序 ==========
  @Column({ nullable: true })
  groupBy?: string;

  @Column({ nullable: true })
  sortBy?: string;

  @Column({ default: 'desc' })
  sortOrder: 'asc' | 'desc';

  @Column({ nullable: true })
  limitResults?: number;

  // ========== 导出设置 ==========
  @Column({ default: 'pdf' })
  format: ExportFormat;

  @Column({ default: false })
  includeCharts: boolean;

  @Column({ default: true })
  includeSummary: boolean;

  @Column({ nullable: true })
  customBranding?: string; // Logo URL

  // ========== 定时发送 ==========
  @Column('jsonb', { nullable: true })
  schedule?: {
    enabled: boolean;
    frequency: ScheduleFrequency;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:mm format
    timezone?: string;
    recipients: string[]; // Email addresses
  };

  // ========== 模板设置 ==========
  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ nullable: true })
  lastGeneratedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
