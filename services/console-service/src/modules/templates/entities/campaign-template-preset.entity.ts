import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CampaignScenario =
  | 'holiday_promotion'
  | 'new_product_launch'
  | 'flash_sale'
  | 'seasonal_campaign'
  | 'brand_awareness'
  | 'lead_generation'
  | 'event_marketing'
  | 'influencer_collaboration'
  | 'referral_program'
  | 'newsletter'
  | 'other';

@Entity('campaign_template_presets')
export class CampaignTemplatePreset {
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
  thumbnailUrl?: string;

  @Column({ default: 'other' })
  @Index()
  scenario: CampaignScenario;

  @Column('text', { array: true, default: '{}' })
  channels: string[]; // email, social, paid_ads, sms, push, display

  @Column('jsonb', { default: {} })
  utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
  };

  @Column('jsonb', { nullable: true })
  defaultGoals?: {
    clicks?: number;
    conversions?: number;
    revenue?: number;
  };

  @Column('jsonb', { default: {} })
  settings: {
    autoArchive?: boolean;
    notifyOnGoal?: boolean;
    dailyBudget?: number;
    durationDays?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
