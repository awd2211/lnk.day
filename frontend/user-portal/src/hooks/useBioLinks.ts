import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkApi } from '@/lib/api';

export type BlockType =
  | 'link'
  | 'header'
  | 'text'
  | 'image'
  | 'video'
  | 'social'
  | 'divider'
  | 'email'
  | 'contact'
  | 'map'
  | 'spotify'
  | 'youtube';

export interface BioLinkBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  style?: Record<string, any>;
  isVisible: boolean;
  sortOrder: number;
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

export interface BioLink {
  id: string;
  slug: string;
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
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBioLinkData {
  slug: string;
  title: string;
  description?: string;
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
}

// Query: Get all bio links
export function useBioLinks() {
  return useQuery({
    queryKey: ['bio-links'],
    queryFn: async () => {
      const { data } = await linkApi.get('/bio-links');
      return data as BioLink[];
    },
  });
}

// Query: Get single bio link
export function useBioLink(id: string | null) {
  return useQuery({
    queryKey: ['bio-links', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await linkApi.get(`/bio-links/${id}`);
      return data as BioLink;
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
      const { data } = await linkApi.get(`/bio-links/slug/${slug}`);
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
      const { data } = await linkApi.get('/bio-links/themes');
      return data as BioLinkTheme[];
    },
  });
}

// Mutation: Create bio link
export function useCreateBioLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBioLinkData) => {
      const response = await linkApi.post('/bio-links', data);
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
      const response = await linkApi.put(`/bio-links/${id}`, data);
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
      await linkApi.delete(`/bio-links/${id}`);
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
      const response = await linkApi.post(`/bio-links/${id}/toggle-publish`);
      return response.data as BioLink;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['bio-links'] });
      queryClient.invalidateQueries({ queryKey: ['bio-links', id] });
    },
  });
}

// Block type labels
export const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; icon: string; description: string }> = {
  link: { label: '链接', icon: 'link', description: '添加一个可点击的链接按钮' },
  header: { label: '标题', icon: 'heading', description: '添加大标题文字' },
  text: { label: '文本', icon: 'type', description: '添加描述性文本' },
  image: { label: '图片', icon: 'image', description: '添加图片' },
  video: { label: '视频', icon: 'video', description: '嵌入视频' },
  social: { label: '社交链接', icon: 'share-2', description: '添加社交媒体图标链接' },
  divider: { label: '分隔线', icon: 'minus', description: '添加视觉分隔' },
  email: { label: '邮件订阅', icon: 'mail', description: '添加邮件订阅表单' },
  contact: { label: '联系方式', icon: 'phone', description: '显示联系信息' },
  map: { label: '地图', icon: 'map-pin', description: '嵌入地图位置' },
  spotify: { label: 'Spotify', icon: 'music', description: '嵌入 Spotify 播放器' },
  youtube: { label: 'YouTube', icon: 'youtube', description: '嵌入 YouTube 视频' },
};

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
