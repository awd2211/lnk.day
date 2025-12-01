import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type BioLinkTemplateCategory = 'theme' | 'layout' | 'industry';
export type LayoutType = 'single_column' | 'two_column' | 'card_grid' | 'masonry';
export type IndustryType =
  | 'influencer'
  | 'business'
  | 'restaurant'
  | 'education'
  | 'ecommerce'
  | 'music'
  | 'fitness'
  | 'portfolio'
  | 'nonprofit'
  | 'healthcare'
  | 'other';
export type ButtonStyle = 'filled' | 'outlined' | 'soft' | 'glass';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';

@Entity('bio_link_template_presets')
export class BioLinkTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'theme' })
  @Index()
  category: BioLinkTemplateCategory;

  @Column({ nullable: true })
  layoutType?: LayoutType;

  @Column({ nullable: true })
  @Index()
  industry?: IndustryType;

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ nullable: true })
  previewUrl?: string;

  @Column('jsonb', { default: {} })
  theme: {
    backgroundColor?: string;
    backgroundGradient?: {
      type: 'linear' | 'radial';
      colors: string[];
      angle?: number;
    };
    backgroundImage?: string;
    textColor?: string;
    linkColor?: string;
    fontFamily?: string;
    buttonStyle?: ButtonStyle;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonBorderRadius?: BorderRadius;
    avatarBorderColor?: string;
    cardBackground?: string;
  };

  @Column('jsonb', { nullable: true })
  defaultBlocks?: Array<{
    type: string;
    title?: string;
    settings?: Record<string, any>;
    order: number;
  }>;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ default: false })
  isPremium: boolean;

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
