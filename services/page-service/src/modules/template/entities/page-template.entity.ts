import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TemplateCategory {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  SOCIAL = 'social',
  EVENT = 'event',
  PRODUCT = 'product',
  CREATIVE = 'creative',
}

export enum TemplateType {
  LINK_IN_BIO = 'link_in_bio',
  LANDING = 'landing',
  PORTFOLIO = 'portfolio',
  CONTACT = 'contact',
  MENU = 'menu',
  EVENT = 'event',
}

@Entity('page_templates')
export class PageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TemplateCategory })
  @Index()
  category: TemplateCategory;

  @Column({ type: 'enum', enum: TemplateType })
  @Index()
  type: TemplateType;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  previewUrl: string;

  @Column('jsonb')
  blocks: Array<{
    id: string;
    type: string;
    content: Record<string, any>;
    settings?: Record<string, any>;
    order: number;
  }>;

  @Column('jsonb')
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    buttonStyle: string;
    layout: string;
  };

  @Column('jsonb', { nullable: true })
  seoDefaults: {
    title?: string;
    description?: string;
    keywords?: string[];
  };

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: 0 })
  favoriteCount: number;

  @Column({ nullable: true })
  authorId: string;

  @Column({ nullable: true })
  authorName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('template_favorites')
@Index(['userId', 'templateId'], { unique: true })
export class TemplateFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  templateId: string;

  @CreateDateColumn()
  createdAt: Date;
}
