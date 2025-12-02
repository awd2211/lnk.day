import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * SEO Template - 保存 SEO 配置供复用
 */
@Entity('seo_templates')
@Index(['teamId', 'isFavorite'])
@Index(['teamId', 'category'])
@Index(['teamId', 'createdAt'])
export class SeoTemplate {
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

  // ========== 分类 ==========
  @Column({ default: 'general' })
  @Index()
  category: 'general' | 'landing_page' | 'bio_link' | 'product' | 'article' | 'profile';

  // ========== 基础 Meta ==========
  @Column({ nullable: true })
  metaTitleTemplate?: string; // 支持变量如 {{title}} - {{siteName}}

  @Column({ nullable: true })
  metaDescription?: string;

  @Column('simple-array', { nullable: true })
  metaKeywords?: string[];

  @Column({ nullable: true })
  metaAuthor?: string;

  @Column({ nullable: true })
  metaRobots?: string; // 'index, follow' 等

  @Column({ nullable: true })
  metaLanguage?: string;

  // ========== Open Graph ==========
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

  // ========== Twitter Card ==========
  @Column({ nullable: true })
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';

  @Column({ nullable: true })
  twitterSite?: string; // @username

  @Column({ nullable: true })
  twitterCreator?: string;

  @Column({ nullable: true })
  twitterTitleTemplate?: string;

  @Column({ nullable: true })
  twitterDescription?: string;

  @Column({ nullable: true })
  twitterImage?: string;

  // ========== 其他设置 ==========
  @Column({ nullable: true })
  favicon?: string;

  @Column({ nullable: true })
  canonicalUrlPattern?: string; // URL 模式

  // 自定义 Meta 标签
  @Column('jsonb', { nullable: true })
  customMeta?: Array<{
    name: string;
    content: string;
  }>;

  // JSON-LD Schema 配置
  @Column('jsonb', { nullable: true })
  schemaConfig?: {
    type?: string;
    additionalProperties?: Record<string, any>;
  };

  // ========== 模板设置 ==========
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
