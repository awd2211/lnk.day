import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';

import {
  BioLink,
  BioLinkItem,
  BioLinkClick,
  BioLinkSubscriber,
  BioLinkContact,
  BioLinkStatus,
} from './entities/bio-link.entity';
import {
  CreateBioLinkDto,
  UpdateBioLinkDto,
  CreateBioLinkItemDto,
  UpdateBioLinkItemDto,
  BioLinkAnalyticsDto,
} from './dto/bio-link.dto';
import { PageEventService } from '../../common/rabbitmq/page-event.service';

@Injectable()
export class BioLinkService {
  private readonly logger = new Logger(BioLinkService.name);

  constructor(
    @InjectRepository(BioLink)
    private readonly bioLinkRepository: Repository<BioLink>,
    @InjectRepository(BioLinkItem)
    private readonly bioLinkItemRepository: Repository<BioLinkItem>,
    @InjectRepository(BioLinkClick)
    private readonly bioLinkClickRepository: Repository<BioLinkClick>,
    @InjectRepository(BioLinkSubscriber)
    private readonly subscriberRepository: Repository<BioLinkSubscriber>,
    @InjectRepository(BioLinkContact)
    private readonly contactRepository: Repository<BioLinkContact>,
    private readonly pageEventService: PageEventService,
  ) {}

  // ==================== Bio Link CRUD ====================

  async create(
    dto: CreateBioLinkDto,
    userId: string,
    teamId: string,
  ): Promise<BioLink> {
    // Check if username is available
    const existing = await this.bioLinkRepository.findOne({
      where: { username: dto.username.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const bioLink = this.bioLinkRepository.create({
      ...dto,
      username: dto.username.toLowerCase(),
      userId,
      teamId,
      // Cast theme to entity type (DTO allows flexible strings, entity has strict types)
      theme: dto.theme as any,
    });

    const savedBioLink = await this.bioLinkRepository.save(bioLink);

    // Publish bio link created event
    await this.pageEventService.publishBioLinkCreated({
      bioLinkId: savedBioLink.id,
      username: savedBioLink.username,
      userId: savedBioLink.userId,
      teamId: savedBioLink.teamId,
    });

    return savedBioLink as BioLink;
  }

  async findAll(
    teamId: string,
    options?: {
      status?: BioLinkStatus;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      search?: string;
    },
  ): Promise<{ items: Array<BioLink & { blocks: BioLinkItem[]; analytics?: { views: number; clicks: number } }>; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Math.min(Number(options?.limit) || 20, 100);
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';

    const queryBuilder = this.bioLinkRepository.createQueryBuilder('bioLink');

    // Team filter
    queryBuilder.where('bioLink.teamId = :teamId', { teamId });

    // Status filter
    if (options?.status) {
      queryBuilder.andWhere('bioLink.status = :status', { status: options.status });
    }

    // Search
    if (options?.search) {
      queryBuilder.andWhere(
        '(bioLink.title ILIKE :search OR bioLink.username ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // Sorting (whitelist allowed fields)
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'totalViews', 'totalClicks', 'username'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`bioLink.${safeSortBy}`, safeSortOrder);

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [bioLinks, total] = await queryBuilder.getManyAndCount();

    // Attach blocks and analytics for each bio link
    const items = await Promise.all(
      bioLinks.map(async (bioLink) => {
        const blocks = await this.getItems(bioLink.id);
        return {
          ...bioLink,
          blocks,
          analytics: {
            views: bioLink.totalViews,
            clicks: bioLink.totalClicks,
          },
        };
      }),
    );

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<BioLink & { blocks: BioLinkItem[] }> {
    const bioLink = await this.bioLinkRepository.findOne({ where: { id } });
    if (!bioLink) {
      throw new NotFoundException('Bio link not found');
    }
    // Fetch items and attach as blocks for frontend compatibility
    const items = await this.getItems(id);
    return {
      ...bioLink,
      blocks: items,
    };
  }

  async findByUsername(username: string): Promise<BioLink> {
    const bioLink = await this.bioLinkRepository.findOne({
      where: { username: username.toLowerCase() },
    });
    if (!bioLink) {
      throw new NotFoundException('Bio link not found');
    }
    return bioLink;
  }

  async update(
    id: string,
    dto: UpdateBioLinkDto,
    userId: string,
    teamId: string,
  ): Promise<BioLink & { blocks: BioLinkItem[] }> {
    const bioLink = await this.findOne(id);

    if (bioLink.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }

    // Handle blocks separately - save them to BioLinkItem table
    const { blocks, ...bioLinkData } = dto as any;

    // Update profile based on description and avatarUrl
    if (bioLinkData.description !== undefined || bioLinkData.avatarUrl !== undefined) {
      bioLink.profile = {
        ...bioLink.profile,
        bio: bioLinkData.description ?? bioLink.profile?.bio,
        avatarUrl: bioLinkData.avatarUrl ?? bioLink.profile?.avatarUrl,
      };
      delete bioLinkData.description;
      delete bioLinkData.avatarUrl;
    }

    // Handle isPublished -> status conversion
    if (bioLinkData.isPublished !== undefined) {
      bioLink.status = bioLinkData.isPublished ? BioLinkStatus.PUBLISHED : BioLinkStatus.DRAFT;
      if (bioLinkData.isPublished && !bioLink.publishedAt) {
        bioLink.publishedAt = new Date();
      }
      delete bioLinkData.isPublished;
    }

    // Update other bio link fields
    Object.assign(bioLink, bioLinkData);
    const savedBioLink = await this.bioLinkRepository.save(bioLink);

    // If blocks are provided, sync them with the items table
    if (blocks && Array.isArray(blocks)) {
      await this.syncBlocks(id, blocks);
    }

    // Return with blocks
    const updatedBlocks = await this.getItems(id);
    return {
      ...savedBioLink,
      blocks: updatedBlocks,
    };
  }

  // Sync blocks from frontend to BioLinkItem table
  private async syncBlocks(bioLinkId: string, blocks: any[]): Promise<void> {
    const existingItems = await this.bioLinkItemRepository.find({
      where: { bioLinkId },
    });

    const existingIds = new Set(existingItems.map((item) => item.id));
    const incomingIds = new Set(blocks.filter((b) => b.id).map((b) => b.id));

    // Delete items that are not in the incoming blocks
    const toDelete = existingItems.filter((item) => !incomingIds.has(item.id));
    if (toDelete.length > 0) {
      await this.bioLinkItemRepository.remove(toDelete);
    }

    // Update or create items
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const itemData = {
        bioLinkId,
        type: block.type || 'link',
        title: block.title || '',
        url: block.url,
        description: block.description,
        thumbnailUrl: block.thumbnailUrl,
        visible: block.isVisible ?? true,
        order: block.sortOrder ?? i,
        style: block.style || {},
        settings: block.settings || {},
        embed: block.embed,
        product: block.product,
        content: block.content,
        carousel: block.carousel,
        countdown: block.countdown,
        music: block.music,
        map: block.map,
        subscribe: block.subscribe,
        nft: block.nft,
        podcast: block.podcast,
        text: block.text,
        image: block.image,
        video: block.video,
        contactForm: block.contactForm,
      };

      // Check if ID is a valid UUID (for existing items) or a temp ID (for new items)
      const isValidUuid = block.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(block.id);

      if (isValidUuid && existingIds.has(block.id)) {
        // Update existing item
        await this.bioLinkItemRepository.update(block.id, itemData);
      } else {
        // Create new item without specifying ID (let database generate it)
        const newItem = this.bioLinkItemRepository.create(itemData);
        await this.bioLinkItemRepository.save(newItem);
      }
    }
  }

  async remove(id: string, teamId: string): Promise<void> {
    const bioLink = await this.findOne(id);

    if (bioLink.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }

    // Delete all items and clicks
    await this.bioLinkItemRepository.delete({ bioLinkId: id });
    await this.bioLinkClickRepository.delete({ bioLinkId: id });
    await this.bioLinkRepository.remove(bioLink);
  }

  async publish(id: string, teamId: string): Promise<BioLink> {
    const bioLink = await this.findOne(id);

    if (bioLink.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }

    bioLink.status = BioLinkStatus.PUBLISHED;
    bioLink.publishedAt = new Date();
    return this.bioLinkRepository.save(bioLink);
  }

  async unpublish(id: string, teamId: string): Promise<BioLink> {
    const bioLink = await this.findOne(id);

    if (bioLink.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }

    bioLink.status = BioLinkStatus.DRAFT;
    return this.bioLinkRepository.save(bioLink);
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const existing = await this.bioLinkRepository.findOne({
      where: { username: username.toLowerCase() },
    });
    return !existing;
  }

  // ==================== Bio Link Items ====================

  async getItems(bioLinkId: string): Promise<BioLinkItem[]> {
    return this.bioLinkItemRepository.find({
      where: { bioLinkId },
      order: { order: 'ASC' },
    });
  }

  async getVisibleItems(bioLinkId: string): Promise<BioLinkItem[]> {
    const now = new Date();
    const items = await this.bioLinkItemRepository.find({
      where: { bioLinkId, visible: true },
      order: { order: 'ASC' },
    });

    // Filter by schedule
    return items.filter((item) => {
      if (item.settings.scheduleStart) {
        const start = new Date(item.settings.scheduleStart);
        if (now < start) return false;
      }
      if (item.settings.scheduleEnd) {
        const end = new Date(item.settings.scheduleEnd);
        if (now > end) return false;
      }
      return true;
    });
  }

  async addItem(
    bioLinkId: string,
    dto: CreateBioLinkItemDto,
  ): Promise<BioLinkItem> {
    // Get max order
    const maxOrderItem = await this.bioLinkItemRepository.findOne({
      where: { bioLinkId },
      order: { order: 'DESC' },
    });

    const item = this.bioLinkItemRepository.create({
      ...dto,
      bioLinkId,
      order: (maxOrderItem?.order ?? -1) + 1,
    });

    return this.bioLinkItemRepository.save(item);
  }

  async updateItem(
    itemId: string,
    dto: UpdateBioLinkItemDto,
  ): Promise<BioLinkItem> {
    const item = await this.bioLinkItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Link item not found');
    }

    Object.assign(item, dto);
    return this.bioLinkItemRepository.save(item);
  }

  async removeItem(itemId: string): Promise<void> {
    const item = await this.bioLinkItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Link item not found');
    }

    await this.bioLinkItemRepository.remove(item);
  }

  async reorderItems(
    bioLinkId: string,
    itemIds: string[],
  ): Promise<BioLinkItem[]> {
    const items = await this.bioLinkItemRepository.find({
      where: { bioLinkId },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const updates = itemIds.map((id, index) => {
      const item = itemMap.get(id);
      if (item) {
        item.order = index;
        return item;
      }
      return null;
    }).filter((i) => i !== null);

    return this.bioLinkItemRepository.save(updates);
  }

  async toggleItemVisibility(itemId: string): Promise<BioLinkItem> {
    const item = await this.bioLinkItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Link item not found');
    }

    item.visible = !item.visible;
    return this.bioLinkItemRepository.save(item);
  }

  async duplicateItem(itemId: string): Promise<BioLinkItem> {
    const original = await this.bioLinkItemRepository.findOne({
      where: { id: itemId },
    });

    if (!original) {
      throw new NotFoundException('Link item not found');
    }

    const { id, clicks, lastClickedAt, createdAt, updatedAt, ...data } = original;

    const duplicate = this.bioLinkItemRepository.create({
      ...data,
      title: `${data.title} (Copy)`,
      order: original.order + 1,
      clicks: 0,
    });

    return this.bioLinkItemRepository.save(duplicate);
  }

  // ==================== Analytics ====================

  async trackView(
    bioLinkId: string,
    data: {
      ip?: string;
      userAgent?: string;
      referer?: string;
      country?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
    },
  ): Promise<void> {
    const click = this.bioLinkClickRepository.create({
      bioLinkId,
      eventType: 'page_view',
      ...data,
      timestamp: new Date(),
    });

    await this.bioLinkClickRepository.save(click);

    // Update counters
    await this.bioLinkRepository.increment({ id: bioLinkId }, 'totalViews', 1);

    // Publish bio link viewed event
    const bioLink = await this.bioLinkRepository.findOne({ where: { id: bioLinkId } });
    if (bioLink) {
      await this.pageEventService.publishBioLinkViewed({
        bioLinkId,
        username: bioLink.username,
        ip: data.ip,
        userAgent: data.userAgent,
        country: data.country,
        city: data.city,
        referer: data.referer,
      });
    }
  }

  async trackClick(
    bioLinkId: string,
    itemId: string,
    data: {
      ip?: string;
      userAgent?: string;
      referer?: string;
      country?: string;
      deviceType?: string;
    },
  ): Promise<void> {
    const click = this.bioLinkClickRepository.create({
      bioLinkId,
      itemId,
      eventType: 'link_click',
      ...data,
      timestamp: new Date(),
    });

    await this.bioLinkClickRepository.save(click);

    // Update counters
    await this.bioLinkRepository.increment({ id: bioLinkId }, 'totalClicks', 1);
    await this.bioLinkItemRepository.increment({ id: itemId }, 'clicks', 1);
    await this.bioLinkItemRepository.update(itemId, {
      lastClickedAt: new Date(),
    });
  }

  async trackSocialClick(
    bioLinkId: string,
    platform: string,
    data: {
      ip?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const click = this.bioLinkClickRepository.create({
      bioLinkId,
      eventType: 'social_click',
      ...data,
      timestamp: new Date(),
    });

    await this.bioLinkClickRepository.save(click);
  }

  async getAnalytics(
    bioLinkId: string,
    days: number = 30,
  ): Promise<BioLinkAnalyticsDto> {
    const bioLink = await this.findOne(bioLinkId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get items
    const items = await this.getItems(bioLinkId);

    // Get clicks for the period
    const clicks = await this.bioLinkClickRepository.find({
      where: {
        bioLinkId,
        timestamp: MoreThanOrEqual(startDate),
      },
    });

    // Calculate top links
    const topLinks = items
      .map((item) => ({
        id: item.id,
        title: item.title,
        clicks: item.clicks,
        percentage: bioLink.totalClicks > 0
          ? (item.clicks / bioLink.totalClicks) * 100
          : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Calculate views by day
    const viewsByDayMap = new Map<string, { views: number; clicks: number }>();
    clicks.forEach((click) => {
      const date = click.timestamp.toISOString().split('T')[0] || '';
      const current = viewsByDayMap.get(date) || { views: 0, clicks: 0 };
      if (click.eventType === 'page_view') {
        current.views++;
      } else if (click.eventType === 'link_click') {
        current.clicks++;
      }
      viewsByDayMap.set(date, current);
    });

    const viewsByDay = Array.from(viewsByDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate top countries
    const countryMap = new Map<string, number>();
    clicks.forEach((click) => {
      if (click.country) {
        countryMap.set(click.country, (countryMap.get(click.country) || 0) + 1);
      }
    });

    const totalWithCountry = Array.from(countryMap.values()).reduce((a, b) => a + b, 0);
    const topCountries = Array.from(countryMap.entries())
      .map(([country, views]) => ({
        country,
        views,
        percentage: totalWithCountry > 0 ? (views / totalWithCountry) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Calculate device breakdown
    const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
    clicks.forEach((click) => {
      if (click.deviceType === 'desktop') deviceBreakdown.desktop++;
      else if (click.deviceType === 'mobile') deviceBreakdown.mobile++;
      else if (click.deviceType === 'tablet') deviceBreakdown.tablet++;
    });

    // Calculate top referrers
    const referrerMap = new Map<string, number>();
    clicks.forEach((click) => {
      if (click.referer) {
        try {
          const domain = new URL(click.referer).hostname;
          referrerMap.set(domain, (referrerMap.get(domain) || 0) + 1);
        } catch {
          // Invalid URL
        }
      }
    });

    const topReferrers = Array.from(referrerMap.entries())
      .map(([referrer, views]) => ({ referrer, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      totalViews: bioLink.totalViews,
      uniqueViews: bioLink.uniqueViews,
      totalClicks: bioLink.totalClicks,
      topLinks,
      viewsByDay,
      topCountries,
      deviceBreakdown,
      topReferrers,
    };
  }

  // ==================== Subscriptions ====================

  async addSubscriber(
    bioLinkId: string,
    itemId: string,
    data: {
      email: string;
      name?: string;
      phone?: string;
      ip?: string;
      userAgent?: string;
      country?: string;
    },
  ): Promise<BioLinkSubscriber> {
    // Check if already subscribed
    const existing = await this.subscriberRepository.findOne({
      where: { bioLinkId, email: data.email },
    });

    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Re-subscribe
        existing.status = 'pending';
        existing.unsubscribedAt = undefined;
        return this.subscriberRepository.save(existing);
      }
      // Already subscribed
      return existing;
    }

    const subscriber = this.subscriberRepository.create({
      bioLinkId,
      itemId,
      ...data,
      status: 'pending',
    });

    return this.subscriberRepository.save(subscriber);
  }

  async getSubscribers(
    bioLinkId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: 'pending' | 'confirmed' | 'unsubscribed';
    },
  ): Promise<{ items: BioLinkSubscriber[]; total: number }> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const queryBuilder = this.subscriberRepository.createQueryBuilder('subscriber');
    queryBuilder.where('subscriber.bioLinkId = :bioLinkId', { bioLinkId });

    if (options?.status) {
      queryBuilder.andWhere('subscriber.status = :status', { status: options.status });
    }

    queryBuilder.orderBy('subscriber.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async exportSubscribers(bioLinkId: string): Promise<BioLinkSubscriber[]> {
    return this.subscriberRepository.find({
      where: { bioLinkId },
      order: { createdAt: 'DESC' },
    });
  }

  async unsubscribe(bioLinkId: string, email: string): Promise<void> {
    const subscriber = await this.subscriberRepository.findOne({
      where: { bioLinkId, email },
    });

    if (subscriber) {
      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      await this.subscriberRepository.save(subscriber);
    }
  }

  // ==================== Contact Form ====================

  async submitContactForm(
    bioLinkId: string,
    itemId: string,
    data: {
      formData: Record<string, string>;
      ip?: string;
      userAgent?: string;
      country?: string;
    },
  ): Promise<BioLinkContact> {
    const contact = this.contactRepository.create({
      bioLinkId,
      itemId,
      formData: data.formData,
      ip: data.ip,
      userAgent: data.userAgent,
      country: data.country,
      status: 'new',
    });

    const saved = await this.contactRepository.save(contact);

    // TODO: Send notification email to bio link owner if configured
    // This can be implemented with notification-service integration

    return saved;
  }

  async getContactSubmissions(
    bioLinkId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: 'new' | 'read' | 'replied' | 'archived';
      itemId?: string;
    },
  ): Promise<{ items: BioLinkContact[]; total: number }> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const queryBuilder = this.contactRepository.createQueryBuilder('contact');
    queryBuilder.where('contact.bioLinkId = :bioLinkId', { bioLinkId });

    if (options?.status) {
      queryBuilder.andWhere('contact.status = :status', { status: options.status });
    }

    if (options?.itemId) {
      queryBuilder.andWhere('contact.itemId = :itemId', { itemId: options.itemId });
    }

    queryBuilder.orderBy('contact.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async updateContactStatus(
    contactId: string,
    status: 'new' | 'read' | 'replied' | 'archived',
  ): Promise<BioLinkContact> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('Contact submission not found');
    }

    contact.status = status;
    if (status === 'replied') {
      contact.repliedAt = new Date();
    }

    return this.contactRepository.save(contact);
  }

  async deleteContact(contactId: string): Promise<void> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('Contact submission not found');
    }

    await this.contactRepository.remove(contact);
  }

  // ==================== Public Page Rendering ====================

  async getPublicPage(username: string, isPreview = false): Promise<{
    bioLink: BioLink;
    items: BioLinkItem[];
  }> {
    const bioLink = await this.findByUsername(username);

    // 预览模式允许查看草稿，否则只能查看已发布的页面
    if (!isPreview && bioLink.status !== BioLinkStatus.PUBLISHED) {
      throw new NotFoundException('Page not found');
    }

    // Check if page is expired
    if (bioLink.settings.expiresAt) {
      const expiresAt = new Date(bioLink.settings.expiresAt);
      if (new Date() > expiresAt) {
        throw new NotFoundException('Page has expired');
      }
    }

    const items = await this.getVisibleItems(bioLink.id);

    // Sort: pinned first, then by order
    items.sort((a, b) => {
      if (a.settings.pinned && !b.settings.pinned) return -1;
      if (!a.settings.pinned && b.settings.pinned) return 1;
      return a.order - b.order;
    });

    return { bioLink, items };
  }
}
