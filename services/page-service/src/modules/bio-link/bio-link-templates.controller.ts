import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  BioLinkTemplatesService,
  ThemeCategory,
  BlockCategory,
} from './bio-link-templates.service';

@ApiTags('bio-link-templates')
@Controller('bio-links/templates')
export class BioLinkTemplatesController {
  constructor(
    private readonly templatesService: BioLinkTemplatesService,
  ) {}

  @Get('themes')
  @ApiOperation({ summary: '获取主题模板列表' })
  @ApiQuery({ name: 'category', required: false, description: '主题类别' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序方式 (popularity | name)' })
  getThemes(
    @Query('category') category?: ThemeCategory,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'popularity' | 'name',
  ) {
    return this.templatesService.getThemeTemplates({ category, search, sortBy });
  }

  @Get('themes/categories')
  @ApiOperation({ summary: '获取主题类别列表' })
  getThemeCategories() {
    return this.templatesService.getThemeCategories();
  }

  @Get('themes/:id')
  @ApiOperation({ summary: '获取单个主题模板' })
  getTheme(@Param('id') id: string) {
    const theme = this.templatesService.getThemeTemplate(id);
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }
    return theme;
  }

  @Get('themes/:id/css')
  @ApiOperation({ summary: '获取主题 CSS' })
  getThemeCSS(@Param('id') id: string) {
    const theme = this.templatesService.getThemeTemplate(id);
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }
    return {
      css: this.templatesService.generateThemeCSS(theme.theme),
      theme: theme.theme,
    };
  }

  @Get('themes/recommended')
  @ApiOperation({ summary: '获取推荐主题' })
  @ApiQuery({ name: 'industry', required: false, description: '行业' })
  @ApiQuery({ name: 'style', required: false, description: '风格偏好' })
  getRecommendedThemes(
    @Query('industry') industry?: string,
    @Query('style') style?: string,
  ) {
    return this.templatesService.getRecommendedThemes({ industry, style });
  }

  @Get('blocks')
  @ApiOperation({ summary: '获取块类型列表' })
  @ApiQuery({ name: 'category', required: false, description: '块类别' })
  @ApiQuery({ name: 'includePremium', required: false, description: '是否包含付费块' })
  getBlockTypes(
    @Query('category') category?: BlockCategory,
    @Query('includePremium') includePremium?: string,
  ) {
    return this.templatesService.getBlockTypes({
      category,
      includePremium: includePremium !== 'false',
    });
  }

  @Get('blocks/categories')
  @ApiOperation({ summary: '获取块类别列表' })
  getBlockCategories() {
    return this.templatesService.getBlockCategories();
  }

  @Get('fonts')
  @ApiOperation({ summary: '获取可用字体列表' })
  getFonts() {
    return this.templatesService.getFonts();
  }

  @Get('colors')
  @ApiOperation({ summary: '获取推荐颜色调色板' })
  getColorPalettes() {
    return {
      palettes: [
        {
          name: '现代蓝',
          colors: ['#3b82f6', '#1d4ed8', '#60a5fa', '#eff6ff', '#1e40af'],
        },
        {
          name: '自然绿',
          colors: ['#22c55e', '#15803d', '#86efac', '#f0fdf4', '#14532d'],
        },
        {
          name: '活力橙',
          colors: ['#f97316', '#c2410c', '#fdba74', '#fff7ed', '#7c2d12'],
        },
        {
          name: '优雅紫',
          colors: ['#a855f7', '#7e22ce', '#d8b4fe', '#faf5ff', '#581c87'],
        },
        {
          name: '商务灰',
          colors: ['#6b7280', '#374151', '#d1d5db', '#f9fafb', '#111827'],
        },
        {
          name: '玫瑰金',
          colors: ['#f472b6', '#be185d', '#fbcfe8', '#fdf2f8', '#831843'],
        },
        {
          name: '午夜蓝',
          colors: ['#3b82f6', '#1e3a8a', '#93c5fd', '#0f172a', '#1e293b'],
        },
        {
          name: '森林',
          colors: ['#059669', '#064e3b', '#6ee7b7', '#ecfdf5', '#022c22'],
        },
      ],
      gradients: [
        { name: '日落', colors: ['#ff7e5f', '#feb47b'] },
        { name: '海洋', colors: ['#667eea', '#764ba2'] },
        { name: '极光', colors: ['#a855f7', '#06b6d4', '#22c55e'] },
        { name: '火焰', colors: ['#ff6b35', '#f7931e', '#ff0844'] },
        { name: '星空', colors: ['#0f2027', '#203a43', '#2c5364'] },
        { name: '薄荷', colors: ['#00b09b', '#96c93d'] },
        { name: '蓝莓', colors: ['#4facfe', '#00f2fe'] },
        { name: '粉霞', colors: ['#ffecd2', '#fcb69f'] },
      ],
    };
  }

  @Get('animations')
  @ApiOperation({ summary: '获取可用动画效果' })
  getAnimations() {
    return {
      buttonAnimations: [
        { id: 'none', name: '无', description: '无动画效果' },
        { id: 'bounce', name: '弹跳', description: '按钮轻微弹跳' },
        { id: 'pulse', name: '脉冲', description: '发光脉冲效果' },
        { id: 'shake', name: '摇晃', description: '轻微左右摇晃' },
      ],
      pageAnimations: [
        { id: 'fade', name: '淡入', description: '页面元素淡入显示' },
        { id: 'slide-up', name: '上滑', description: '元素从下方滑入' },
        { id: 'scale', name: '缩放', description: '元素从小到大出现' },
        { id: 'stagger', name: '交错', description: '元素依次出现' },
      ],
      hoverEffects: [
        { id: 'lift', name: '悬浮', description: '鼠标悬停时上浮' },
        { id: 'glow', name: '发光', description: '鼠标悬停时发光' },
        { id: 'scale', name: '放大', description: '鼠标悬停时放大' },
        { id: 'border', name: '边框', description: '鼠标悬停时显示边框' },
      ],
    };
  }

  @Get('icons')
  @ApiOperation({ summary: '获取可用图标列表' })
  @ApiQuery({ name: 'category', required: false, description: '图标类别' })
  getIcons(@Query('category') category?: string) {
    const icons = {
      social: [
        'instagram', 'tiktok', 'youtube', 'twitter', 'facebook',
        'linkedin', 'github', 'discord', 'twitch', 'spotify',
        'snapchat', 'pinterest', 'reddit', 'telegram', 'whatsapp',
      ],
      commerce: [
        'shopping-bag', 'shopping-cart', 'credit-card', 'dollar-sign',
        'tag', 'gift', 'percent', 'package',
      ],
      media: [
        'play', 'pause', 'music', 'video', 'camera', 'image',
        'mic', 'headphones', 'volume-2',
      ],
      communication: [
        'mail', 'phone', 'message-circle', 'message-square',
        'send', 'at-sign', 'globe', 'link',
      ],
      misc: [
        'star', 'heart', 'bookmark', 'flag', 'bell', 'calendar',
        'clock', 'map-pin', 'user', 'users', 'settings', 'menu',
      ],
    };

    if (category && icons[category as keyof typeof icons]) {
      return { category, icons: icons[category as keyof typeof icons] };
    }

    return icons;
  }
}
