import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';

import {
  PageTemplate,
  TemplateFavorite,
  TemplateCategory,
  TemplateType,
} from './entities/page-template.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
} from './dto/template.dto';
import { PageService } from '../page/page.service';
import { PageType } from '../page/entities/page.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(PageTemplate)
    private readonly templateRepository: Repository<PageTemplate>,
    @InjectRepository(TemplateFavorite)
    private readonly favoriteRepository: Repository<TemplateFavorite>,
    private readonly pageService: PageService,
  ) {}

  async create(
    dto: CreateTemplateDto,
    authorId?: string,
    authorName?: string,
  ): Promise<PageTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      authorId,
      authorName,
    });

    return this.templateRepository.save(template);
  }

  async findAll(
    query: TemplateQueryDto,
  ): Promise<{ templates: PageTemplate[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: any = { isPublic: true };

    if (query.category) {
      where.category = query.category;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.featured) {
      where.isFeatured = true;
    }

    if (query.premium !== undefined) {
      where.isPremium = query.premium;
    }

    let queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .where(where);

    if (query.search) {
      queryBuilder = queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [templates, total] = await queryBuilder
      .orderBy('template.isFeatured', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { templates, total };
  }

  async findOne(id: string): Promise<PageTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<PageTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }

  async getByCategory(
    category: TemplateCategory,
  ): Promise<PageTemplate[]> {
    return this.templateRepository.find({
      where: { category, isPublic: true },
      order: { usageCount: 'DESC' },
    });
  }

  async getFeatured(): Promise<PageTemplate[]> {
    return this.templateRepository.find({
      where: { isFeatured: true, isPublic: true },
      order: { usageCount: 'DESC' },
      take: 12,
    });
  }

  async createPageFromTemplate(
    templateId: string,
    name: string,
    slug: string | undefined,
    userId: string,
    teamId: string,
  ) {
    const template = await this.findOne(templateId);

    // Map template type to page type
    const pageTypeMap: Record<TemplateType, PageType> = {
      [TemplateType.LINK_IN_BIO]: PageType.LINK_IN_BIO,
      [TemplateType.LANDING]: PageType.LANDING,
      [TemplateType.PORTFOLIO]: PageType.LANDING,
      [TemplateType.CONTACT]: PageType.FORM,
      [TemplateType.MENU]: PageType.CUSTOM,
      [TemplateType.EVENT]: PageType.LANDING,
    };

    // Create page from template
    const page = await this.pageService.create({
      name,
      slug,
      userId,
      teamId,
      templateId,
      type: pageTypeMap[template.type] || PageType.LANDING,
      blocks: template.blocks as any,
      theme: template.theme as any,
      seo: template.seoDefaults as any,
    });

    // Increment template usage count
    template.usageCount += 1;
    await this.templateRepository.save(template);

    return page;
  }

  // ========== Favorites ==========

  async addFavorite(userId: string, templateId: string): Promise<void> {
    // Check if template exists
    await this.findOne(templateId);

    // Check if already favorited
    const existing = await this.favoriteRepository.findOne({
      where: { userId, templateId },
    });

    if (existing) {
      throw new BadRequestException('Template already favorited');
    }

    const favorite = this.favoriteRepository.create({ userId, templateId });
    await this.favoriteRepository.save(favorite);

    // Increment favorite count
    await this.templateRepository.increment({ id: templateId }, 'favoriteCount', 1);
  }

  async removeFavorite(userId: string, templateId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, templateId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteRepository.remove(favorite);

    // Decrement favorite count
    await this.templateRepository.decrement({ id: templateId }, 'favoriteCount', 1);
  }

  async getUserFavorites(
    userId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ templates: PageTemplate[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const favorites = await this.favoriteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (favorites.length === 0) {
      return { templates: [], total: 0 };
    }

    const templateIds = favorites.map((f) => f.templateId);
    const templates = await this.templateRepository.find({
      where: { id: In(templateIds) },
    });

    const total = await this.favoriteRepository.count({ where: { userId } });

    return { templates, total };
  }

  async isFavorited(userId: string, templateId: string): Promise<boolean> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, templateId },
    });
    return !!favorite;
  }

  // ========== Seed Default Templates ==========

  async seedDefaultTemplates(): Promise<void> {
    const existingCount = await this.templateRepository.count();
    if (existingCount > 0) {
      return; // Already seeded
    }

    const defaultTemplates: Partial<PageTemplate>[] = [
      // ===== Personal Templates =====
      {
        name: 'Personal Bio',
        description: 'Simple and clean personal bio page',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { name: 'Your Name', bio: 'Your bio here' }, order: 0 },
          { id: '2', type: 'links', content: { links: [] }, order: 1 },
          { id: '3', type: 'social', content: { networks: [] }, order: 2 },
        ],
        theme: {
          primaryColor: '#3498db',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['personal', 'bio', 'minimal'],
      },
      {
        name: 'Minimalist White',
        description: 'Ultra clean minimalist design with white space',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'minimal' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'text-only' }, order: 1 },
        ],
        theme: {
          primaryColor: '#000000',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontFamily: 'Helvetica Neue, sans-serif',
          buttonStyle: 'underline',
          layout: 'centered',
        },
        tags: ['minimal', 'white', 'clean'],
      },
      {
        name: 'Dark Mode Pro',
        description: 'Elegant dark theme with gradient accents',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'gradient' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'glass' }, order: 1 },
          { id: '3', type: 'social', content: { networks: [], style: 'icons-only' }, order: 2 },
        ],
        theme: {
          primaryColor: '#8b5cf6',
          backgroundColor: '#0f0f0f',
          textColor: '#ffffff',
          fontFamily: 'SF Pro Display, sans-serif',
          buttonStyle: 'glass',
          layout: 'centered',
        },
        tags: ['dark', 'gradient', 'modern'],
      },

      // ===== Creative Templates =====
      {
        name: 'Creative Portfolio',
        description: 'Showcase your creative work with style',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.PORTFOLIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'header', content: { title: 'My Portfolio', subtitle: 'Creative Work' }, order: 0 },
          { id: '2', type: 'gallery', content: { images: [], layout: 'masonry' }, order: 1 },
          { id: '3', type: 'contact', content: { email: '' }, order: 2 },
        ],
        theme: {
          primaryColor: '#e74c3c',
          backgroundColor: '#1a1a2e',
          textColor: '#ffffff',
          fontFamily: 'Playfair Display, serif',
          buttonStyle: 'outline',
          layout: 'fullwidth',
        },
        tags: ['portfolio', 'creative', 'dark'],
      },
      {
        name: 'Artist Gallery',
        description: 'Beautiful gallery layout for visual artists',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.PORTFOLIO,
        blocks: [
          { id: '1', type: 'header', content: { title: '', subtitle: '', style: 'overlay' }, order: 0 },
          { id: '2', type: 'gallery', content: { images: [], layout: 'grid', columns: 3 }, order: 1 },
          { id: '3', type: 'about', content: { text: '', style: 'split' }, order: 2 },
          { id: '4', type: 'contact', content: { email: '', form: true }, order: 3 },
        ],
        theme: {
          primaryColor: '#c9a959',
          backgroundColor: '#1c1c1c',
          textColor: '#f5f5f5',
          fontFamily: 'Cormorant Garamond, serif',
          buttonStyle: 'outline',
          layout: 'fullwidth',
        },
        tags: ['art', 'gallery', 'photography'],
      },
      {
        name: 'Music Artist',
        description: 'Bio link page for musicians and bands',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.LINK_IN_BIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'hero' }, order: 0 },
          { id: '2', type: 'music-player', content: { tracks: [], platform: 'spotify' }, order: 1 },
          { id: '3', type: 'links', content: { links: [], style: 'music' }, order: 2 },
          { id: '4', type: 'tour-dates', content: { events: [] }, order: 3 },
        ],
        theme: {
          primaryColor: '#1db954',
          backgroundColor: '#121212',
          textColor: '#ffffff',
          fontFamily: 'Circular, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['music', 'artist', 'spotify'],
      },

      // ===== Business Templates =====
      {
        name: 'Restaurant Menu',
        description: 'Digital menu for restaurants and cafes',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.MENU,
        blocks: [
          { id: '1', type: 'header', content: { title: 'Our Menu', logo: '' }, order: 0 },
          { id: '2', type: 'menu', content: { categories: [] }, order: 1 },
          { id: '3', type: 'contact', content: { address: '', phone: '' }, order: 2 },
        ],
        theme: {
          primaryColor: '#27ae60',
          backgroundColor: '#f5f5f5',
          textColor: '#2c3e50',
          fontFamily: 'Lato, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['restaurant', 'menu', 'food'],
      },
      {
        name: 'Digital Business Card',
        description: 'Modern digital business card',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.CONTACT,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', title: '', company: '', avatar: '' }, order: 0 },
          { id: '2', type: 'contact', content: { email: '', phone: '', website: '' }, order: 1 },
          { id: '3', type: 'social', content: { networks: [] }, order: 2 },
          { id: '4', type: 'vcard', content: { downloadText: 'Save Contact' }, order: 3 },
        ],
        theme: {
          primaryColor: '#2980b9',
          backgroundColor: '#ecf0f1',
          textColor: '#2c3e50',
          fontFamily: 'Open Sans, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['business', 'card', 'contact'],
      },
      {
        name: 'Startup Landing',
        description: 'Modern landing page for startups',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.LANDING,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', subheadline: '', cta: '', style: 'gradient' }, order: 0 },
          { id: '2', type: 'features', content: { features: [], layout: 'grid' }, order: 1 },
          { id: '3', type: 'testimonials', content: { items: [] }, order: 2 },
          { id: '4', type: 'pricing', content: { plans: [] }, order: 3 },
          { id: '5', type: 'cta', content: { text: 'Get Started', url: '' }, order: 4 },
        ],
        theme: {
          primaryColor: '#6366f1',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'rounded',
          layout: 'fullwidth',
        },
        tags: ['startup', 'saas', 'landing'],
      },
      {
        name: 'Cafe & Coffee Shop',
        description: 'Warm and inviting template for cafes',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.MENU,
        blocks: [
          { id: '1', type: 'header', content: { title: '', logo: '', style: 'vintage' }, order: 0 },
          { id: '2', type: 'hero', content: { image: '', text: '' }, order: 1 },
          { id: '3', type: 'menu', content: { categories: [], style: 'cards' }, order: 2 },
          { id: '4', type: 'hours', content: { schedule: [] }, order: 3 },
          { id: '5', type: 'map', content: { address: '' }, order: 4 },
        ],
        theme: {
          primaryColor: '#8b4513',
          backgroundColor: '#faf3e0',
          textColor: '#3e2723',
          fontFamily: 'Libre Baskerville, serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['cafe', 'coffee', 'food'],
      },

      // ===== Product Templates =====
      {
        name: 'Product Launch',
        description: 'Landing page for product launches',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'hero', content: { headline: 'Introducing...', subheadline: 'The future is here' }, order: 0 },
          { id: '2', type: 'features', content: { features: [] }, order: 1 },
          { id: '3', type: 'cta', content: { text: 'Get Started', url: '' }, order: 2 },
        ],
        theme: {
          primaryColor: '#9b59b6',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          fontFamily: 'Montserrat, sans-serif',
          buttonStyle: 'gradient',
          layout: 'fullwidth',
        },
        tags: ['product', 'launch', 'startup'],
      },
      {
        name: 'App Download',
        description: 'Promote your mobile app with download links',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', phone_mockup: '', style: 'app' }, order: 0 },
          { id: '2', type: 'app-stores', content: { ios: '', android: '' }, order: 1 },
          { id: '3', type: 'features', content: { features: [], style: 'icons' }, order: 2 },
          { id: '4', type: 'screenshots', content: { images: [] }, order: 3 },
          { id: '5', type: 'reviews', content: { items: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#007aff',
          backgroundColor: '#f2f2f7',
          textColor: '#1c1c1e',
          fontFamily: 'SF Pro Display, sans-serif',
          buttonStyle: 'ios',
          layout: 'centered',
        },
        tags: ['app', 'mobile', 'download'],
      },
      {
        name: 'E-commerce Product',
        description: 'Showcase a single product with purchase options',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'product-hero', content: { images: [], title: '', price: '' }, order: 0 },
          { id: '2', type: 'product-details', content: { description: '', specs: [] }, order: 1 },
          { id: '3', type: 'buy-button', content: { text: 'Buy Now', url: '' }, order: 2 },
          { id: '4', type: 'reviews', content: { items: [] }, order: 3 },
        ],
        theme: {
          primaryColor: '#ff6b6b',
          backgroundColor: '#ffffff',
          textColor: '#2d3436',
          fontFamily: 'Poppins, sans-serif',
          buttonStyle: 'solid',
          layout: 'split',
        },
        tags: ['ecommerce', 'product', 'shop'],
      },

      // ===== Social Templates =====
      {
        name: 'Instagram Bio',
        description: 'Perfect link-in-bio for Instagram',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { avatar: '', username: '@yourname' }, order: 0 },
          { id: '2', type: 'links', content: { style: 'instagram', links: [] }, order: 1 },
        ],
        theme: {
          primaryColor: '#e1306c',
          backgroundColor: '#fafafa',
          textColor: '#262626',
          fontFamily: '-apple-system, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['instagram', 'social', 'linkinbio'],
      },
      {
        name: 'TikTok Creator',
        description: 'Link-in-bio designed for TikTok creators',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { avatar: '', username: '@yourname', verified: false }, order: 0 },
          { id: '2', type: 'video', content: { embedUrl: '' }, order: 1 },
          { id: '3', type: 'links', content: { style: 'tiktok', links: [] }, order: 2 },
        ],
        theme: {
          primaryColor: '#ff0050',
          backgroundColor: '#000000',
          textColor: '#ffffff',
          fontFamily: 'TikTok, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['tiktok', 'social', 'creator'],
      },
      {
        name: 'YouTube Creator',
        description: 'Bio link for YouTube content creators',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { avatar: '', channelName: '' }, order: 0 },
          { id: '2', type: 'youtube-latest', content: { channelId: '' }, order: 1 },
          { id: '3', type: 'subscribe-button', content: { channelUrl: '' }, order: 2 },
          { id: '4', type: 'links', content: { links: [], style: 'youtube' }, order: 3 },
        ],
        theme: {
          primaryColor: '#ff0000',
          backgroundColor: '#ffffff',
          textColor: '#030303',
          fontFamily: 'Roboto, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['youtube', 'creator', 'video'],
      },
      {
        name: 'Twitter/X Profile',
        description: 'Bio link styled like Twitter/X',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { avatar: '', handle: '', verified: false }, order: 0 },
          { id: '2', type: 'tweet-embed', content: { tweetId: '' }, order: 1 },
          { id: '3', type: 'links', content: { links: [], style: 'minimal' }, order: 2 },
        ],
        theme: {
          primaryColor: '#1da1f2',
          backgroundColor: '#15202b',
          textColor: '#ffffff',
          fontFamily: 'Chirp, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['twitter', 'x', 'social'],
      },

      // ===== Event Templates =====
      {
        name: 'Event Registration',
        description: 'Event landing page with registration form',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'header', content: { eventName: 'Event Name', date: '', location: '' }, order: 0 },
          { id: '2', type: 'countdown', content: { targetDate: '' }, order: 1 },
          { id: '3', type: 'details', content: { description: '' }, order: 2 },
          { id: '4', type: 'form', content: { fields: ['name', 'email'] }, order: 3 },
        ],
        theme: {
          primaryColor: '#f39c12',
          backgroundColor: '#2c3e50',
          textColor: '#ecf0f1',
          fontFamily: 'Roboto, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['event', 'registration', 'countdown'],
      },
      {
        name: 'Wedding Invitation',
        description: 'Elegant wedding invitation and RSVP page',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'header', content: { title: '', names: '', date: '', style: 'elegant' }, order: 0 },
          { id: '2', type: 'story', content: { text: '', photos: [] }, order: 1 },
          { id: '3', type: 'event-details', content: { ceremony: '', reception: '' }, order: 2 },
          { id: '4', type: 'rsvp-form', content: { fields: [], deadline: '' }, order: 3 },
          { id: '5', type: 'registry', content: { links: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#d4af37',
          backgroundColor: '#fefefe',
          textColor: '#2c2c2c',
          fontFamily: 'Great Vibes, cursive',
          buttonStyle: 'outline',
          layout: 'centered',
        },
        tags: ['wedding', 'invitation', 'rsvp'],
      },
      {
        name: 'Conference',
        description: 'Professional conference or summit page',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'hero', content: { title: '', date: '', location: '', style: 'conference' }, order: 0 },
          { id: '2', type: 'speakers', content: { speakers: [] }, order: 1 },
          { id: '3', type: 'schedule', content: { days: [] }, order: 2 },
          { id: '4', type: 'sponsors', content: { tiers: [] }, order: 3 },
          { id: '5', type: 'tickets', content: { types: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#4a90d9',
          backgroundColor: '#f8f9fa',
          textColor: '#212529',
          fontFamily: 'Source Sans Pro, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['conference', 'summit', 'professional'],
      },
      {
        name: 'Party Invitation',
        description: 'Fun and colorful party invitation',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'header', content: { title: '', style: 'party' }, order: 0 },
          { id: '2', type: 'countdown', content: { targetDate: '', style: 'fun' }, order: 1 },
          { id: '3', type: 'details', content: { when: '', where: '', dress_code: '' }, order: 2 },
          { id: '4', type: 'rsvp', content: { options: ['Yes', 'No', 'Maybe'] }, order: 3 },
        ],
        theme: {
          primaryColor: '#ff6b6b',
          backgroundColor: '#4ecdc4',
          textColor: '#ffffff',
          fontFamily: 'Fredoka One, cursive',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['party', 'celebration', 'fun'],
      },

      // ===== Additional Personal Templates =====
      {
        name: 'Neon Glow',
        description: 'Vibrant neon effects on dark background',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'neon' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'neon-border' }, order: 1 },
          { id: '3', type: 'social', content: { networks: [], style: 'glow' }, order: 2 },
        ],
        theme: {
          primaryColor: '#00ffff',
          backgroundColor: '#0a0a0a',
          textColor: '#ffffff',
          fontFamily: 'Orbitron, sans-serif',
          buttonStyle: 'neon',
          layout: 'centered',
        },
        tags: ['neon', 'cyberpunk', 'glow'],
      },
      {
        name: 'Pastel Dream',
        description: 'Soft pastel colors with rounded elements',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'soft' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'pill' }, order: 1 },
          { id: '3', type: 'social', content: { networks: [] }, order: 2 },
        ],
        theme: {
          primaryColor: '#ffb6c1',
          backgroundColor: '#fff0f5',
          textColor: '#5a4a42',
          fontFamily: 'Quicksand, sans-serif',
          buttonStyle: 'pill',
          layout: 'centered',
        },
        tags: ['pastel', 'cute', 'soft'],
      },
      {
        name: 'Gradient Wave',
        description: 'Beautiful gradient background with wave effects',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'transparent' }, order: 1 },
        ],
        theme: {
          primaryColor: '#667eea',
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: '#ffffff',
          fontFamily: 'Nunito, sans-serif',
          buttonStyle: 'glass',
          layout: 'centered',
        },
        tags: ['gradient', 'colorful', 'modern'],
      },
      {
        name: 'Vintage Retro',
        description: 'Nostalgic retro design with warm tones',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'retro' }, order: 0 },
          { id: '2', type: 'divider', content: { style: 'vintage' }, order: 1 },
          { id: '3', type: 'links', content: { links: [], style: 'retro' }, order: 2 },
        ],
        theme: {
          primaryColor: '#d4a574',
          backgroundColor: '#f4e4c1',
          textColor: '#5c4033',
          fontFamily: 'Courier New, monospace',
          buttonStyle: 'retro',
          layout: 'centered',
        },
        tags: ['vintage', 'retro', 'nostalgic'],
      },
      {
        name: 'Japanese Minimal',
        description: 'Zen-inspired minimalist design',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'zen' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'minimal-line' }, order: 1 },
        ],
        theme: {
          primaryColor: '#c41e3a',
          backgroundColor: '#f5f5f0',
          textColor: '#333333',
          fontFamily: 'Noto Sans JP, sans-serif',
          buttonStyle: 'underline',
          layout: 'centered',
        },
        tags: ['japanese', 'zen', 'minimal'],
      },
      {
        name: 'Nature Lover',
        description: 'Earthy tones inspired by nature',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'leaf' }, order: 1 },
          { id: '3', type: 'social', content: { networks: [] }, order: 2 },
        ],
        theme: {
          primaryColor: '#2d5a27',
          backgroundColor: '#e8f5e9',
          textColor: '#1b5e20',
          fontFamily: 'Merriweather, serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['nature', 'green', 'eco'],
      },
      {
        name: 'Glassmorphism',
        description: 'Modern frosted glass effect design',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'glass' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: 'glass' }, order: 1 },
        ],
        theme: {
          primaryColor: '#ffffff',
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'glass',
          layout: 'centered',
        },
        tags: ['glass', 'modern', 'blur'],
      },
      {
        name: '3D Card',
        description: '3D card effect with depth and shadows',
        category: TemplateCategory.PERSONAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: '3d' }, order: 0 },
          { id: '2', type: 'links', content: { links: [], style: '3d-card' }, order: 1 },
        ],
        theme: {
          primaryColor: '#5c6bc0',
          backgroundColor: '#e8eaf6',
          textColor: '#303f9f',
          fontFamily: 'Roboto, sans-serif',
          buttonStyle: '3d',
          layout: 'centered',
        },
        tags: ['3d', 'depth', 'shadow'],
      },

      // ===== Additional Creative Templates =====
      {
        name: 'Photographer',
        description: 'Elegant portfolio for photographers',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.PORTFOLIO,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'hero', content: { backgroundImage: '', title: '', style: 'fullscreen' }, order: 0 },
          { id: '2', type: 'gallery', content: { images: [], layout: 'justified' }, order: 1 },
          { id: '3', type: 'about', content: { text: '', image: '' }, order: 2 },
          { id: '4', type: 'services', content: { items: [] }, order: 3 },
          { id: '5', type: 'contact', content: { email: '', form: true }, order: 4 },
        ],
        theme: {
          primaryColor: '#ffffff',
          backgroundColor: '#111111',
          textColor: '#ffffff',
          fontFamily: 'Playfair Display, serif',
          buttonStyle: 'outline',
          layout: 'fullwidth',
        },
        tags: ['photography', 'portfolio', 'elegant'],
      },
      {
        name: 'Designer Portfolio',
        description: 'Modern portfolio for UI/UX designers',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.PORTFOLIO,
        blocks: [
          { id: '1', type: 'header', content: { name: '', title: '', avatar: '' }, order: 0 },
          { id: '2', type: 'projects', content: { items: [], layout: 'cards' }, order: 1 },
          { id: '3', type: 'skills', content: { categories: [] }, order: 2 },
          { id: '4', type: 'testimonials', content: { items: [] }, order: 3 },
          { id: '5', type: 'contact', content: { email: '' }, order: 4 },
        ],
        theme: {
          primaryColor: '#0066ff',
          backgroundColor: '#ffffff',
          textColor: '#111111',
          fontFamily: 'DM Sans, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['design', 'portfolio', 'ux'],
      },
      {
        name: 'Writer/Author',
        description: 'Bio page for writers and authors',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'author' }, order: 0 },
          { id: '2', type: 'featured-book', content: { cover: '', title: '', buyLink: '' }, order: 1 },
          { id: '3', type: 'books', content: { items: [] }, order: 2 },
          { id: '4', type: 'newsletter', content: { text: '', provider: '' }, order: 3 },
          { id: '5', type: 'social', content: { networks: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#8b4513',
          backgroundColor: '#faf8f5',
          textColor: '#333333',
          fontFamily: 'Merriweather, serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['writer', 'author', 'books'],
      },
      {
        name: 'Podcast Host',
        description: 'Bio link for podcast creators',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', podcastName: '' }, order: 0 },
          { id: '2', type: 'podcast-player', content: { feedUrl: '', latestEpisodes: 3 }, order: 1 },
          { id: '3', type: 'subscribe-buttons', content: { platforms: [] }, order: 2 },
          { id: '4', type: 'sponsors', content: { items: [] }, order: 3 },
          { id: '5', type: 'links', content: { links: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#9b51e0',
          backgroundColor: '#1a1a2e',
          textColor: '#ffffff',
          fontFamily: 'Rubik, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['podcast', 'audio', 'creator'],
      },
      {
        name: 'DJ/Producer',
        description: 'Electronic music producer bio page',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'dj' }, order: 0 },
          { id: '2', type: 'soundcloud-player', content: { embedUrl: '' }, order: 1 },
          { id: '3', type: 'streaming-links', content: { platforms: [] }, order: 2 },
          { id: '4', type: 'tour-dates', content: { events: [] }, order: 3 },
          { id: '5', type: 'merch', content: { items: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#ff4081',
          backgroundColor: '#0d0d0d',
          textColor: '#ffffff',
          fontFamily: 'Bebas Neue, sans-serif',
          buttonStyle: 'neon',
          layout: 'centered',
        },
        tags: ['dj', 'music', 'electronic'],
      },
      {
        name: 'Streamer',
        description: 'Bio link for Twitch/YouTube streamers',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'gaming' }, order: 0 },
          { id: '2', type: 'live-status', content: { twitchUsername: '' }, order: 1 },
          { id: '3', type: 'stream-schedule', content: { schedule: [] }, order: 2 },
          { id: '4', type: 'links', content: { links: [], style: 'gaming' }, order: 3 },
          { id: '5', type: 'donation-button', content: { platforms: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#9147ff',
          backgroundColor: '#18181b',
          textColor: '#efeff1',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['streaming', 'gaming', 'twitch'],
      },
      {
        name: 'Fitness Influencer',
        description: 'Bio page for fitness content creators',
        category: TemplateCategory.CREATIVE,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'fitness' }, order: 0 },
          { id: '2', type: 'workout-preview', content: { videoUrl: '' }, order: 1 },
          { id: '3', type: 'programs', content: { items: [] }, order: 2 },
          { id: '4', type: 'links', content: { links: [] }, order: 3 },
          { id: '5', type: 'social', content: { networks: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#ff5722',
          backgroundColor: '#1c1c1c',
          textColor: '#ffffff',
          fontFamily: 'Oswald, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['fitness', 'health', 'workout'],
      },

      // ===== Additional Business Templates =====
      {
        name: 'Real Estate Agent',
        description: 'Professional page for real estate agents',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.CONTACT,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', title: '', photo: '', license: '' }, order: 0 },
          { id: '2', type: 'featured-listings', content: { properties: [] }, order: 1 },
          { id: '3', type: 'services', content: { items: [] }, order: 2 },
          { id: '4', type: 'testimonials', content: { reviews: [] }, order: 3 },
          { id: '5', type: 'contact', content: { phone: '', email: '', form: true }, order: 4 },
        ],
        theme: {
          primaryColor: '#1a237e',
          backgroundColor: '#ffffff',
          textColor: '#37474f',
          fontFamily: 'Montserrat, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['real-estate', 'agent', 'property'],
      },
      {
        name: 'Law Firm',
        description: 'Professional landing page for attorneys',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', style: 'professional' }, order: 0 },
          { id: '2', type: 'practice-areas', content: { areas: [] }, order: 1 },
          { id: '3', type: 'attorneys', content: { team: [] }, order: 2 },
          { id: '4', type: 'testimonials', content: { reviews: [] }, order: 3 },
          { id: '5', type: 'contact', content: { form: true, phone: '' }, order: 4 },
        ],
        theme: {
          primaryColor: '#8b0000',
          backgroundColor: '#f5f5f5',
          textColor: '#1a1a1a',
          fontFamily: 'Playfair Display, serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['law', 'attorney', 'legal'],
      },
      {
        name: 'Salon & Spa',
        description: 'Elegant page for beauty salons and spas',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.MENU,
        blocks: [
          { id: '1', type: 'header', content: { logo: '', tagline: '' }, order: 0 },
          { id: '2', type: 'hero', content: { image: '', style: 'elegant' }, order: 1 },
          { id: '3', type: 'services-menu', content: { categories: [] }, order: 2 },
          { id: '4', type: 'booking-button', content: { url: '', text: 'Book Now' }, order: 3 },
          { id: '5', type: 'gallery', content: { images: [] }, order: 4 },
          { id: '6', type: 'reviews', content: { items: [] }, order: 5 },
        ],
        theme: {
          primaryColor: '#c9a959',
          backgroundColor: '#fdfcfb',
          textColor: '#333333',
          fontFamily: 'Cormorant, serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['salon', 'spa', 'beauty'],
      },
      {
        name: 'Fitness Gym',
        description: 'Landing page for gyms and fitness centers',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', video: '', style: 'bold' }, order: 0 },
          { id: '2', type: 'membership', content: { plans: [] }, order: 1 },
          { id: '3', type: 'classes', content: { schedule: [] }, order: 2 },
          { id: '4', type: 'trainers', content: { team: [] }, order: 3 },
          { id: '5', type: 'cta', content: { text: 'Start Free Trial' }, order: 4 },
        ],
        theme: {
          primaryColor: '#f44336',
          backgroundColor: '#212121',
          textColor: '#ffffff',
          fontFamily: 'Anton, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['gym', 'fitness', 'workout'],
      },
      {
        name: 'Consulting Agency',
        description: 'Professional B2B consulting page',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', subheadline: '', style: 'corporate' }, order: 0 },
          { id: '2', type: 'services', content: { items: [] }, order: 1 },
          { id: '3', type: 'case-studies', content: { items: [] }, order: 2 },
          { id: '4', type: 'team', content: { members: [] }, order: 3 },
          { id: '5', type: 'contact-form', content: { fields: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#0d47a1',
          backgroundColor: '#ffffff',
          textColor: '#263238',
          fontFamily: 'IBM Plex Sans, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['consulting', 'b2b', 'corporate'],
      },
      {
        name: 'Food Truck',
        description: 'Menu and location page for food trucks',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.MENU,
        blocks: [
          { id: '1', type: 'header', content: { logo: '', tagline: '', style: 'fun' }, order: 0 },
          { id: '2', type: 'location', content: { schedule: [], map: true }, order: 1 },
          { id: '3', type: 'menu', content: { items: [], style: 'fun' }, order: 2 },
          { id: '4', type: 'social', content: { networks: [] }, order: 3 },
        ],
        theme: {
          primaryColor: '#ff9800',
          backgroundColor: '#fff3e0',
          textColor: '#5d4037',
          fontFamily: 'Bangers, cursive',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['food-truck', 'food', 'mobile'],
      },
      {
        name: 'Pet Services',
        description: 'Page for pet grooming, walking, and care',
        category: TemplateCategory.BUSINESS,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', image: '', style: 'friendly' }, order: 0 },
          { id: '2', type: 'services', content: { items: [] }, order: 1 },
          { id: '3', type: 'pricing', content: { packages: [] }, order: 2 },
          { id: '4', type: 'gallery', content: { images: [], caption: 'Happy Pets' }, order: 3 },
          { id: '5', type: 'booking', content: { url: '' }, order: 4 },
        ],
        theme: {
          primaryColor: '#4caf50',
          backgroundColor: '#e8f5e9',
          textColor: '#33691e',
          fontFamily: 'Nunito, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['pets', 'grooming', 'services'],
      },

      // ===== Additional Social Templates =====
      {
        name: 'LinkedIn Pro',
        description: 'Professional link page styled for LinkedIn',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', title: '', company: '' }, order: 0 },
          { id: '2', type: 'about', content: { summary: '' }, order: 1 },
          { id: '3', type: 'links', content: { links: [], style: 'professional' }, order: 2 },
          { id: '4', type: 'resume', content: { downloadUrl: '' }, order: 3 },
        ],
        theme: {
          primaryColor: '#0077b5',
          backgroundColor: '#f3f2ef',
          textColor: '#1d2226',
          fontFamily: '-apple-system, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['linkedin', 'professional', 'career'],
      },
      {
        name: 'Pinterest Creator',
        description: 'Bio link for Pinterest content creators',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { avatar: '', name: '' }, order: 0 },
          { id: '2', type: 'pinterest-boards', content: { username: '', boards: [] }, order: 1 },
          { id: '3', type: 'links', content: { links: [], style: 'pinterest' }, order: 2 },
        ],
        theme: {
          primaryColor: '#e60023',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          fontFamily: 'Helvetica Neue, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['pinterest', 'visual', 'boards'],
      },
      {
        name: 'Discord Community',
        description: 'Link page for Discord server admins',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { serverName: '', memberCount: '' }, order: 0 },
          { id: '2', type: 'discord-widget', content: { serverId: '' }, order: 1 },
          { id: '3', type: 'rules', content: { items: [] }, order: 2 },
          { id: '4', type: 'join-button', content: { inviteUrl: '' }, order: 3 },
        ],
        theme: {
          primaryColor: '#5865f2',
          backgroundColor: '#36393f',
          textColor: '#dcddde',
          fontFamily: 'gg sans, sans-serif',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['discord', 'community', 'gaming'],
      },
      {
        name: 'Twitch Streamer',
        description: 'Bio page for Twitch streamers',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        blocks: [
          { id: '1', type: 'profile', content: { username: '', avatar: '' }, order: 0 },
          { id: '2', type: 'twitch-live', content: { channel: '' }, order: 1 },
          { id: '3', type: 'schedule', content: { times: [] }, order: 2 },
          { id: '4', type: 'links', content: { links: [], style: 'twitch' }, order: 3 },
        ],
        theme: {
          primaryColor: '#9147ff',
          backgroundColor: '#0e0e10',
          textColor: '#efeff1',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['twitch', 'streaming', 'live'],
      },
      {
        name: 'OnlyFans Creator',
        description: 'Bio link for content subscription creators',
        category: TemplateCategory.SOCIAL,
        type: TemplateType.LINK_IN_BIO,
        isPremium: true,
        blocks: [
          { id: '1', type: 'profile', content: { name: '', bio: '', style: 'premium' }, order: 0 },
          { id: '2', type: 'preview-gallery', content: { images: [] }, order: 1 },
          { id: '3', type: 'subscribe-button', content: { url: '', price: '' }, order: 2 },
          { id: '4', type: 'social', content: { networks: [] }, order: 3 },
        ],
        theme: {
          primaryColor: '#00aff0',
          backgroundColor: '#0d0d0d',
          textColor: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'gradient',
          layout: 'centered',
        },
        tags: ['creator', 'subscription', 'premium'],
      },

      // ===== Additional Event Templates =====
      {
        name: 'Birthday Party',
        description: 'Fun birthday party invitation',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'header', content: { celebrant: '', age: '', style: 'birthday' }, order: 0 },
          { id: '2', type: 'countdown', content: { date: '' }, order: 1 },
          { id: '3', type: 'details', content: { when: '', where: '', theme: '' }, order: 2 },
          { id: '4', type: 'wishlist', content: { items: [] }, order: 3 },
          { id: '5', type: 'rsvp', content: { form: true }, order: 4 },
        ],
        theme: {
          primaryColor: '#ff69b4',
          backgroundColor: '#fff0f5',
          textColor: '#8b008b',
          fontFamily: 'Comic Sans MS, cursive',
          buttonStyle: 'rounded',
          layout: 'centered',
        },
        tags: ['birthday', 'party', 'celebration'],
      },
      {
        name: 'Baby Shower',
        description: 'Sweet baby shower invitation page',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'header', content: { parents: '', babyName: '', style: 'baby' }, order: 0 },
          { id: '2', type: 'details', content: { date: '', location: '', style: 'soft' }, order: 1 },
          { id: '3', type: 'registry', content: { links: [] }, order: 2 },
          { id: '4', type: 'rsvp', content: { deadline: '' }, order: 3 },
        ],
        theme: {
          primaryColor: '#87ceeb',
          backgroundColor: '#fffaf0',
          textColor: '#696969',
          fontFamily: 'Sacramento, cursive',
          buttonStyle: 'pill',
          layout: 'centered',
        },
        tags: ['baby-shower', 'baby', 'celebration'],
      },
      {
        name: 'Networking Event',
        description: 'Professional networking mixer page',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'hero', content: { title: '', subtitle: '', style: 'corporate' }, order: 0 },
          { id: '2', type: 'agenda', content: { items: [] }, order: 1 },
          { id: '3', type: 'speakers', content: { featured: [] }, order: 2 },
          { id: '4', type: 'registration', content: { form: true, tickets: [] }, order: 3 },
          { id: '5', type: 'sponsors', content: { logos: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#1565c0',
          backgroundColor: '#ffffff',
          textColor: '#212121',
          fontFamily: 'Roboto, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['networking', 'professional', 'mixer'],
      },
      {
        name: 'Music Festival',
        description: 'Vibrant page for music festivals',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'hero', content: { title: '', dates: '', style: 'festival' }, order: 0 },
          { id: '2', type: 'lineup', content: { days: [] }, order: 1 },
          { id: '3', type: 'tickets', content: { tiers: [] }, order: 2 },
          { id: '4', type: 'venue-info', content: { map: '', info: '' }, order: 3 },
          { id: '5', type: 'gallery', content: { images: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#ff1493',
          backgroundColor: '#000000',
          textColor: '#ffffff',
          fontFamily: 'Righteous, cursive',
          buttonStyle: 'gradient',
          layout: 'fullwidth',
        },
        tags: ['festival', 'music', 'concert'],
      },
      {
        name: 'Workshop/Class',
        description: 'Registration page for workshops and classes',
        category: TemplateCategory.EVENT,
        type: TemplateType.EVENT,
        blocks: [
          { id: '1', type: 'header', content: { title: '', instructor: '' }, order: 0 },
          { id: '2', type: 'description', content: { text: '', outcomes: [] }, order: 1 },
          { id: '3', type: 'schedule', content: { sessions: [] }, order: 2 },
          { id: '4', type: 'pricing', content: { options: [] }, order: 3 },
          { id: '5', type: 'registration', content: { form: true }, order: 4 },
        ],
        theme: {
          primaryColor: '#00897b',
          backgroundColor: '#e0f2f1',
          textColor: '#004d40',
          fontFamily: 'Lato, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['workshop', 'class', 'education'],
      },

      // ===== Additional Product Templates =====
      {
        name: 'SaaS Product',
        description: 'Feature-rich SaaS product landing page',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        isFeatured: true,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', demo_video: '', cta: '' }, order: 0 },
          { id: '2', type: 'social-proof', content: { logos: [], stats: [] }, order: 1 },
          { id: '3', type: 'features', content: { items: [], style: 'bento' }, order: 2 },
          { id: '4', type: 'pricing', content: { plans: [], toggle: true }, order: 3 },
          { id: '5', type: 'faq', content: { items: [] }, order: 4 },
          { id: '6', type: 'cta', content: { headline: '', button: '' }, order: 5 },
        ],
        theme: {
          primaryColor: '#7c3aed',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'rounded',
          layout: 'fullwidth',
        },
        tags: ['saas', 'software', 'product'],
      },
      {
        name: 'Course Launch',
        description: 'Landing page for online courses',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { headline: '', instructor: '', video: '' }, order: 0 },
          { id: '2', type: 'benefits', content: { items: [] }, order: 1 },
          { id: '3', type: 'curriculum', content: { modules: [] }, order: 2 },
          { id: '4', type: 'instructor', content: { bio: '', credentials: [] }, order: 3 },
          { id: '5', type: 'testimonials', content: { students: [] }, order: 4 },
          { id: '6', type: 'pricing', content: { options: [], guarantee: '' }, order: 5 },
        ],
        theme: {
          primaryColor: '#f59e0b',
          backgroundColor: '#fffbeb',
          textColor: '#78350f',
          fontFamily: 'Nunito Sans, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['course', 'education', 'online'],
      },
      {
        name: 'Book Launch',
        description: 'Landing page for book releases',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { cover: '', title: '', author: '' }, order: 0 },
          { id: '2', type: 'synopsis', content: { text: '' }, order: 1 },
          { id: '3', type: 'author', content: { bio: '', photo: '' }, order: 2 },
          { id: '4', type: 'reviews', content: { items: [] }, order: 3 },
          { id: '5', type: 'buy-options', content: { retailers: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#2d3748',
          backgroundColor: '#f7fafc',
          textColor: '#1a202c',
          fontFamily: 'Georgia, serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['book', 'author', 'launch'],
      },
      {
        name: 'Crowdfunding Campaign',
        description: 'Page for Kickstarter-style campaigns',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'hero', content: { video: '', headline: '' }, order: 0 },
          { id: '2', type: 'progress', content: { goal: '', raised: '', backers: '' }, order: 1 },
          { id: '3', type: 'description', content: { story: '' }, order: 2 },
          { id: '4', type: 'rewards', content: { tiers: [] }, order: 3 },
          { id: '5', type: 'updates', content: { items: [] }, order: 4 },
          { id: '6', type: 'faq', content: { items: [] }, order: 5 },
        ],
        theme: {
          primaryColor: '#05ce78',
          backgroundColor: '#ffffff',
          textColor: '#282828',
          fontFamily: 'Barlow, sans-serif',
          buttonStyle: 'solid',
          layout: 'fullwidth',
        },
        tags: ['crowdfunding', 'kickstarter', 'campaign'],
      },
      {
        name: 'Newsletter',
        description: 'Subscribe page for newsletter signups',
        category: TemplateCategory.PRODUCT,
        type: TemplateType.LANDING,
        blocks: [
          { id: '1', type: 'header', content: { logo: '', name: '' }, order: 0 },
          { id: '2', type: 'hero', content: { headline: '', subheadline: '' }, order: 1 },
          { id: '3', type: 'benefits', content: { items: [] }, order: 2 },
          { id: '4', type: 'subscribe-form', content: { provider: '', fields: [] }, order: 3 },
          { id: '5', type: 'past-issues', content: { samples: [] }, order: 4 },
        ],
        theme: {
          primaryColor: '#6366f1',
          backgroundColor: '#f8fafc',
          textColor: '#334155',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'solid',
          layout: 'centered',
        },
        tags: ['newsletter', 'subscribe', 'email'],
      },
    ];

    for (const templateData of defaultTemplates) {
      const template = this.templateRepository.create(templateData);
      await this.templateRepository.save(template);
    }

    console.log(`Seeded ${defaultTemplates.length} default templates`);
  }
}
