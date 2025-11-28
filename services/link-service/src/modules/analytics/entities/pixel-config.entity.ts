import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AnalyticsPlatform = 'ga4' | 'facebook_pixel' | 'tiktok_pixel' | 'google_ads' | 'linkedin_insight';

@Entity('pixel_configs')
export class PixelConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ nullable: true })
  @Index()
  linkId?: string; // null = team-wide, set = link-specific

  @Column({ type: 'varchar', length: 50 })
  platform: AnalyticsPlatform;

  @Column()
  pixelId: string;

  @Column({ nullable: true })
  name?: string; // Friendly name for the pixel

  @Column({ default: true })
  enabled: boolean;

  @Column('simple-array', { nullable: true })
  events?: string[]; // Which events to track: ['link_click', 'qr_scan', etc.]

  @Column({ default: false })
  serverSideEnabled: boolean; // Enable Conversions API / Events API

  @Column({ nullable: true })
  accessToken?: string; // For server-side APIs (encrypted in production)

  @Column('jsonb', { default: {} })
  settings: {
    testMode?: boolean;
    customParameters?: Record<string, string>;
    conversionLabel?: string; // For Google Ads
    eventValueEnabled?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
