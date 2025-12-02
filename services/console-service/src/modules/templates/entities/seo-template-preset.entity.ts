import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SeoTemplateCategory = 'general' | 'landing_page' | 'bio_link' | 'product' | 'article' | 'profile';

@Entity('seo_template_presets')
export class SeoTemplatePreset {
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
  category: SeoTemplateCategory;

  // Meta tags
  @Column({ nullable: true })
  metaTitleTemplate?: string;

  @Column({ nullable: true })
  metaDescription?: string;

  @Column('simple-array', { nullable: true })
  metaKeywords?: string[];

  @Column({ nullable: true })
  metaAuthor?: string;

  @Column({ nullable: true })
  metaRobots?: string;

  @Column({ nullable: true })
  metaLanguage?: string;

  // Open Graph
  @Column({ nullable: true })
  ogTitleTemplate?: string;

  @Column({ nullable: true })
  ogDescription?: string;

  @Column({ nullable: true })
  ogType?: 'website' | 'article' | 'profile' | 'product';

  @Column({ nullable: true })
  ogImage?: string;

  @Column({ nullable: true })
  ogSiteName?: string;

  @Column({ nullable: true })
  ogLocale?: string;

  // Twitter Card
  @Column({ nullable: true })
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';

  @Column({ nullable: true })
  twitterSite?: string;

  @Column({ nullable: true })
  twitterCreator?: string;

  @Column({ nullable: true })
  twitterTitleTemplate?: string;

  @Column({ nullable: true })
  twitterDescription?: string;

  @Column({ nullable: true })
  twitterImage?: string;

  // Other
  @Column({ nullable: true })
  favicon?: string;

  @Column({ nullable: true })
  canonicalUrlPattern?: string;

  @Column('jsonb', { nullable: true })
  customMeta?: Array<{ name: string; content: string }>;

  @Column('jsonb', { nullable: true })
  schemaConfig?: { type?: string; additionalProperties?: Record<string, any> };

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
