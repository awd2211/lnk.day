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
    ];

    for (const templateData of defaultTemplates) {
      const template = this.templateRepository.create(templateData);
      await this.templateRepository.save(template);
    }

    console.log(`Seeded ${defaultTemplates.length} default templates`);
  }
}
