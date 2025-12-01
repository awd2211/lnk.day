import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type LinkTemplateCategory = 'marketing' | 'social' | 'email' | 'qr' | 'ecommerce' | 'general';

@Entity('link_template_presets')
export class LinkTemplatePreset {
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

  @Column({ default: 'general' })
  @Index()
  category: LinkTemplateCategory;

  @Column('jsonb', { default: {} })
  defaults: {
    shortCodePrefix?: string;
    shortCodeSuffix?: string;
    redirectType?: '301' | '302' | '307';
    utmParams?: {
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
      term?: string;
    };
    passwordProtected?: boolean;
    expiresInDays?: number;
    tags?: string[];
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
