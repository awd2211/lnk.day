import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Link Template - allows users to create links quickly using saved presets
 */
@Entity('link_templates')
@Index(['teamId', 'isFavorite'])
export class LinkTemplate {
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

  // ========== Link Defaults ==========

  @Column({ nullable: true })
  defaultDomain: string;

  @Column({ nullable: true })
  defaultFolderId: string;

  @Column('simple-array', { nullable: true })
  defaultTags: string[];

  @Column('jsonb', { nullable: true })
  defaultUtmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };

  // ========== Targeting Defaults ==========

  @Column('jsonb', { nullable: true })
  defaultGeoTargeting: Array<{
    countries?: string[];
    regions?: string[];
    cities?: string[];
    targetUrl: string;
  }>;

  @Column('jsonb', { nullable: true })
  defaultDeviceTargeting: Array<{
    devices: string[];
    targetUrl: string;
  }>;

  @Column('jsonb', { nullable: true })
  defaultTimeTargeting: {
    timezone?: string;
    schedule?: Array<{
      days: number[];
      startTime: string;
      endTime: string;
      targetUrl: string;
    }>;
  };

  // ========== Security Defaults ==========

  @Column({ default: false })
  defaultPasswordProtected: boolean;

  @Column({ nullable: true })
  defaultPassword: string;

  @Column({ nullable: true })
  defaultExpiresInDays: number;

  // ========== Settings ==========

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Preset templates - system-defined templates available to all users
 */
@Entity('link_template_presets')
@Index(['category', 'isActive'])
export class LinkTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  @Column()
  @Index()
  category: string; // 'marketing', 'social', 'email', 'qr', 'custom'

  @Column('jsonb')
  defaults: {
    tags?: string[];
    utmParams?: {
      source?: string;
      medium?: string;
      campaign?: string;
    };
    deviceTargeting?: Array<{
      devices: string[];
      targetUrl: string;
    }>;
  };

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
