import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UTMParams, CampaignType } from '../campaign/entities/campaign.entity';

@Entity('campaign_templates')
@Index(['teamId', 'userId'])
export class CampaignTemplate {
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
  @Index()
  userId: string;

  @Column({ default: false })
  @Index()
  isPublic: boolean;

  @Column({ type: 'enum', enum: CampaignType, default: CampaignType.MARKETING })
  type: CampaignType;

  @Column('simple-array', { default: '' })
  channels: string[];

  @Column('jsonb', { default: {} })
  utmParams: UTMParams;

  @Column('jsonb', { nullable: true })
  defaultGoals?: {
    clicks?: number;
    conversions?: number;
    revenue?: number;
  };

  @Column('jsonb', { default: {} })
  settings: {
    autoArchiveOnEnd?: boolean;
    notifyOnGoalReached?: boolean;
    dailyBudgetLimit?: number;
    defaultUtmSource?: string;
    defaultUtmMedium?: string;
    autoTagLinks?: boolean;
  };

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
