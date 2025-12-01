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
@Index(['teamId', 'status'])
export class BioLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  username: string;  // e.g., @johndoe -> lnk.day/johndoe

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
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
  @Index()
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
@Index(['bioLinkId', 'visible'])
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

  @Column({ default: 'link' })
  type: string;

  @Column('jsonb', { default: {} })
  style: {
    backgroundColor?: string;
    textColor?: string;
    icon?: string;
    iconUrl?: string;
    animation?: string;
    featured?: boolean;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: string;
    padding?: string;
    margin?: string;
    shadow?: string;
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
    // 轮播设置
    autoScroll?: boolean;
    scrollInterval?: number;
    showIndicators?: boolean;
    // 倒计时设置
    countdownAction?: 'hide' | 'show_message' | 'redirect';
    countdownMessage?: string;
    countdownRedirectUrl?: string;
    // 订阅设置
    subscribeProvider?: 'mailchimp' | 'convertkit' | 'custom';
    subscribeApiKey?: string;
    subscribeListId?: string;
    subscribeWebhookUrl?: string;
  };

  @Column('jsonb', { nullable: true })
  embed?: {
    type: 'youtube' | 'spotify' | 'soundcloud' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'twitch' | 'bilibili';
    embedId: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    aspectRatio?: string;
  };

  @Column('jsonb', { nullable: true })
  product?: {
    price: number;
    currency: string;
    originalPrice?: number;
    badge?: string;
    inventory?: number;
    paymentUrl?: string;
    variants?: Array<{
      name: string;
      options: string[];
    }>;
    images?: string[];
  };

  @Column('jsonb', { nullable: true })
  carousel?: {
    images: Array<{
      url: string;
      alt?: string;
      link?: string;
      caption?: string;
    }>;
    height?: number;
    transitionType?: 'slide' | 'fade' | 'flip';
  };

  @Column('jsonb', { nullable: true })
  countdown?: {
    targetDate: string;
    timezone?: string;
    showDays?: boolean;
    showHours?: boolean;
    showMinutes?: boolean;
    showSeconds?: boolean;
    labelStyle?: 'full' | 'short' | 'hidden';
  };

  @Column('jsonb', { nullable: true })
  music?: {
    provider: 'spotify' | 'apple_music' | 'soundcloud' | 'custom';
    trackUrl?: string;
    playlistUrl?: string;
    albumUrl?: string;
    artistUrl?: string;
    customAudioUrl?: string;
    showArtwork?: boolean;
    compact?: boolean;
  };

  @Column('jsonb', { nullable: true })
  map?: {
    provider: 'google' | 'mapbox' | 'openstreetmap';
    latitude: number;
    longitude: number;
    zoom?: number;
    markerTitle?: string;
    address?: string;
    height?: number;
    showDirectionsLink?: boolean;
  };

  @Column('jsonb', { nullable: true })
  subscribe?: {
    placeholder?: string;
    buttonText?: string;
    successMessage?: string;
    collectName?: boolean;
    collectPhone?: boolean;
    privacyPolicyUrl?: string;
    doubleOptIn?: boolean;
  };

  @Column('jsonb', { nullable: true })
  nft?: {
    platform: 'opensea' | 'rarible' | 'foundation' | 'custom';
    contractAddress?: string;
    tokenId?: string;
    collectionUrl?: string;
    imageUrl?: string;
    name?: string;
    price?: string;
    currency?: string;
    showPrice?: boolean;
    showOwner?: boolean;
    linkToPlatform?: boolean;
  };

  @Column('jsonb', { nullable: true })
  podcast?: {
    provider: 'spotify' | 'apple_podcasts' | 'google_podcasts' | 'anchor' | 'custom';
    showUrl?: string;
    episodeUrl?: string;
    embedCode?: string;
    showName?: string;
    episodeName?: string;
    artwork?: string;
    showAllEpisodes?: boolean;
    episodeCount?: number;
  };

  @Column('jsonb', { nullable: true })
  text?: {
    content: string;
    format?: 'plain' | 'markdown' | 'html';
    alignment?: 'left' | 'center' | 'right';
    fontSize?: 'small' | 'medium' | 'large';
  };

  @Column('jsonb', { nullable: true })
  image?: {
    url: string;
    alt?: string;
    linkUrl?: string;
    width?: number;
    height?: number;
    objectFit?: 'cover' | 'contain' | 'fill';
  };

  @Column('jsonb', { nullable: true })
  video?: {
    url: string;
    poster?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
  };

  @Column('jsonb', { nullable: true })
  content?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  contactForm?: {
    fields: Array<{
      name: string;
      type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
      label: string;
      required?: boolean;
      options?: string[]; // For select type
    }>;
    submitButtonText?: string;
    successMessage?: string;
    notificationEmail?: string;
    webhookUrl?: string;
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
@Index(['bioLinkId', 'eventType', 'timestamp'])
export class BioLinkClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  bioLinkId: string;

  @Column({ nullable: true })
  @Index()
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

// Subscriber tracking for Bio Link
@Entity('bio_link_subscribers')
@Index(['bioLinkId', 'email'])
@Index(['bioLinkId', 'itemId'])
export class BioLinkSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  bioLinkId: string;

  @Column({ nullable: true })
  @Index()
  itemId?: string;  // Which subscribe block captured this

  @Column()
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'unsubscribed';

  @Column({ nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  unsubscribedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Contact form submissions
@Entity('bio_link_contacts')
@Index(['bioLinkId', 'itemId'])
@Index(['bioLinkId', 'createdAt'])
export class BioLinkContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  bioLinkId: string;

  @Column({ nullable: true })
  @Index()
  itemId?: string;  // Which contact form block received this

  @Column('jsonb')
  formData: Record<string, string>;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ default: 'new' })
  status: 'new' | 'read' | 'replied' | 'archived';

  @Column({ nullable: true })
  repliedAt?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
