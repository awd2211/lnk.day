import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReportTemplateCategory = 'traffic' | 'conversion' | 'engagement' | 'comparison' | 'custom';

@Entity('report_template_presets')
export class ReportTemplatePreset {
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
  category: ReportTemplateCategory;

  @Column('simple-array')
  metrics: string[];

  @Column('simple-array', { nullable: true })
  dimensions?: string[];

  @Column('jsonb', { nullable: true })
  filters?: Record<string, any>;

  @Column('jsonb')
  dateRange: {
    type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';
    startDate?: string;
    endDate?: string;
    compareWithPrevious?: boolean;
  };

  @Column({ nullable: true })
  groupBy?: string;

  @Column({ nullable: true })
  sortBy?: string;

  @Column({ default: 'desc' })
  sortOrder: 'asc' | 'desc';

  @Column({ nullable: true })
  limitResults?: number;

  @Column({ default: 'pdf' })
  format: 'pdf' | 'csv' | 'excel' | 'json';

  @Column({ default: true })
  includeCharts: boolean;

  @Column({ default: true })
  includeSummary: boolean;

  @Column({ nullable: true })
  customBranding?: string;

  @Column('jsonb', { nullable: true })
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    recipients: string[];
  };

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
