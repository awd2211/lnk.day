import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Link } from '../../link/entities/link.entity';

export enum PreviewTargetType {
  DEVICE = 'device',
  COUNTRY = 'country',
  LANGUAGE = 'language',
  TIME = 'time',
  REFERRER = 'referrer',
  USER_AGENT = 'user_agent',
  CUSTOM = 'custom',
}

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  ALL = 'all',
}

@Entity('preview_configs')
@Index(['linkId', 'isActive'])
@Index(['targetType', 'targetValue'])
export class PreviewConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'link_id' })
  linkId: string;

  @ManyToOne(() => Link, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'link_id' })
  link: Link;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PreviewTargetType,
    default: PreviewTargetType.DEVICE,
  })
  targetType: PreviewTargetType;

  @Column({ name: 'target_value', type: 'varchar', length: 255 })
  targetValue: string;

  // OG Meta 覆盖
  @Column({ name: 'og_title', type: 'varchar', length: 255, nullable: true })
  ogTitle: string;

  @Column({ name: 'og_description', type: 'text', nullable: true })
  ogDescription: string;

  @Column({ name: 'og_image', type: 'varchar', length: 1000, nullable: true })
  ogImage: string;

  @Column({ name: 'og_image_width', type: 'int', nullable: true })
  ogImageWidth: number;

  @Column({ name: 'og_image_height', type: 'int', nullable: true })
  ogImageHeight: number;

  @Column({ name: 'og_type', type: 'varchar', length: 50, default: 'website' })
  ogType: string;

  @Column({ name: 'og_site_name', type: 'varchar', length: 255, nullable: true })
  ogSiteName: string;

  // Twitter Card 覆盖
  @Column({
    name: 'twitter_card',
    type: 'varchar',
    length: 50,
    default: 'summary_large_image',
  })
  twitterCard: string;

  @Column({
    name: 'twitter_title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  twitterTitle: string;

  @Column({ name: 'twitter_description', type: 'text', nullable: true })
  twitterDescription: string;

  @Column({
    name: 'twitter_image',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  twitterImage: string;

  @Column({
    name: 'twitter_creator',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  twitterCreator: string;

  // 自定义 HTML 元数据
  @Column({ name: 'custom_meta', type: 'jsonb', nullable: true })
  customMeta: Record<string, string>;

  // 动态内容模板
  @Column({ name: 'dynamic_template', type: 'jsonb', nullable: true })
  dynamicTemplate: {
    titleTemplate?: string;
    descriptionTemplate?: string;
    variables?: Record<string, any>;
  };

  // 条件规则
  @Column({ type: 'jsonb', nullable: true })
  conditions: {
    operator: 'and' | 'or';
    rules: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
      value: string;
    }>;
  };

  // A/B 测试配置
  @Column({ name: 'ab_test_enabled', type: 'boolean', default: false })
  abTestEnabled: boolean;

  @Column({ name: 'ab_test_weight', type: 'int', default: 100 })
  abTestWeight: number;

  @Column({ name: 'ab_test_group', type: 'varchar', length: 50, nullable: true })
  abTestGroup: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate: Date;

  // 统计
  @Column({ name: 'impressions', type: 'int', default: 0 })
  impressions: number;

  @Column({ name: 'clicks', type: 'int', default: 0 })
  clicks: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('preview_templates')
@Index(['teamId', 'isActive'])
export class PreviewTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  teamId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  // 默认 OG 设置
  @Column({ name: 'og_title_template', type: 'text', nullable: true })
  ogTitleTemplate: string;

  @Column({ name: 'og_description_template', type: 'text', nullable: true })
  ogDescriptionTemplate: string;

  @Column({ name: 'og_image_template', type: 'varchar', length: 1000, nullable: true })
  ogImageTemplate: string;

  @Column({ name: 'og_type', type: 'varchar', length: 50, default: 'website' })
  ogType: string;

  // Twitter 设置
  @Column({ name: 'twitter_card', type: 'varchar', length: 50, default: 'summary_large_image' })
  twitterCard: string;

  // 品牌设置
  @Column({ name: 'brand_color', type: 'varchar', length: 20, nullable: true })
  brandColor: string;

  @Column({ name: 'brand_logo', type: 'varchar', length: 1000, nullable: true })
  brandLogo: string;

  // 动态变量定义
  @Column({ type: 'jsonb', nullable: true })
  variables: Array<{
    name: string;
    type: 'text' | 'image' | 'url' | 'date' | 'number';
    defaultValue?: string;
    description?: string;
  }>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('preview_analytics')
@Index(['linkId', 'previewConfigId', 'viewedAt'])
export class PreviewAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'link_id' })
  linkId: string;

  @Column({ name: 'preview_config_id', nullable: true })
  previewConfigId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  platform: string; // facebook, twitter, linkedin, slack, etc.

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  device: string;

  @Column({ name: 'is_bot', type: 'boolean', default: true })
  isBot: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referrer: string;

  @Column({ name: 'ab_test_group', type: 'varchar', length: 50, nullable: true })
  abTestGroup: string;

  @Column({ name: 'viewed_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  viewedAt: Date;
}
