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
  BioLinkStatus,
} from './entities/bio-link.entity';
import {
  CreateBioLinkDto,
  UpdateBioLinkDto,
  CreateBioLinkItemDto,
  UpdateBioLinkItemDto,
  BioLinkAnalyticsDto,
} from './dto/bio-link.dto';

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
    });

    return this.bioLinkRepository.save(bioLink);
  }

  async findAll(
    teamId: string,
    options?: { status?: BioLinkStatus; page?: number; limit?: number },
  ): Promise<{ items: BioLink[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const where: any = { teamId };
    if (options?.status) {
      where.status = options.status;
    }

    const [items, total] = await this.bioLinkRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<BioLink> {
    const bioLink = await this.bioLinkRepository.findOne({ where: { id } });
    if (!bioLink) {
      throw new NotFoundException('Bio link not found');
    }
    return bioLink;
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
  ): Promise<BioLink> {
    const bioLink = await this.findOne(id);

    if (bioLink.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }

    Object.assign(bioLink, dto);
    return this.bioLinkRepository.save(bioLink);
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

  // ==================== Public Page Rendering ====================

  async getPublicPage(username: string): Promise<{
    bioLink: BioLink;
    items: BioLinkItem[];
  }> {
    const bioLink = await this.findByUsername(username);

    if (bioLink.status !== BioLinkStatus.PUBLISHED) {
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
