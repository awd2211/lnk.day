import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import {
  SavedSearch,
  SavedSearchVisibility,
  NotificationChannel,
} from './entities/saved-search.entity';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from './dto/saved-search.dto';
import { SearchService } from './search.service';
import {
  LinkNotificationService,
  SavedSearchNotificationData,
  NewMatchNotificationData,
} from '../../common/notification/link-notification.service';

// 定时间隔常量
const EVERY_DAY = 24 * 60 * 60 * 1000;
const EVERY_WEEK = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SavedSearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SavedSearchService.name);
  private dailyNotificationInterval: NodeJS.Timeout | null = null;
  private weeklyNotificationInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepository: Repository<SavedSearch>,
    private readonly searchService: SearchService,
    private readonly notificationClient: LinkNotificationService,
  ) {}

  onModuleInit() {
    // 每日通知 (每24小时)
    this.dailyNotificationInterval = setInterval(() => {
      this.sendDailyNotifications().catch((err) => {
        this.logger.error(`发送每日通知失败: ${err.message}`);
      });
    }, EVERY_DAY);

    // 每周通知 (每7天)
    this.weeklyNotificationInterval = setInterval(() => {
      this.sendWeeklyNotifications().catch((err) => {
        this.logger.error(`发送每周通知失败: ${err.message}`);
      });
    }, EVERY_WEEK);

    this.logger.log('搜索通知定时任务已启动 (每日/每周)');
  }

  onModuleDestroy() {
    if (this.dailyNotificationInterval) {
      clearInterval(this.dailyNotificationInterval);
      this.dailyNotificationInterval = null;
    }
    if (this.weeklyNotificationInterval) {
      clearInterval(this.weeklyNotificationInterval);
      this.weeklyNotificationInterval = null;
    }
    this.logger.log('搜索通知定时任务已停止');
  }

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
      notification: undefined,
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

  async setDefault(
    id: string,
    userId: string,
    teamId: string,
  ): Promise<SavedSearch> {
    const search = await this.findOne(id, userId, teamId);

    // Clear any existing default for this user
    await this.savedSearchRepository.update(
      { userId, teamId, isDefault: true },
      { isDefault: false },
    );

    // Set this one as default
    search.isDefault = true;
    return this.savedSearchRepository.save(search);
  }

  // ==================== Notification Scheduling ====================
  // 定时任务通过 setInterval 在 onModuleInit 中启动

  async sendDailyNotifications(): Promise<void> {
    await this.sendScheduledNotifications('daily');
  }

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
      } catch (error: any) {
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
    this.logger.log(
      `Sending search notification for "${search.name}" to ${search.notification?.recipients?.join(', ')}`,
    );
    this.logger.log(`Results: ${results.total} links found`);

    const notificationData: SavedSearchNotificationData = {
      searchName: search.name,
      searchDescription: search.description,
      totalResults: results.total,
      newResults: results.total - (search.lastResultCount || 0),
      topResults: results.hits?.slice(0, 10).map((hit: any) => ({
        title: hit.title || hit.shortCode,
        shortUrl: this.notificationClient.getLinkUrl(hit.shortCode),
        originalUrl: hit.originalUrl,
        clicks: hit.totalClicks || 0,
      })),
      searchUrl: this.notificationClient.getSearchUrl(search.id),
      frequency: search.notification?.frequency || 'daily',
    };

    // Get notification channels (support both legacy and new format)
    const channels = this.getNotificationChannels(search);

    const sendPromises: Promise<boolean>[] = [];

    for (const channel of channels) {
      if (!channel.enabled) continue;

      switch (channel.type) {
        case 'email':
          const emailRecipients = channel.recipients || search.notification?.recipients || [];
          if (emailRecipients.length > 0) {
            sendPromises.push(
              this.notificationClient.sendSavedSearchResultsEmail(emailRecipients, notificationData),
            );
          }
          break;

        case 'slack':
          if (channel.webhookUrl) {
            sendPromises.push(
              this.notificationClient.sendSavedSearchResultsSlack(channel.webhookUrl, notificationData),
            );
          }
          break;

        case 'teams':
          if (channel.webhookUrl) {
            sendPromises.push(
              this.notificationClient.sendSavedSearchResultsTeams(channel.webhookUrl, notificationData),
            );
          }
          break;
      }
    }

    const results_arr = await Promise.allSettled(sendPromises);
    const failedCount = results_arr.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      this.logger.warn(`${failedCount} notification(s) failed for search ${search.id}`);
    }
  }

  private getNotificationChannels(search: SavedSearch): NotificationChannel[] {
    // If new channels format exists, use it
    if (search.notification?.channels && search.notification.channels.length > 0) {
      return search.notification.channels;
    }

    // Fallback to legacy email format
    if (search.notification?.recipients && search.notification.recipients.length > 0) {
      return [
        {
          type: 'email',
          enabled: true,
          recipients: search.notification.recipients,
        },
      ];
    }

    return [];
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
      } catch (error: any) {
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

    const notificationData: NewMatchNotificationData = {
      searchName: search.name,
      link: {
        title: link.title || link.shortCode,
        shortCode: link.shortCode,
        shortUrl: this.notificationClient.getLinkUrl(link.shortCode),
        originalUrl: link.originalUrl,
        createdAt: new Date(link.createdAt).toLocaleString('zh-CN'),
      },
      searchUrl: this.notificationClient.getSearchUrl(search.id),
    };

    // Get notification channels
    const channels = this.getNotificationChannels(search);

    const sendPromises: Promise<boolean>[] = [];

    for (const channel of channels) {
      if (!channel.enabled) continue;

      switch (channel.type) {
        case 'email':
          const emailRecipients = channel.recipients || search.notification?.recipients || [];
          if (emailRecipients.length > 0) {
            sendPromises.push(
              this.notificationClient.sendNewMatchEmail(emailRecipients, notificationData),
            );
          }
          break;

        case 'slack':
          if (channel.webhookUrl) {
            sendPromises.push(
              this.notificationClient.sendNewMatchSlack(channel.webhookUrl, notificationData),
            );
          }
          break;

        case 'teams':
          if (channel.webhookUrl) {
            sendPromises.push(
              this.notificationClient.sendNewMatchTeams(channel.webhookUrl, notificationData),
            );
          }
          break;
      }
    }

    const results = await Promise.allSettled(sendPromises);
    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      this.logger.warn(`${failedCount} new match notification(s) failed for search ${search.id}`);
    }
  }

  // ==================== Test Notification ====================

  async testNotification(
    id: string,
    userId: string,
    teamId: string,
  ): Promise<{ success: boolean; errors: string[] }> {
    const search = await this.findOne(id, userId, teamId);

    if (!search.notification?.enabled) {
      return { success: false, errors: ['通知未启用'] };
    }

    const channels = this.getNotificationChannels(search);
    if (channels.length === 0) {
      return { success: false, errors: ['未配置通知渠道'] };
    }

    // Execute a test search
    const results = await this.searchService.search(
      search.teamId,
      search.query || '',
      {
        filters: search.filters
          ? {
              domains: search.filters.domains,
              tags: search.filters.tags,
              status: search.filters.status,
            }
          : undefined,
        limit: 10,
      },
    );

    const notificationData: SavedSearchNotificationData = {
      searchName: `[测试] ${search.name}`,
      searchDescription: search.description,
      totalResults: results.total,
      topResults: results.hits?.slice(0, 5).map((hit: any) => ({
        title: hit.title || hit.shortCode,
        shortUrl: this.notificationClient.getLinkUrl(hit.shortCode),
        originalUrl: hit.originalUrl,
        clicks: hit.totalClicks || 0,
      })),
      searchUrl: this.notificationClient.getSearchUrl(search.id),
      frequency: search.notification?.frequency || 'daily',
    };

    const errors: string[] = [];
    const sendPromises: Promise<{ channel: string; success: boolean }>[] = [];

    for (const channel of channels) {
      if (!channel.enabled) continue;

      switch (channel.type) {
        case 'email':
          const recipients = channel.recipients || search.notification?.recipients || [];
          if (recipients.length > 0) {
            sendPromises.push(
              this.notificationClient
                .sendSavedSearchResultsEmail(recipients, notificationData)
                .then((success) => ({ channel: `email:${recipients.join(',')}`, success })),
            );
          }
          break;

        case 'slack':
          if (channel.webhookUrl) {
            sendPromises.push(
              this.notificationClient
                .sendSavedSearchResultsSlack(channel.webhookUrl, notificationData)
                .then((success) => ({ channel: `slack:${channel.channelName || 'webhook'}`, success })),
            );
          }
          break;

        case 'teams':
          if (channel.webhookUrl) {
            sendPromises.push(
              this.notificationClient
                .sendSavedSearchResultsTeams(channel.webhookUrl, notificationData)
                .then((success) => ({ channel: `teams:${channel.channelName || 'webhook'}`, success })),
            );
          }
          break;
      }
    }

    const results_arr = await Promise.all(sendPromises);
    for (const result of results_arr) {
      if (!result.success) {
        errors.push(`${result.channel} 发送失败`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }
}
