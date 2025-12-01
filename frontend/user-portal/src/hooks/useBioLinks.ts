import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkApi } from '@/lib/api';

export type BlockType =
  | 'link'
  | 'header'
  | 'embed'
  | 'product'
  | 'collection'
  | 'carousel'
  | 'countdown'
  | 'music'
  | 'map'
  | 'subscribe'
  | 'nft'
  | 'podcast'
  | 'text'
  | 'divider'
  | 'image'
  | 'video'
  | 'contact_form'
  | 'social'
  | 'email'
  | 'contact'
  | 'spotify'
  | 'youtube';

// ========== Block-specific content types ==========

export interface CarouselContent {
  images: Array<{
    url: string;
    alt?: string;
    link?: string;
    caption?: string;
  }>;
  height?: number;
  transitionType?: 'slide' | 'fade' | 'flip';
}

export interface CountdownContent {
  targetDate: string;
  timezone?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  labelStyle?: 'full' | 'short' | 'hidden';
}

export interface MusicContent {
  provider: 'spotify' | 'apple_music' | 'soundcloud' | 'custom';
  trackUrl?: string;
  playlistUrl?: string;
  albumUrl?: string;
  artistUrl?: string;
  customAudioUrl?: string;
  showArtwork?: boolean;
  compact?: boolean;
}

export interface MapContent {
  provider: 'google' | 'mapbox' | 'openstreetmap';
  latitude: number;
  longitude: number;
  zoom?: number;
  markerTitle?: string;
  address?: string;
  height?: number;
  showDirectionsLink?: boolean;
}

export interface SubscribeContent {
  placeholder?: string;
  buttonText?: string;
  successMessage?: string;
  collectName?: boolean;
  collectPhone?: boolean;
  privacyPolicyUrl?: string;
  provider?: 'mailchimp' | 'convertkit' | 'custom';
}

export interface NftContent {
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
}

export interface PodcastContent {
  provider: 'spotify' | 'apple_podcasts' | 'google_podcasts' | 'anchor' | 'custom';
  showUrl?: string;
  episodeUrl?: string;
  embedCode?: string;
  showName?: string;
  episodeName?: string;
  artwork?: string;
  showAllEpisodes?: boolean;
  episodeCount?: number;
}

export interface ProductContent {
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
}

export interface EmbedContent {
  type: 'youtube' | 'spotify' | 'soundcloud' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'twitch' | 'bilibili';
  embedId: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: string;
}

export interface TextContent {
  content: string;
  format?: 'plain' | 'markdown' | 'html';
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface ImageContent {
  url: string;
  alt?: string;
  linkUrl?: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface VideoContent {
  url: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export interface ContactFormContent {
  fields: Array<{
    name: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
    label: string;
    required?: boolean;
    options?: string[];
  }>;
  submitButtonText?: string;
  successMessage?: string;
  notificationEmail?: string;
  webhookUrl?: string;
}

export interface BlockStyle {
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
}

export interface BlockSettings {
  openInNewTab?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
  pinned?: boolean;
  highlighted?: boolean;
  password?: string;
  geoRestrictions?: string[];
  ageGate?: boolean;
  autoScroll?: boolean;
  scrollInterval?: number;
  showIndicators?: boolean;
  countdownAction?: 'hide' | 'show_message' | 'redirect';
  countdownMessage?: string;
  countdownRedirectUrl?: string;
}

export interface BioLinkBlock {
  id: string;
  type: BlockType;
  title?: string;
  url?: string;
  description?: string;
  thumbnailUrl?: string;
  style?: BlockStyle;
  settings?: BlockSettings;
  isVisible: boolean;
  sortOrder: number;
  clicks?: number;
  // Generic content for flexible block types
  content?: Record<string, any>;
  // Type-specific content
  embed?: EmbedContent;
  product?: ProductContent;
  carousel?: CarouselContent;
  countdown?: CountdownContent;
  music?: MusicContent;
  map?: MapContent;
  subscribe?: SubscribeContent;
  nft?: NftContent;
  podcast?: PodcastContent;
  text?: TextContent;
  image?: ImageContent;
  video?: VideoContent;
  contactForm?: ContactFormContent;
}

export interface BioLinkTheme {
  id?: string;
  name?: string;
  backgroundColor: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  textColor: string;
  buttonStyle: 'solid' | 'outline' | 'soft';
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontFamily: string;
  customCSS?: string;
}

export interface BioLinkPixelSettings {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  tiktokPixelId?: string;
  linkedinInsightTag?: string;
  pinterestTag?: string;
  snapchatPixelId?: string;
}

// A/B Testing types
export interface ABTestVariant {
  id: string;
  name: string;
  description?: string;
  trafficPercentage: number;
  theme?: Partial<BioLinkTheme>;
  blocks?: BioLinkBlock[];
  isControl?: boolean;
}

export interface ABTestConfig {
  isEnabled: boolean;
  name?: string;
  variants: ABTestVariant[];
  startDate?: string;
  endDate?: string;
  winnerVariantId?: string;
  metrics: {
    clicks?: boolean;
    conversions?: boolean;
    timeOnPage?: boolean;
    bounceRate?: boolean;
  };
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
  url: string;
  embedType: 'inline' | 'popup' | 'button';
  buttonText?: string;
  buttonColor?: string;
  hideDetails?: boolean;
  hideEventType?: boolean;
  hideLandingPage?: boolean;
  hideCookieBanner?: boolean;
  height?: number;
}

export interface BioLink {
  id: string;
  username: string;
  title: string;
  description?: string;
  avatarUrl?: string;
  isPublished: boolean;
  blocks: BioLinkBlock[];
  theme: BioLinkTheme;
  seo?: {
    title?: string;
    description?: string;
    image?: string;
  };
  analytics?: {
    views: number;
    clicks: number;
  };
  pixels?: BioLinkPixelSettings;
  abTest?: ABTestConfig;
  guestbook?: GuestbookSettings;
  calendly?: CalendlySettings;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBioLinkData {
  username: string;
  title?: string;
  profile: {
    name: string;
    bio?: string;
    avatarUrl?: string;
  };
}

export interface UpdateBioLinkData {
  slug?: string;
  title?: string;
  description?: string;
  avatarUrl?: string;
  isPublished?: boolean;
  blocks?: BioLinkBlock[];
  theme?: BioLinkTheme;
  seo?: {
    title?: string;
    description?: string;
    image?: string;
  };
  pixels?: BioLinkPixelSettings;
  abTest?: ABTestConfig;
  guestbook?: GuestbookSettings;
  calendly?: CalendlySettings;
}

export interface BioLinkQueryParams {
  page?: number;
  limit?: number;
  status?: 'draft' | 'published';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'totalViews' | 'totalClicks';
  sortOrder?: 'ASC' | 'DESC';
}

// Query: Get all bio links with pagination and sorting
export function useBioLinks(params?: BioLinkQueryParams) {
  return useQuery({
    queryKey: ['bio-links', params],
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      if (params?.page) urlParams.append('page', String(params.page));
      if (params?.limit) urlParams.append('limit', String(params.limit));
      if (params?.status) urlParams.append('status', params.status);
      if (params?.search) urlParams.append('search', params.search);
      if (params?.sortBy) urlParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) urlParams.append('sortOrder', params.sortOrder);
      const { data } = await linkApi.get(`/api/v1/bio-links?${urlParams}`);
      // Handle both array format and { items, total } format
      if (Array.isArray(data)) {
        const items = data.map(transformBackendBioLink);
        return { items, total: items.length, page: 1, limit: items.length };
      }
      const items = (data.items || []).map(transformBackendBioLink);
      return { items, total: data.total || 0, page: data.page || 1, limit: data.limit || 20 };
    },
  });
}

// Helper to transform backend BioLinkItem to frontend BioLinkBlock
function transformBackendBlock(item: any): BioLinkBlock {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    url: item.url,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    style: item.style,
    settings: item.settings,
    isVisible: item.visible ?? true,
    sortOrder: item.order ?? 0,
    clicks: item.clicks,
    content: item.content,
    embed: item.embed,
    product: item.product,
    carousel: item.carousel,
    countdown: item.countdown,
    music: item.music,
    map: item.map,
    subscribe: item.subscribe,
    nft: item.nft,
    podcast: item.podcast,
    text: item.text,
    image: item.image,
    video: item.video,
    contactForm: item.contactForm,
  };
}

// Helper to transform backend BioLink response to frontend BioLink
function transformBackendBioLink(data: any): BioLink {
  const blocks = (data.blocks || []).map(transformBackendBlock);
  return {
    id: data.id,
    username: data.username,
    title: data.title || data.profile?.name || '',
    description: data.profile?.bio,
    avatarUrl: data.profile?.avatarUrl,
    isPublished: data.status === 'published',
    blocks,
    theme: {
      backgroundColor: data.theme?.backgroundColor || '#ffffff',
      backgroundGradient: data.theme?.backgroundGradient
        ? `linear-gradient(${data.theme.backgroundGradient.angle || 135}deg, ${data.theme.backgroundGradient.colors?.join(', ') || '#667eea, #764ba2'})`
        : undefined,
      backgroundImage: data.theme?.backgroundImage,
      textColor: data.theme?.textColor || '#1f2937',
      buttonStyle: data.theme?.buttonStyle === 'filled' ? 'solid' : (data.theme?.buttonStyle || 'solid'),
      buttonColor: data.theme?.buttonColor || '#1f2937',
      buttonTextColor: data.theme?.buttonTextColor || '#ffffff',
      buttonRadius: mapButtonRadius(data.theme?.buttonBorderRadius),
      fontFamily: data.theme?.fontFamily || 'Inter',
      customCSS: data.settings?.customCss,
    },
    seo: data.seo,
    analytics: data.analytics || {
      views: data.totalViews || 0,
      clicks: data.totalClicks || 0,
    },
    teamId: data.teamId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// Map backend button radius to frontend format
function mapButtonRadius(radius?: string): 'none' | 'sm' | 'md' | 'lg' | 'full' {
  switch (radius) {
    case 'none': return 'none';
    case 'small': return 'sm';
    case 'medium': return 'md';
    case 'large': return 'lg';
    case 'full': return 'full';
    default: return 'lg';
  }
}

// Query: Get single bio link
export function useBioLink(id: string | null) {
  return useQuery({
    queryKey: ['bio-links', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await linkApi.get(`/api/v1/bio-links/${id}`);
      return transformBackendBioLink(data);
    },
    enabled: !!id,
  });
}

// Query: Get bio link by slug (for preview)
export function useBioLinkBySlug(slug: string | null) {
  return useQuery({
    queryKey: ['bio-links', 'slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await linkApi.get(`/api/v1/bio-links/slug/${slug}`);
      return data as BioLink;
    },
    enabled: !!slug,
  });
}

// Query: Get available themes
export function useBioLinkThemes() {
  return useQuery({
    queryKey: ['bio-links', 'themes'],
    queryFn: async () => {
      const { data } = await linkApi.get('/api/v1/bio-links/themes');
      return data as BioLinkTheme[];
    },
  });
}

// Mutation: Create bio link
export function useCreateBioLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBioLinkData) => {
      const response = await linkApi.post('/api/v1/bio-links', data);
      return response.data as BioLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-links'] });
    },
  });
}

// Mutation: Update bio link
export function useUpdateBioLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBioLinkData }) => {
      const response = await linkApi.put(`/api/v1/bio-links/${id}`, data);
      return response.data as BioLink;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['bio-links'] });
      queryClient.invalidateQueries({ queryKey: ['bio-links', id] });
    },
  });
}

// Mutation: Delete bio link
export function useDeleteBioLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await linkApi.delete(`/api/v1/bio-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-links'] });
    },
  });
}

// Mutation: Publish/Unpublish bio link
export function useToggleBioLinkPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await linkApi.post(`/api/v1/bio-links/${id}/toggle-publish`);
      return response.data as BioLink;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['bio-links'] });
      queryClient.invalidateQueries({ queryKey: ['bio-links', id] });
    },
  });
}

// Block type labels
export const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; icon: string; description: string; category: string }> = {
  // 基础块
  link: { label: '链接', icon: 'link', description: '添加一个可点击的链接按钮', category: 'basic' },
  header: { label: '标题', icon: 'heading', description: '添加大标题文字', category: 'basic' },
  text: { label: '文本', icon: 'type', description: '添加描述性文本', category: 'basic' },
  divider: { label: '分隔线', icon: 'minus', description: '添加视觉分隔', category: 'basic' },

  // 媒体块
  image: { label: '图片', icon: 'image', description: '添加图片', category: 'media' },
  video: { label: '视频', icon: 'video', description: '嵌入视频', category: 'media' },
  carousel: { label: '图片轮播', icon: 'image-plus', description: '添加多图轮播展示', category: 'media' },
  embed: { label: '嵌入内容', icon: 'code', description: '嵌入 YouTube/Spotify 等第三方内容', category: 'media' },

  // 音乐和播客
  music: { label: '音乐', icon: 'music', description: '添加音乐播放器', category: 'audio' },
  podcast: { label: '播客', icon: 'mic', description: '嵌入播客节目', category: 'audio' },

  // 电商块
  product: { label: '产品', icon: 'shopping-bag', description: '展示产品信息和价格', category: 'commerce' },
  collection: { label: '产品集合', icon: 'grid', description: '展示多个产品', category: 'commerce' },
  nft: { label: 'NFT', icon: 'hexagon', description: '展示 NFT 作品', category: 'commerce' },

  // 互动块
  countdown: { label: '倒计时', icon: 'clock', description: '添加活动倒计时', category: 'interactive' },
  subscribe: { label: '邮件订阅', icon: 'mail', description: '添加邮件订阅表单', category: 'interactive' },
  contact_form: { label: '联系表单', icon: 'message-square', description: '添加联系表单', category: 'interactive' },
  map: { label: '地图', icon: 'map-pin', description: '嵌入地图位置', category: 'interactive' },

  // 社交和联系
  social: { label: '社交链接', icon: 'share-2', description: '添加社交媒体链接', category: 'basic' },
  email: { label: '邮箱', icon: 'at-sign', description: '添加邮箱链接', category: 'basic' },
  contact: { label: '联系方式', icon: 'phone', description: '添加联系方式', category: 'basic' },
  spotify: { label: 'Spotify', icon: 'music', description: '嵌入 Spotify 内容', category: 'audio' },
  youtube: { label: 'YouTube', icon: 'youtube', description: '嵌入 YouTube 视频', category: 'media' },
};

// Block categories
export const BLOCK_CATEGORIES = [
  { id: 'basic', label: '基础', description: '链接、文本等基础内容' },
  { id: 'media', label: '媒体', description: '图片、视频等媒体内容' },
  { id: 'audio', label: '音频', description: '音乐、播客等音频内容' },
  { id: 'commerce', label: '电商', description: '产品、NFT 等商业内容' },
  { id: 'interactive', label: '互动', description: '表单、倒计时等互动元素' },
] as const;

// Get blocks by category
export function getBlocksByCategory(category: string): BlockType[] {
  return (Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).filter(
    (key) => BLOCK_TYPE_LABELS[key].category === category,
  );
}

// Create default block content
export function createDefaultBlockContent(type: BlockType): Partial<BioLinkBlock> {
  const baseBlock = {
    type,
    title: '',
    isVisible: true,
    sortOrder: 0,
  };

  switch (type) {
    case 'carousel':
      return { ...baseBlock, carousel: { images: [], transitionType: 'slide' } };
    case 'countdown':
      return {
        ...baseBlock,
        countdown: {
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          showDays: true,
          showHours: true,
          showMinutes: true,
          showSeconds: true,
          labelStyle: 'short',
        },
      };
    case 'music':
      return { ...baseBlock, music: { provider: 'spotify', showArtwork: true } };
    case 'map':
      return { ...baseBlock, map: { provider: 'google', latitude: 0, longitude: 0, zoom: 14 } };
    case 'subscribe':
      return {
        ...baseBlock,
        subscribe: {
          buttonText: '订阅',
          placeholder: '输入邮箱地址',
          successMessage: '订阅成功！',
        },
      };
    case 'nft':
      return { ...baseBlock, nft: { platform: 'opensea', showPrice: true } };
    case 'podcast':
      return { ...baseBlock, podcast: { provider: 'spotify', showAllEpisodes: false } };
    case 'product':
      return { ...baseBlock, product: { price: 0, currency: 'CNY' } };
    case 'embed':
      return { ...baseBlock, embed: { type: 'youtube', embedId: '' } };
    case 'text':
      return { ...baseBlock, text: { content: '', format: 'plain', alignment: 'left' } };
    case 'image':
      return { ...baseBlock, image: { url: '', objectFit: 'cover' } };
    case 'video':
      return { ...baseBlock, video: { url: '', controls: true } };
    case 'contact_form':
      return {
        ...baseBlock,
        contactForm: {
          fields: [
            { name: 'name', type: 'text', label: '姓名', required: true },
            { name: 'email', type: 'email', label: '邮箱', required: true },
            { name: 'message', type: 'textarea', label: '留言', required: true },
          ],
          submitButtonText: '提交',
          successMessage: '感谢您的留言！',
        },
      };
    default:
      return baseBlock;
  }
}

// Default themes
export const DEFAULT_THEMES: BioLinkTheme[] = [
  {
    name: '简约白',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    buttonStyle: 'solid',
    buttonColor: '#1f2937',
    buttonTextColor: '#ffffff',
    buttonRadius: 'lg',
    fontFamily: 'Inter',
  },
  {
    name: '暗黑',
    backgroundColor: '#0f0f0f',
    textColor: '#ffffff',
    buttonStyle: 'outline',
    buttonColor: '#ffffff',
    buttonTextColor: '#ffffff',
    buttonRadius: 'md',
    fontFamily: 'Inter',
  },
  {
    name: '渐变紫',
    backgroundColor: '#ffffff',
    backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: '#ffffff',
    buttonStyle: 'soft',
    buttonColor: 'rgba(255,255,255,0.2)',
    buttonTextColor: '#ffffff',
    buttonRadius: 'full',
    fontFamily: 'Poppins',
  },
  {
    name: '清新绿',
    backgroundColor: '#ecfdf5',
    textColor: '#064e3b',
    buttonStyle: 'solid',
    buttonColor: '#10b981',
    buttonTextColor: '#ffffff',
    buttonRadius: 'lg',
    fontFamily: 'Inter',
  },
  {
    name: '温暖橙',
    backgroundColor: '#fff7ed',
    textColor: '#7c2d12',
    buttonStyle: 'solid',
    buttonColor: '#f97316',
    buttonTextColor: '#ffffff',
    buttonRadius: 'md',
    fontFamily: 'Inter',
  },
];

// Social platforms
export const SOCIAL_PLATFORMS = [
  { id: 'twitter', label: 'Twitter/X', icon: 'twitter' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube' },
  { id: 'tiktok', label: 'TikTok', icon: 'music-2' },
  { id: 'github', label: 'GitHub', icon: 'github' },
  { id: 'discord', label: 'Discord', icon: 'message-circle' },
  { id: 'telegram', label: 'Telegram', icon: 'send' },
  { id: 'wechat', label: '微信', icon: 'message-square' },
  { id: 'weibo', label: '微博', icon: 'message-square' },
  { id: 'bilibili', label: 'B站', icon: 'play' },
  { id: 'xiaohongshu', label: '小红书', icon: 'book' },
  { id: 'zhihu', label: '知乎', icon: 'help-circle' },
];
