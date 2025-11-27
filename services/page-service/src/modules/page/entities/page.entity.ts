import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum PageType {
  LINK_IN_BIO = 'link_in_bio',
  LANDING = 'landing',
  FORM = 'form',
  CUSTOM = 'custom',
}

export interface PageBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'links' | 'social' | 'form' | 'video' | 'divider' | 'html';
  content: Record<string, any>;
  style?: Record<string, any>;
  order: number;
}

export interface PageTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  buttonStyle?: 'filled' | 'outlined' | 'minimal';
}

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column()
  teamId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: PageType, default: PageType.LINK_IN_BIO })
  type: PageType;

  @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  @Column({ nullable: true })
  templateId?: string;

  @Column('jsonb', { default: [] })
  blocks: PageBlock[];

  @Column('jsonb', { default: {} })
  theme: PageTheme;

  @Column('jsonb', { default: {} })
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    favicon?: string;
    noIndex?: boolean;
  };

  @Column('jsonb', { default: {} })
  settings: {
    customDomain?: string;
    password?: string;
    expiresAt?: string;
    customCss?: string;
    customJs?: string;
    analytics?: {
      googleAnalyticsId?: string;
      facebookPixelId?: string;
    };
  };

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  uniqueViews: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  publishedAt?: Date;
}
