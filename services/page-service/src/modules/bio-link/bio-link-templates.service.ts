import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BioTheme, BioSettings } from './entities/bio-link.entity';

// 预设主题模板
export interface ThemeTemplate {
  id: string;
  name: string;
  category: ThemeCategory;
  preview: string; // 预览图 URL
  theme: BioTheme;
  settings?: Partial<BioSettings>;
  tags: string[];
  popularity: number;
}

export type ThemeCategory =
  | 'minimal'
  | 'bold'
  | 'elegant'
  | 'playful'
  | 'professional'
  | 'creative'
  | 'dark'
  | 'gradient'
  | 'seasonal'
  | 'custom';

// 块类型定义
export interface BlockTypeDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: BlockCategory;
  defaultConfig: Record<string, any>;
  configSchema: Record<string, any>;
  premium?: boolean;
}

export type BlockCategory =
  | 'basic'
  | 'social'
  | 'media'
  | 'commerce'
  | 'engagement'
  | 'advanced';

// 预设主题
const PRESET_THEMES: ThemeTemplate[] = [
  // Minimal
  {
    id: 'minimal-white',
    name: '极简白',
    category: 'minimal',
    preview: '/themes/minimal-white.png',
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      secondaryTextColor: '#666666',
      buttonStyle: 'outlined',
      buttonColor: '#1a1a1a',
      buttonTextColor: '#1a1a1a',
      buttonBorderRadius: 'medium',
      fontFamily: 'Inter',
      fontSize: 'medium',
      layout: 'standard',
    },
    tags: ['简约', '干净', '白色'],
    popularity: 95,
  },
  {
    id: 'minimal-dark',
    name: '极简黑',
    category: 'minimal',
    preview: '/themes/minimal-dark.png',
    theme: {
      backgroundColor: '#0a0a0a',
      textColor: '#ffffff',
      secondaryTextColor: '#a0a0a0',
      buttonStyle: 'outlined',
      buttonColor: '#ffffff',
      buttonTextColor: '#ffffff',
      buttonBorderRadius: 'medium',
      fontFamily: 'Inter',
      fontSize: 'medium',
      layout: 'standard',
    },
    tags: ['简约', '深色', '黑色'],
    popularity: 92,
  },
  // Bold
  {
    id: 'bold-neon',
    name: '霓虹闪耀',
    category: 'bold',
    preview: '/themes/bold-neon.png',
    theme: {
      backgroundColor: '#0d0d0d',
      backgroundGradient: {
        type: 'radial',
        colors: ['#1a0a2e', '#0d0d0d'],
      },
      textColor: '#ffffff',
      secondaryTextColor: '#00ff88',
      buttonStyle: 'filled',
      buttonColor: '#00ff88',
      buttonTextColor: '#0d0d0d',
      buttonBorderRadius: 'full',
      buttonAnimation: 'pulse',
      fontFamily: 'Space Grotesk',
      fontSize: 'large',
    },
    tags: ['霓虹', '炫酷', '发光'],
    popularity: 88,
  },
  {
    id: 'bold-fire',
    name: '火焰热情',
    category: 'bold',
    preview: '/themes/bold-fire.png',
    theme: {
      backgroundGradient: {
        type: 'linear',
        colors: ['#ff6b35', '#f7931e', '#ff0844'],
        angle: 135,
      },
      textColor: '#ffffff',
      secondaryTextColor: '#ffddcc',
      buttonStyle: 'glass',
      buttonColor: '#ffffff',
      buttonTextColor: '#ff6b35',
      buttonBorderRadius: 'large',
      fontFamily: 'Poppins',
    },
    tags: ['火焰', '热情', '渐变'],
    popularity: 85,
  },
  // Elegant
  {
    id: 'elegant-rose',
    name: '玫瑰金',
    category: 'elegant',
    preview: '/themes/elegant-rose.png',
    theme: {
      backgroundColor: '#fdf5f3',
      textColor: '#4a3c3c',
      secondaryTextColor: '#b8a8a8',
      buttonStyle: 'soft',
      buttonColor: '#d4a373',
      buttonTextColor: '#4a3c3c',
      buttonBorderRadius: 'small',
      fontFamily: 'Playfair Display',
      fontSize: 'medium',
      layout: 'spacious',
    },
    tags: ['优雅', '玫瑰金', '女性'],
    popularity: 90,
  },
  {
    id: 'elegant-marble',
    name: '大理石纹',
    category: 'elegant',
    preview: '/themes/elegant-marble.png',
    theme: {
      backgroundColor: '#f8f8f8',
      backgroundImage: '/patterns/marble.jpg',
      backgroundOverlay: 'rgba(248, 248, 248, 0.9)',
      textColor: '#2c2c2c',
      secondaryTextColor: '#888888',
      buttonStyle: 'shadow',
      buttonColor: '#2c2c2c',
      buttonTextColor: '#ffffff',
      buttonBorderRadius: 'none',
      fontFamily: 'Cormorant Garamond',
      fontSize: 'large',
    },
    tags: ['优雅', '大理石', '高端'],
    popularity: 82,
  },
  // Playful
  {
    id: 'playful-candy',
    name: '糖果色',
    category: 'playful',
    preview: '/themes/playful-candy.png',
    theme: {
      backgroundGradient: {
        type: 'linear',
        colors: ['#ffecd2', '#fcb69f'],
        angle: 90,
      },
      textColor: '#5c4033',
      secondaryTextColor: '#8b6914',
      buttonStyle: 'filled',
      buttonColor: '#ff6b6b',
      buttonTextColor: '#ffffff',
      buttonBorderRadius: 'full',
      buttonAnimation: 'bounce',
      fontFamily: 'Nunito',
      fontSize: 'medium',
    },
    tags: ['可爱', '糖果', '活泼'],
    popularity: 87,
  },
  {
    id: 'playful-retro',
    name: '复古怀旧',
    category: 'playful',
    preview: '/themes/playful-retro.png',
    theme: {
      backgroundColor: '#fef3c7',
      textColor: '#78350f',
      secondaryTextColor: '#b45309',
      buttonStyle: 'filled',
      buttonColor: '#dc2626',
      buttonTextColor: '#fef3c7',
      buttonBorderRadius: 'small',
      fontFamily: 'VT323',
      fontSize: 'large',
    },
    tags: ['复古', '怀旧', '像素'],
    popularity: 75,
  },
  // Professional
  {
    id: 'professional-corporate',
    name: '商务蓝',
    category: 'professional',
    preview: '/themes/professional-corporate.png',
    theme: {
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      secondaryTextColor: '#64748b',
      buttonStyle: 'filled',
      buttonColor: '#2563eb',
      buttonTextColor: '#ffffff',
      buttonBorderRadius: 'small',
      fontFamily: 'Inter',
      fontSize: 'medium',
      layout: 'compact',
    },
    tags: ['商务', '专业', '蓝色'],
    popularity: 91,
  },
  // Creative
  {
    id: 'creative-aurora',
    name: '极光幻彩',
    category: 'creative',
    preview: '/themes/creative-aurora.png',
    theme: {
      backgroundGradient: {
        type: 'linear',
        colors: ['#a855f7', '#06b6d4', '#22c55e'],
        angle: 135,
      },
      textColor: '#ffffff',
      secondaryTextColor: '#e0e0e0',
      buttonStyle: 'glass',
      buttonColor: 'rgba(255,255,255,0.2)',
      buttonTextColor: '#ffffff',
      buttonBorderRadius: 'large',
      fontFamily: 'Outfit',
    },
    tags: ['极光', '渐变', '梦幻'],
    popularity: 89,
  },
  // Dark
  {
    id: 'dark-midnight',
    name: '午夜蓝',
    category: 'dark',
    preview: '/themes/dark-midnight.png',
    theme: {
      backgroundGradient: {
        type: 'linear',
        colors: ['#0f172a', '#1e293b'],
        angle: 180,
      },
      textColor: '#f1f5f9',
      secondaryTextColor: '#94a3b8',
      buttonStyle: 'outlined',
      buttonColor: '#3b82f6',
      buttonTextColor: '#3b82f6',
      buttonBorderRadius: 'medium',
      fontFamily: 'Inter',
    },
    tags: ['深色', '蓝色', '夜晚'],
    popularity: 86,
  },
  // Gradient
  {
    id: 'gradient-sunset',
    name: '日落黄昏',
    category: 'gradient',
    preview: '/themes/gradient-sunset.png',
    theme: {
      backgroundGradient: {
        type: 'linear',
        colors: ['#ff7e5f', '#feb47b'],
        angle: 45,
      },
      textColor: '#ffffff',
      secondaryTextColor: '#fff5ee',
      buttonStyle: 'soft',
      buttonColor: '#ffffff',
      buttonTextColor: '#ff7e5f',
      buttonBorderRadius: 'full',
      fontFamily: 'DM Sans',
    },
    tags: ['渐变', '日落', '温暖'],
    popularity: 84,
  },
  {
    id: 'gradient-ocean',
    name: '深海蓝',
    category: 'gradient',
    preview: '/themes/gradient-ocean.png',
    theme: {
      backgroundGradient: {
        type: 'linear',
        colors: ['#667eea', '#764ba2'],
        angle: 135,
      },
      textColor: '#ffffff',
      secondaryTextColor: '#e0e7ff',
      buttonStyle: 'filled',
      buttonColor: '#ffffff',
      buttonTextColor: '#667eea',
      buttonBorderRadius: 'large',
      fontFamily: 'Quicksand',
    },
    tags: ['渐变', '海洋', '紫色'],
    popularity: 88,
  },
];

// 块类型定义
const BLOCK_TYPES: BlockTypeDefinition[] = [
  // Basic
  {
    type: 'link',
    name: '链接',
    description: '添加一个可点击的链接按钮',
    icon: 'link',
    category: 'basic',
    defaultConfig: {
      title: '新链接',
      url: '',
      style: { featured: false },
      settings: { openInNewTab: true },
    },
    configSchema: {},
  },
  {
    type: 'header',
    name: '标题',
    description: '添加分隔标题',
    icon: 'heading',
    category: 'basic',
    defaultConfig: {
      title: '分隔标题',
      text: { alignment: 'center', fontSize: 'medium' },
    },
    configSchema: {},
  },
  {
    type: 'text',
    name: '文本块',
    description: '添加纯文本或 Markdown 内容',
    icon: 'text',
    category: 'basic',
    defaultConfig: {
      text: { content: '', format: 'markdown', alignment: 'left' },
    },
    configSchema: {},
  },
  {
    type: 'divider',
    name: '分隔线',
    description: '添加视觉分隔线',
    icon: 'minus',
    category: 'basic',
    defaultConfig: { title: '' },
    configSchema: {},
  },
  {
    type: 'image',
    name: '图片',
    description: '展示图片',
    icon: 'image',
    category: 'basic',
    defaultConfig: {
      image: { url: '', objectFit: 'cover' },
    },
    configSchema: {},
  },
  // Social
  {
    type: 'social_icons',
    name: '社交图标',
    description: '展示社交媒体图标集',
    icon: 'share-2',
    category: 'social',
    defaultConfig: { title: '' },
    configSchema: {},
  },
  // Media
  {
    type: 'youtube',
    name: 'YouTube 视频',
    description: '嵌入 YouTube 视频',
    icon: 'youtube',
    category: 'media',
    defaultConfig: {
      title: 'YouTube 视频',
      embed: { type: 'youtube', embedId: '' },
    },
    configSchema: {},
  },
  {
    type: 'spotify',
    name: 'Spotify 音乐',
    description: '嵌入 Spotify 播放器',
    icon: 'music',
    category: 'media',
    defaultConfig: {
      title: 'Spotify',
      music: { provider: 'spotify' },
    },
    configSchema: {},
  },
  {
    type: 'tiktok',
    name: 'TikTok 视频',
    description: '嵌入 TikTok 视频',
    icon: 'video',
    category: 'media',
    defaultConfig: {
      title: 'TikTok',
      embed: { type: 'tiktok', embedId: '' },
    },
    configSchema: {},
  },
  {
    type: 'video',
    name: '视频播放器',
    description: '自定义视频播放',
    icon: 'play-circle',
    category: 'media',
    defaultConfig: {
      title: '视频',
      video: { url: '', controls: true },
    },
    configSchema: {},
  },
  {
    type: 'carousel',
    name: '图片轮播',
    description: '多图轮播展示',
    icon: 'layers',
    category: 'media',
    defaultConfig: {
      title: '轮播',
      carousel: { images: [], transitionType: 'slide' },
    },
    configSchema: {},
  },
  {
    type: 'podcast',
    name: '播客',
    description: '嵌入播客内容',
    icon: 'mic',
    category: 'media',
    defaultConfig: {
      title: '播客',
      podcast: { provider: 'spotify' },
    },
    configSchema: {},
    premium: true,
  },
  // Commerce
  {
    type: 'product',
    name: '商品卡片',
    description: '展示商品信息',
    icon: 'shopping-bag',
    category: 'commerce',
    defaultConfig: {
      title: '商品名称',
      product: { price: 0, currency: 'CNY' },
    },
    configSchema: {},
  },
  {
    type: 'payment',
    name: '收款按钮',
    description: '接受付款',
    icon: 'credit-card',
    category: 'commerce',
    defaultConfig: {
      title: '立即购买',
      url: '',
    },
    configSchema: {},
    premium: true,
  },
  {
    type: 'nft',
    name: 'NFT 展示',
    description: '展示 NFT 作品',
    icon: 'hexagon',
    category: 'commerce',
    defaultConfig: {
      title: 'NFT',
      nft: { platform: 'opensea' },
    },
    configSchema: {},
    premium: true,
  },
  // Engagement
  {
    type: 'subscribe',
    name: '订阅表单',
    description: '收集邮箱订阅',
    icon: 'mail',
    category: 'engagement',
    defaultConfig: {
      title: '订阅',
      subscribe: { buttonText: '订阅', placeholder: '输入邮箱' },
    },
    configSchema: {},
  },
  {
    type: 'contact_form',
    name: '联系表单',
    description: '收集访客信息',
    icon: 'message-square',
    category: 'engagement',
    defaultConfig: {
      title: '联系我',
      contactForm: {
        fields: [
          { name: 'name', type: 'text', label: '姓名', required: true },
          { name: 'email', type: 'email', label: '邮箱', required: true },
          { name: 'message', type: 'textarea', label: '留言', required: true },
        ],
        submitButtonText: '发送',
      },
    },
    configSchema: {},
    premium: true,
  },
  {
    type: 'countdown',
    name: '倒计时',
    description: '显示倒计时器',
    icon: 'clock',
    category: 'engagement',
    defaultConfig: {
      title: '倒计时',
      countdown: {
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
      },
    },
    configSchema: {},
  },
  // Advanced
  {
    type: 'map',
    name: '地图',
    description: '显示位置地图',
    icon: 'map-pin',
    category: 'advanced',
    defaultConfig: {
      title: '位置',
      map: { provider: 'google', latitude: 39.9042, longitude: 116.4074, zoom: 15 },
    },
    configSchema: {},
    premium: true,
  },
  {
    type: 'html',
    name: '自定义 HTML',
    description: '嵌入自定义 HTML 代码',
    icon: 'code',
    category: 'advanced',
    defaultConfig: {
      title: 'HTML',
      content: { html: '' },
    },
    configSchema: {},
    premium: true,
  },
];

@Injectable()
export class BioLinkTemplatesService {
  private readonly logger = new Logger(BioLinkTemplatesService.name);

  /**
   * 获取所有主题模板
   */
  getThemeTemplates(options?: {
    category?: ThemeCategory;
    search?: string;
    sortBy?: 'popularity' | 'name';
  }): ThemeTemplate[] {
    let templates = [...PRESET_THEMES];

    // 按类别筛选
    if (options?.category) {
      templates = templates.filter((t) => t.category === options.category);
    }

    // 搜索
    if (options?.search) {
      const search = options.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.tags.some((tag) => tag.toLowerCase().includes(search)),
      );
    }

    // 排序
    if (options?.sortBy === 'name') {
      templates.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      templates.sort((a, b) => b.popularity - a.popularity);
    }

    return templates;
  }

  /**
   * 获取单个主题模板
   */
  getThemeTemplate(id: string): ThemeTemplate | null {
    return PRESET_THEMES.find((t) => t.id === id) || null;
  }

  /**
   * 获取主题类别
   */
  getThemeCategories(): Array<{ id: ThemeCategory; name: string; count: number }> {
    const categoryNames: Record<ThemeCategory, string> = {
      minimal: '极简',
      bold: '大胆',
      elegant: '优雅',
      playful: '活泼',
      professional: '专业',
      creative: '创意',
      dark: '深色',
      gradient: '渐变',
      seasonal: '节日',
      custom: '自定义',
    };

    const counts = PRESET_THEMES.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryNames).map(([id, name]) => ({
      id: id as ThemeCategory,
      name,
      count: counts[id] || 0,
    }));
  }

  /**
   * 获取所有块类型
   */
  getBlockTypes(options?: {
    category?: BlockCategory;
    includePremium?: boolean;
  }): BlockTypeDefinition[] {
    let blocks = [...BLOCK_TYPES];

    if (options?.category) {
      blocks = blocks.filter((b) => b.category === options.category);
    }

    if (options?.includePremium === false) {
      blocks = blocks.filter((b) => !b.premium);
    }

    return blocks;
  }

  /**
   * 获取块类别
   */
  getBlockCategories(): Array<{ id: BlockCategory; name: string; count: number }> {
    const categoryNames: Record<BlockCategory, string> = {
      basic: '基础',
      social: '社交',
      media: '媒体',
      commerce: '商业',
      engagement: '互动',
      advanced: '高级',
    };

    const counts = BLOCK_TYPES.reduce(
      (acc, b) => {
        acc[b.category] = (acc[b.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryNames).map(([id, name]) => ({
      id: id as BlockCategory,
      name,
      count: counts[id] || 0,
    }));
  }

  /**
   * 获取字体列表
   */
  getFonts(): Array<{ family: string; name: string; category: string }> {
    return [
      { family: 'Inter', name: 'Inter', category: 'sans-serif' },
      { family: 'Poppins', name: 'Poppins', category: 'sans-serif' },
      { family: 'Roboto', name: 'Roboto', category: 'sans-serif' },
      { family: 'Open Sans', name: 'Open Sans', category: 'sans-serif' },
      { family: 'Montserrat', name: 'Montserrat', category: 'sans-serif' },
      { family: 'Lato', name: 'Lato', category: 'sans-serif' },
      { family: 'Nunito', name: 'Nunito', category: 'sans-serif' },
      { family: 'DM Sans', name: 'DM Sans', category: 'sans-serif' },
      { family: 'Outfit', name: 'Outfit', category: 'sans-serif' },
      { family: 'Quicksand', name: 'Quicksand', category: 'sans-serif' },
      { family: 'Space Grotesk', name: 'Space Grotesk', category: 'sans-serif' },
      { family: 'Playfair Display', name: 'Playfair Display', category: 'serif' },
      { family: 'Cormorant Garamond', name: 'Cormorant Garamond', category: 'serif' },
      { family: 'Merriweather', name: 'Merriweather', category: 'serif' },
      { family: 'Source Serif Pro', name: 'Source Serif Pro', category: 'serif' },
      { family: 'VT323', name: 'VT323', category: 'monospace' },
      { family: 'JetBrains Mono', name: 'JetBrains Mono', category: 'monospace' },
    ];
  }

  /**
   * 生成主题预览 CSS
   */
  generateThemeCSS(theme: BioTheme): string {
    const css: string[] = [];

    // Background
    if (theme.backgroundGradient) {
      const { type, colors, angle } = theme.backgroundGradient;
      if (type === 'linear') {
        css.push(`background: linear-gradient(${angle || 180}deg, ${colors.join(', ')});`);
      } else {
        css.push(`background: radial-gradient(circle, ${colors.join(', ')});`);
      }
    } else if (theme.backgroundColor) {
      css.push(`background-color: ${theme.backgroundColor};`);
    }

    if (theme.backgroundImage) {
      css.push(`background-image: url(${theme.backgroundImage});`);
      css.push('background-size: cover;');
      css.push('background-position: center;');
    }

    // Text
    if (theme.textColor) {
      css.push(`color: ${theme.textColor};`);
    }
    if (theme.fontFamily) {
      css.push(`font-family: "${theme.fontFamily}", sans-serif;`);
    }

    return css.join('\n');
  }

  /**
   * 获取推荐主题
   */
  getRecommendedThemes(userPreferences?: {
    industry?: string;
    style?: string;
    colors?: string[];
  }): ThemeTemplate[] {
    // 简单的推荐逻辑，可以扩展为 ML 模型
    let templates = [...PRESET_THEMES];

    if (userPreferences?.style) {
      const styleMap: Record<string, ThemeCategory[]> = {
        professional: ['professional', 'minimal'],
        creative: ['creative', 'bold', 'gradient'],
        casual: ['playful', 'gradient'],
        luxury: ['elegant', 'dark'],
      };

      const preferredCategories = styleMap[userPreferences.style] || [];
      templates = templates.filter((t) =>
        preferredCategories.includes(t.category),
      );
    }

    return templates.sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  }
}
