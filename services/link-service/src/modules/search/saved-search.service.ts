import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  SavedSearch,
  SavedSearchVisibility,
} from './entities/saved-search.entity';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from './dto/saved-search.dto';
import { SearchService } from './search.service';

@Injectable()
export class SavedSearchService {
  private readonly logger = new Logger(SavedSearchService.name);

  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepository: Repository<SavedSearch>,
    private readonly searchService: SearchService,
  ) {}

  async create(
    dto: CreateSavedSearchDto,
    userId: string,
    teamId: string,
  ): Promise<SavedSearch> {
    const savedSearch = this.savedSearchRepository.create({
      ...dto,
      userId,
      teamId,
    });

    return this.savedSearchRepository.save(savedSearch);
  }

  async findAll(
    userId: string,
    teamId: string,
    options?: { includeTeam?: boolean },
  ): Promise<SavedSearch[]> {
    const whereConditions: any[] = [
      { teamId, userId },  // User's own searches
    ];

    if (options?.includeTeam !== false) {
      // Include team-visible searches
      whereConditions.push({
        teamId,
        visibility: SavedSearchVisibility.TEAM,
      });
    }

    const searches = await this.savedSearchRepository.find({
      where: whereConditions,
      order: {
        isPinned: 'DESC',
        usageCount: 'DESC',
        createdAt: 'DESC',
      },
    });

    // Deduplicate (in case user created a team-visible search)
    const uniqueSearches = new Map<string, SavedSearch>();
    searches.forEach((s) => uniqueSearches.set(s.id, s));

    return Array.from(uniqueSearches.values());
  }

  async findOne(id: string, userId: string, teamId: string): Promise<SavedSearch> {
    const search = await this.savedSearchRepository.findOne({
      where: { id },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    // Check access
    if (search.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }

    if (
      search.userId !== userId &&
      search.visibility !== SavedSearchVisibility.TEAM
    ) {
      throw new ForbiddenException('Access denied');
    }

    return search;
  }

  async update(
    id: string,
    dto: UpdateSavedSearchDto,
    userId: string,
    teamId: string,
  ): Promise<SavedSearch> {
    const search = await this.findOne(id, userId, teamId);

    // Only owner can update
    if (search.userId !== userId) {
      throw new ForbiddenException('Only the owner can update this search');
    }

    Object.assign(search, dto);
    return this.savedSearchRepository.save(search);
  }

  async remove(id: string, userId: string, teamId: string): Promise<void> {
    const search = await this.findOne(id, userId, teamId);

    // Only owner can delete
    if (search.userId !== userId) {
      throw new ForbiddenException('Only the owner can delete this search');
    }

    await this.savedSearchRepository.remove(search);
  }

  async execute(
    id: string,
    userId: string,
    teamId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    search: SavedSearch;
    results: any;
  }> {
    const search = await this.findOne(id, userId, teamId);

    // Execute the search
    const results = await this.searchService.search(teamId, search.query || '', {
      filters: search.filters
        ? {
            domains: search.filters.domains,
            tags: search.filters.tags,
            status: search.filters.status,
            minClicks: search.filters.minClicks,
            maxClicks: search.filters.maxClicks,
            startDate: search.filters.startDate
              ? new Date(search.filters.startDate)
              : undefined,
            endDate: search.filters.endDate
              ? new Date(search.filters.endDate)
              : undefined,
          }
        : undefined,
      sort: search.sort,
      page: options?.page,
      limit: options?.limit,
    });

    // Update usage stats
    search.usageCount += 1;
    search.lastUsedAt = new Date();
    search.lastResultCount = results.total;
    await this.savedSearchRepository.save(search);

    return { search, results };
  }

  async duplicate(
    id: string,
    userId: string,
    teamId: string,
    newName?: string,
  ): Promise<SavedSearch> {
    const original = await this.findOne(id, userId, teamId);

    const duplicate = this.savedSearchRepository.create({
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      query: original.query,
      filters: original.filters,
      sort: original.sort,
      visibility: SavedSearchVisibility.PRIVATE,
      notification: null,
      userId,
      teamId,
    });

    return this.savedSearchRepository.save(duplicate);
  }

  async togglePin(
    id: string,
    userId: string,
    teamId: string,
  ): Promise<SavedSearch> {
    const search = await this.findOne(id, userId, teamId);
    search.isPinned = !search.isPinned;
    return this.savedSearchRepository.save(search);
  }

  async share(
    id: string,
    userId: string,
    teamId: string,
    visibility: SavedSearchVisibility,
  ): Promise<SavedSearch> {
    const search = await this.findOne(id, userId, teamId);

    // Only owner can change visibility
    if (search.userId !== userId) {
      throw new ForbiddenException('Only the owner can share this search');
    }

    search.visibility = visibility;
    return this.savedSearchRepository.save(search);
  }

  async getPopular(teamId: string, limit: number = 10): Promise<SavedSearch[]> {
    return this.savedSearchRepository.find({
      where: {
        teamId,
        visibility: SavedSearchVisibility.TEAM,
      },
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  // ==================== Notification Scheduling ====================

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyNotifications(): Promise<void> {
    await this.sendScheduledNotifications('daily');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async sendWeeklyNotifications(): Promise<void> {
    await this.sendScheduledNotifications('weekly');
  }

  private async sendScheduledNotifications(
    frequency: 'daily' | 'weekly',
  ): Promise<void> {
    const searches = await this.savedSearchRepository
      .createQueryBuilder('search')
      .where("search.notification->>'enabled' = 'true'")
      .andWhere("search.notification->>'frequency' = :frequency", { frequency })
      .getMany();

    for (const search of searches) {
      try {
        await this.executeAndNotify(search);
      } catch (error) {
        this.logger.error(
          `Failed to send notification for search ${search.id}: ${error.message}`,
        );
      }
    }
  }

  async executeAndNotify(search: SavedSearch): Promise<void> {
    if (!search.notification?.enabled) return;

    // Execute search
    const results = await this.searchService.search(
      search.teamId,
      search.query || '',
      {
        filters: search.filters
          ? {
              domains: search.filters.domains,
              tags: search.filters.tags,
              status: search.filters.status,
              minClicks: search.filters.minClicks,
              maxClicks: search.filters.maxClicks,
              startDate: search.filters.startDate
                ? new Date(search.filters.startDate)
                : undefined,
              endDate: search.filters.endDate
                ? new Date(search.filters.endDate)
                : undefined,
            }
          : undefined,
        sort: search.sort,
        limit: 100,
      },
    );

    // Check threshold
    const threshold = search.notification.threshold || 0;
    const newResults = results.total - (search.lastResultCount || 0);

    if (newResults < threshold) {
      this.logger.debug(
        `Search ${search.id}: New results (${newResults}) below threshold (${threshold})`,
      );
      return;
    }

    // Send notification
    await this.sendNotificationEmail(search, results);

    // Update last result count
    search.lastResultCount = results.total;
    await this.savedSearchRepository.save(search);
  }

  private async sendNotificationEmail(
    search: SavedSearch,
    results: any,
  ): Promise<void> {
    // In production, this would call the notification service
    this.logger.log(
      `Sending search notification for "${search.name}" to ${search.notification?.recipients?.join(', ')}`,
    );
    this.logger.log(`Results: ${results.total} links found`);

    // TODO: Call notification service API
    // await this.notificationService.sendEmail({
    //   to: search.notification.recipients,
    //   template: 'saved-search-results',
    //   data: {
    //     searchName: search.name,
    //     totalResults: results.total,
    //     topResults: results.hits.slice(0, 10),
    //     searchUrl: `https://app.lnk.day/links?savedSearch=${search.id}`,
    //   },
    // });
  }

  // Check for new matches (for on_match notifications)
  async checkNewMatches(link: any): Promise<void> {
    const searches = await this.savedSearchRepository
      .createQueryBuilder('search')
      .where("search.notification->>'enabled' = 'true'")
      .andWhere("search.notification->>'frequency' = 'on_match'")
      .andWhere('search.teamId = :teamId', { teamId: link.teamId })
      .getMany();

    for (const search of searches) {
      try {
        const matches = this.checkLinkMatchesSearch(link, search);
        if (matches) {
          await this.sendNewMatchNotification(search, link);
        }
      } catch (error) {
        this.logger.error(
          `Failed to check match for search ${search.id}: ${error.message}`,
        );
      }
    }
  }

  private checkLinkMatchesSearch(link: any, search: SavedSearch): boolean {
    const filters = search.filters;
    if (!filters) return true;

    // Check domain filter
    if (filters.domains?.length && !filters.domains.includes(link.domain)) {
      return false;
    }

    // Check tag filter
    if (filters.tags?.length) {
      const linkTags = link.tags || [];
      const hasMatchingTag = filters.tags.some((tag) => linkTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Check status filter
    if (filters.status?.length && !filters.status.includes(link.status)) {
      return false;
    }

    // Check campaign filter
    if (filters.campaignIds?.length && !filters.campaignIds.includes(link.campaignId)) {
      return false;
    }

    // Check folder filter
    if (filters.folderIds?.length && !filters.folderIds.includes(link.folderId)) {
      return false;
    }

    // Check query match (simple text matching)
    if (search.query) {
      const query = search.query.toLowerCase();
      const matchesQuery =
        link.title?.toLowerCase().includes(query) ||
        link.description?.toLowerCase().includes(query) ||
        link.originalUrl?.toLowerCase().includes(query) ||
        link.shortCode?.toLowerCase().includes(query);
      if (!matchesQuery) return false;
    }

    return true;
  }

  private async sendNewMatchNotification(
    search: SavedSearch,
    link: any,
  ): Promise<void> {
    this.logger.log(
      `New link matches saved search "${search.name}": ${link.shortCode}`,
    );

    // TODO: Call notification service API
    // await this.notificationService.sendEmail({
    //   to: search.notification.recipients,
    //   template: 'saved-search-new-match',
    //   data: {
    //     searchName: search.name,
    //     link: link,
    //     searchUrl: `https://app.lnk.day/links?savedSearch=${search.id}`,
    //   },
    // });
  }
}
