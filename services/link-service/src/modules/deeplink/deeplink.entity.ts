import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FallbackBehavior {
  APP_STORE = 'app_store',
  WEB_FALLBACK = 'web_fallback',
  SMART = 'smart',
}

export interface IOSConfig {
  appStoreId?: string;
  appStoreUrl?: string;
  universalLink?: string;
  customScheme?: string;
  fallbackUrl?: string;
  minimumVersion?: string;
  teamId?: string;
  bundleId?: string;
}

export interface AndroidConfig {
  packageName?: string;
  playStoreUrl?: string;
  appLink?: string;
  customScheme?: string;
  fallbackUrl?: string;
  minimumVersion?: string;
  sha256CertFingerprints?: string[];
}

export interface AttributionConfig {
  enabled: boolean;
  deferredDeepLink: boolean;
  attributionWindowDays: number;
}

@Entity('deep_link_configs')
export class DeepLinkConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  linkId: string;

  @Column({ default: true })
  @Index()
  enabled: boolean;

  @Column('jsonb', { default: {} })
  ios: IOSConfig;

  @Column('jsonb', { default: {} })
  android: AndroidConfig;

  @Column({ type: 'enum', enum: FallbackBehavior, default: FallbackBehavior.SMART })
  fallbackBehavior: FallbackBehavior;

  @Column({ nullable: true })
  webFallbackUrl?: string;

  @Column('jsonb', { default: { enabled: false, deferredDeepLink: false, attributionWindowDays: 30 } })
  attribution: AttributionConfig;

  @Column({ nullable: true })
  ogTitle?: string;

  @Column({ nullable: true })
  ogDescription?: string;

  @Column({ nullable: true })
  ogImage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('deferred_deep_links')
@Index(['linkId', 'isConverted'])
export class DeferredDeepLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  fingerprint: string;

  @Column('jsonb')
  context: {
    targetUrl: string;
    campaignId?: string;
    source?: string;
    medium?: string;
    referrer?: string;
  };

  @Column({ nullable: true })
  deviceInfo?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ default: false })
  @Index()
  isConverted: boolean;

  @Column({ nullable: true })
  convertedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @Index()
  expiresAt: Date;
}
