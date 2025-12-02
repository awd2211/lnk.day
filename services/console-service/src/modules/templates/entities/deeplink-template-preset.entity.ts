import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type DeepLinkTemplateCategory = 'social' | 'commerce' | 'media' | 'utility' | 'custom';

@Entity('deeplink_template_presets')
export class DeepLinkTemplatePreset {
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
  category: DeepLinkTemplateCategory;

  @Column('jsonb', { nullable: true })
  ios?: {
    bundleId?: string;
    appStoreId?: string;
    customScheme?: string;
    universalLink?: string;
    fallbackUrl?: string;
  };

  @Column('jsonb', { nullable: true })
  android?: {
    packageName?: string;
    playStoreUrl?: string;
    customScheme?: string;
    appLinks?: string[];
    fallbackUrl?: string;
  };

  @Column({ nullable: true })
  fallbackUrl?: string;

  @Column({ default: false })
  enableDeferred: boolean;

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
