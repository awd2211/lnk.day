import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

export enum BioLinkStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface ProfileInfo {
  name: string;
  bio?: string;
  avatarUrl?: string;
  avatarStyle?: 'circle' | 'square' | 'rounded';
  verified?: boolean;
  location?: string;
  pronouns?: string;
}

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  username?: string;
  visible?: boolean;
}

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'github'
  | 'discord'
  | 'twitch'
  | 'spotify'
  | 'snapchat'
  | 'pinterest'
  | 'reddit'
  | 'telegram'
  | 'whatsapp'
  | 'wechat'
  | 'weibo'
  | 'bilibili'
  | 'douyin'
  | 'xiaohongshu'
  | 'email'
  | 'phone'
  | 'website';

export interface BioTheme {
  // Background
  backgroundColor?: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number;
  };
  backgroundImage?: string;
  backgroundBlur?: number;
  backgroundOverlay?: string;

  // Text
  textColor?: string;
  secondaryTextColor?: string;
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';

  // Buttons
  buttonStyle?: 'filled' | 'outlined' | 'soft' | 'shadow' | 'glass';
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonAnimation?: 'none' | 'bounce' | 'pulse' | 'shake';

  // Layout
  layout?: 'standard' | 'compact' | 'spacious';
  avatarSize?: 'small' | 'medium' | 'large';
  showSocialIconsAtTop?: boolean;
  socialIconStyle?: 'filled' | 'outlined' | 'minimal';

  // Presets
  presetTheme?: string;
}

export interface BioSettings {
  // Display
  hideProfileName?: boolean;
  hideBio?: boolean;
  hideAvatar?: boolean;
  showVerifiedBadge?: boolean;

  // Privacy
  password?: string;
  isPrivate?: boolean;
  hideFromSearch?: boolean;

  // Analytics
  enableAnalytics?: boolean;
  googleAnalyticsId?: string;
  facebookPixelId?: string;

  // Custom code
  customCss?: string;
  customHeadHtml?: string;

  // Expiry
  expiresAt?: string;

  // Sensitive content warning
  sensitiveContent?: boolean;
  sensitiveWarningMessage?: string;
}

@Entity('bio_links')
export class BioLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  username: string;  // e.g., @johndoe -> lnk.day/johndoe

  @Column()
  teamId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  title?: string;  // Page title

  @Column('jsonb')
  profile: ProfileInfo;

  @Column('jsonb', { default: [] })
  socialLinks: SocialLink[];

  @Column('jsonb', { default: {} })
  theme: BioTheme;

  @Column('jsonb', { default: {} })
  settings: BioSettings;

  @Column('jsonb', { default: {} })
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    favicon?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };

  @Column({
    type: 'enum',
    enum: BioLinkStatus,
    default: BioLinkStatus.DRAFT,
  })
  status: BioLinkStatus;

  @Column({ default: 0 })
  totalViews: number;

  @Column({ default: 0 })
  uniqueViews: number;

  @Column({ default: 0 })
  totalClicks: number;

  @Column({ nullable: true })
  publishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Individual links within a bio page
@Entity('bio_link_items')
export class BioLinkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  bioLinkId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['link', 'header', 'embed', 'product', 'collection'],
    default: 'link',
  })
  type: 'link' | 'header' | 'embed' | 'product' | 'collection';

  @Column('jsonb', { default: {} })
  style: {
    backgroundColor?: string;
    textColor?: string;
    icon?: string;
    iconUrl?: string;
    animation?: string;
    featured?: boolean;
  };

  @Column('jsonb', { default: {} })
  settings: {
    openInNewTab?: boolean;
    scheduleStart?: string;
    scheduleEnd?: string;
    pinned?: boolean;
    highlighted?: boolean;
    password?: string;
    geoRestrictions?: string[];  // Country codes
    ageGate?: boolean;
  };

  @Column('jsonb', { nullable: true })
  embed?: {
    type: 'youtube' | 'spotify' | 'soundcloud' | 'tiktok' | 'instagram' | 'twitter';
    embedId: string;
    autoplay?: boolean;
  };

  @Column('jsonb', { nullable: true })
  product?: {
    price: number;
    currency: string;
    originalPrice?: number;
    badge?: string;
    inventory?: number;
    paymentUrl?: string;
  };

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  visible: boolean;

  @Column({ default: 0 })
  clicks: number;

  @Column({ nullable: true })
  lastClickedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Link click tracking
@Entity('bio_link_clicks')
@Index(['bioLinkId', 'timestamp'])
export class BioLinkClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  bioLinkId: string;

  @Column({ nullable: true })
  itemId?: string;  // Which link was clicked (null for page view)

  @Column({ default: 'page_view' })
  eventType: 'page_view' | 'link_click' | 'social_click';

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  referer?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  deviceType?: string;

  @Column({ nullable: true })
  browser?: string;

  @Column({ nullable: true })
  os?: string;

  @Column()
  timestamp: Date;
}
