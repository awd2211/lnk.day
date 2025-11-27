import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface IOSConfig {
  bundleId: string;
  appStoreUrl: string;
  universalLinkPath?: string;
  customScheme?: string;
  teamId?: string;
  minimumVersion?: string;
}

export interface AndroidConfig {
  packageName: string;
  playStoreUrl: string;
  appLinkPath?: string;
  customScheme?: string;
  sha256CertFingerprints?: string[];
  minimumVersion?: number;
}

export interface SocialMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
}

@Entity('deeplinks')
export class DeepLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  linkId: string;

  @Column()
  teamId: string;

  @Column('jsonb', { nullable: true })
  iosConfig?: IOSConfig;

  @Column('jsonb', { nullable: true })
  androidConfig?: AndroidConfig;

  @Column()
  fallbackUrl: string;

  @Column({ nullable: true })
  desktopUrl?: string;

  @Column('jsonb', { nullable: true })
  socialMetadata?: SocialMetadata;

  @Column({ default: false })
  deferredDeepLinking: boolean;

  @Column({ default: 24 })
  attributionWindow: number; // hours

  @Column('jsonb', { default: {} })
  customData: Record<string, any>;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  clicks: number;

  @Column({ default: 0 })
  installs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
