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

export type PageBlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'links'
  | 'social'
  | 'form'
  | 'video'
  | 'divider'
  | 'html'
  // 新增组件类型
  | 'carousel'
  | 'countdown'
  | 'music'
  | 'map'
  | 'subscribe'
  | 'nft'
  | 'podcast'
  | 'product';

export interface PageBlock {
  id: string;
  type: PageBlockType;
  content: Record<string, any>;
  style?: Record<string, any>;
  order: number;
}

// 组件内容类型定义
export interface CarouselContent {
  images: Array<{ url: string; alt?: string; link?: string }>;
  autoPlay?: boolean;
  interval?: number; // 毫秒
  showDots?: boolean;
  showArrows?: boolean;
}

export interface CountdownContent {
  targetDate: string; // ISO 日期
  title?: string;
  expiredMessage?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
}

export interface MusicContent {
  platform: 'spotify' | 'apple' | 'soundcloud' | 'custom';
  embedUrl?: string;
  trackId?: string;
  playlistId?: string;
  showArtwork?: boolean;
  compact?: boolean;
}

export interface MapContent {
  platform: 'google' | 'mapbox' | 'openstreetmap';
  latitude: number;
  longitude: number;
  zoom?: number;
  address?: string;
  marker?: boolean;
  height?: number;
}

export interface SubscribeContent {
  provider: 'mailchimp' | 'convertkit' | 'klaviyo' | 'custom';
  listId?: string;
  webhookUrl?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
  collectName?: boolean;
  collectPhone?: boolean;
}

export interface NftContent {
  platform: 'opensea' | 'rarible' | 'foundation' | 'custom';
  contractAddress?: string;
  tokenId?: string;
  collectionSlug?: string;
  showPrice?: boolean;
  showOwner?: boolean;
  displayMode?: 'single' | 'collection' | 'gallery';
}

export interface PodcastContent {
  platform: 'spotify' | 'apple' | 'google' | 'anchor' | 'custom';
  showId?: string;
  episodeId?: string;
  embedUrl?: string;
  showLatest?: boolean;
  episodeCount?: number;
}

export interface ProductContent {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  buyUrl?: string;
  originalPrice?: number; // 原价，用于显示折扣
  badge?: string; // "NEW", "SALE", etc.
  variants?: Array<{ name: string; price?: number }>;
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

// Guestbook/Comments settings
export interface GuestbookSettings {
  enabled: boolean;
  requireApproval: boolean;
  requireEmail: boolean;
  allowAnonymous: boolean;
  allowReplies: boolean;
  maxLength: number;
  placeholder?: string;
  title?: string;
  emptyMessage?: string;
  successMessage?: string;
  enableLikes: boolean;
  enableEmojis: boolean;
  sortOrder: 'newest' | 'oldest' | 'popular';
  displayCount: number;
  showAvatars: boolean;
  enableNotifications: boolean;
  notificationEmail?: string;
  blockedWords?: string[];
  blockedIps?: string[];
}

// Calendly integration settings
export interface CalendlySettings {
  enabled: boolean;
  url: string;  // Calendly scheduling link
  embedType: 'inline' | 'popup' | 'button';
  buttonText?: string;
  buttonColor?: string;
  hideDetails?: boolean;
  hideEventType?: boolean;
  hideLandingPage?: boolean;
  hideCookieBanner?: boolean;
  height?: number;  // For inline embed
}

// A/B Testing types
export interface ABTestVariant {
  id: string;
  name: string;
  description?: string;
  trafficPercentage: number;  // 0-100
  theme?: Partial<PageTheme>;
  blocks?: PageBlock[];
  isControl?: boolean;  // Original version
}

export interface ABTestConfig {
  isEnabled: boolean;
  name?: string;
  variants: ABTestVariant[];
  startDate?: string;
  endDate?: string;
  winnerVariantId?: string;  // Set when test concludes
  metrics: {
    clicks?: boolean;
    conversions?: boolean;
    timeOnPage?: boolean;
    bounceRate?: boolean;
  };
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
      tiktokPixelId?: string;
      linkedinInsightTag?: string;
      pinterestTag?: string;
      snapchatPixelId?: string;
    };
    abTest?: ABTestConfig;
    guestbook?: GuestbookSettings;
    calendly?: CalendlySettings;
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
