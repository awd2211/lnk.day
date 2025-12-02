import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type RedirectRuleTemplateCategory = 'ab_test' | 'geo' | 'device' | 'time' | 'custom';

@Entity('redirect_rule_template_presets')
export class RedirectRuleTemplatePreset {
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
  category: RedirectRuleTemplateCategory;

  @Column('jsonb', { nullable: true })
  abTestVariants?: Array<{
    name: string;
    url: string;
    weight: number;
  }>;

  @Column('jsonb', { nullable: true })
  geoPresets?: Array<{
    name: string;
    countries: string[];
    regions?: string[];
    url: string;
  }>;

  @Column('jsonb', { nullable: true })
  devicePresets?: Array<{
    name: string;
    devices: string[];
    os?: string[];
    browsers?: string[];
    url: string;
  }>;

  @Column('jsonb', { nullable: true })
  timePresets?: Array<{
    name: string;
    startTime: string;
    endTime: string;
    days: number[];
    timezone: string;
    url: string;
  }>;

  @Column({ nullable: true })
  defaultUrl?: string;

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
