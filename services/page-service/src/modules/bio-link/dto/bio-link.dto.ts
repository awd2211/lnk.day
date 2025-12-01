import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUrl,
  ValidateNested,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BioLinkStatus,
  ProfileInfo,
  SocialLink,
  SocialPlatform,
  BioTheme,
  BioSettings,
} from '../entities/bio-link.entity';

// Profile DTO
export class ProfileInfoDto implements ProfileInfo {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '🎨 Designer | 📸 Photographer | ☕ Coffee lover' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: ['circle', 'square', 'rounded'], default: 'circle' })
  @IsOptional()
  @IsEnum(['circle', 'square', 'rounded'])
  avatarStyle?: 'circle' | 'square' | 'rounded';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'he/him' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pronouns?: string;
}

// Social Link DTO
export class SocialLinkDto implements SocialLink {
  @ApiProperty({
    enum: [
      'instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin',
      'github', 'discord', 'twitch', 'spotify', 'snapchat', 'pinterest',
      'reddit', 'telegram', 'whatsapp', 'wechat', 'weibo', 'bilibili',
      'douyin', 'xiaohongshu', 'email', 'phone', 'website',
    ],
  })
  @IsString()
  platform: SocialPlatform;

  @ApiProperty({ example: 'https://instagram.com/johndoe' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

// Theme DTO - flexible to accept frontend and backend formats
// Note: Not implementing Partial<BioTheme> to allow flexible string values from frontend
export class BioThemeDto {
  @ApiPropertyOptional({ example: '#ffffff' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  backgroundGradient?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @ApiPropertyOptional({ example: '#1a1a1a' })
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional({ example: '#666666' })
  @IsOptional()
  @IsString()
  secondaryTextColor?: string;

  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({ description: 'Button style: solid, outline, soft, filled, outlined, shadow, glass' })
  @IsOptional()
  @IsString()
  buttonStyle?: string;

  @ApiPropertyOptional({ example: '#000000' })
  @IsOptional()
  @IsString()
  buttonColor?: string;

  @ApiPropertyOptional({ example: '#ffffff' })
  @IsOptional()
  @IsString()
  buttonTextColor?: string;

  @ApiPropertyOptional({ description: 'Button border radius: none, sm, md, lg, full, small, medium, large' })
  @IsOptional()
  @IsString()
  buttonBorderRadius?: string;

  @ApiPropertyOptional({ description: 'Button radius alias' })
  @IsOptional()
  @IsString()
  buttonRadius?: string;

  @ApiPropertyOptional({ description: 'Button animation: none, bounce, pulse, shake' })
  @IsOptional()
  @IsString()
  buttonAnimation?: string;

  @ApiPropertyOptional({ description: 'Layout: standard, compact, spacious' })
  @IsOptional()
  @IsString()
  layout?: string;

  @ApiPropertyOptional({ example: 'midnight' })
  @IsOptional()
  @IsString()
  presetTheme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCSS?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;
}

// Settings DTO
export class BioSettingsDto implements Partial<BioSettings> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideProfileName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideBio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideAvatar?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableAnalytics?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sensitiveContent?: boolean;
}

// SEO DTO
export class BioSeoDto {
  @ApiPropertyOptional({ example: 'John Doe | Link in Bio' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  title?: string;

  @ApiPropertyOptional({ example: 'Check out all my links and social profiles' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  favicon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;
}

// Create Bio Link DTO
export class CreateBioLinkDto {
  @ApiProperty({ example: 'johndoe', description: '用户名，将用于URL路径' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Username must contain only lowercase letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiPropertyOptional({ example: 'John Doe | Links' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ type: ProfileInfoDto })
  @ValidateNested()
  @Type(() => ProfileInfoDto)
  profile: ProfileInfoDto;

  @ApiPropertyOptional({ type: [SocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @ApiPropertyOptional({ type: BioThemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioThemeDto)
  theme?: BioThemeDto;

  @ApiPropertyOptional({ type: BioSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioSettingsDto)
  settings?: BioSettingsDto;

  @ApiPropertyOptional({ type: BioSeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioSeoDto)
  seo?: BioSeoDto;
}

// Update Bio Link DTO
export class UpdateBioLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: ProfileInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileInfoDto)
  profile?: ProfileInfoDto;

  @ApiPropertyOptional({ type: [SocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @ApiPropertyOptional({ type: BioThemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioThemeDto)
  theme?: BioThemeDto;

  @ApiPropertyOptional({ type: BioSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioSettingsDto)
  settings?: BioSettingsDto;

  @ApiPropertyOptional({ type: BioSeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioSeoDto)
  seo?: BioSeoDto;

  @ApiPropertyOptional({ description: 'Bio link blocks/items' })
  @IsOptional()
  @IsArray()
  blocks?: any[];

  @ApiPropertyOptional({ description: 'Tracking pixels configuration' })
  @IsOptional()
  pixels?: any;

  @ApiPropertyOptional({ description: 'A/B testing configuration' })
  @IsOptional()
  abTest?: any;

  @ApiPropertyOptional({ description: 'Guestbook settings' })
  @IsOptional()
  guestbook?: any;

  @ApiPropertyOptional({ description: 'Calendly integration settings' })
  @IsOptional()
  calendly?: any;
}

// Bio Link Item DTOs
export class BioLinkItemStyleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional({ example: 'link' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class BioLinkItemSettingsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsString()
  scheduleStart?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsString()
  scheduleEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;
}

export class BioLinkItemEmbedDto {
  @ApiProperty({ enum: ['youtube', 'spotify', 'soundcloud', 'tiktok', 'instagram', 'twitter'] })
  @IsEnum(['youtube', 'spotify', 'soundcloud', 'tiktok', 'instagram', 'twitter'])
  type: 'youtube' | 'spotify' | 'soundcloud' | 'tiktok' | 'instagram' | 'twitter';

  @ApiProperty({ example: 'dQw4w9WgXcQ' })
  @IsString()
  embedId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoplay?: boolean;
}

export class CreateBioLinkItemDto {
  @ApiProperty({ example: 'Check out my latest video' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=...' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'My latest YouTube video about design tips' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ enum: ['link', 'header', 'embed', 'product', 'collection'], default: 'link' })
  @IsOptional()
  @IsEnum(['link', 'header', 'embed', 'product', 'collection'])
  type?: 'link' | 'header' | 'embed' | 'product' | 'collection';

  @ApiPropertyOptional({ type: BioLinkItemStyleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioLinkItemStyleDto)
  style?: BioLinkItemStyleDto;

  @ApiPropertyOptional({ type: BioLinkItemSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioLinkItemSettingsDto)
  settings?: BioLinkItemSettingsDto;

  @ApiPropertyOptional({ type: BioLinkItemEmbedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BioLinkItemEmbedDto)
  embed?: BioLinkItemEmbedDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class UpdateBioLinkItemDto extends CreateBioLinkItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}

// Response DTOs
export class BioLinkResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  profile: ProfileInfo;

  @ApiProperty()
  socialLinks: SocialLink[];

  @ApiProperty()
  theme: BioTheme;

  @ApiProperty({ enum: BioLinkStatus })
  status: BioLinkStatus;

  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  totalClicks: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  publishedAt?: Date;
}

export class BioLinkAnalyticsDto {
  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  uniqueViews: number;

  @ApiProperty()
  totalClicks: number;

  @ApiProperty()
  topLinks: Array<{
    id: string;
    title: string;
    clicks: number;
    percentage: number;
  }>;

  @ApiProperty()
  viewsByDay: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;

  @ApiProperty()
  topCountries: Array<{
    country: string;
    views: number;
    percentage: number;
  }>;

  @ApiProperty()
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };

  @ApiProperty()
  topReferrers: Array<{
    referrer: string;
    views: number;
  }>;
}
