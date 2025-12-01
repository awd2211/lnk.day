import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { customAlphabet } from 'nanoid';
import * as bcrypt from 'bcrypt';

import { Link, LinkStatus } from './entities/link.entity';
import { LinkSchedule, ScheduleAction, ScheduleStatus } from './entities/link-schedule.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { BulkOperationDto, BulkAction, BulkCreateDto } from './dto/bulk-operation.dto';
import { CloneLinkDto } from './dto/clone-link.dto';
import { ScheduleLinkDto, UpdateScheduleDto } from './dto/schedule-link.dto';
import { RedisService } from '../../common/redis/redis.service';
import { LinkEventService } from '../../common/rabbitmq/link-event.service';
import { SecurityService } from '../security/security.service';
import { FolderService } from '../folder/folder.service';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

// 定时间隔常量
const EVERY_MINUTE = 60 * 1000;

@Injectable()
export class LinkService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LinkService.name);
  private scheduledLinksInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    @InjectRepository(LinkSchedule)
    private readonly scheduleRepository: Repository<LinkSchedule>,
    private readonly redisService: RedisService,
    private readonly linkEventService: LinkEventService,
    private readonly securityService: SecurityService,
    @Inject(forwardRef(() => FolderService))
    private readonly folderService: FolderService,
  ) {}

  onModuleInit() {
    // 启动定时任务：每分钟检查计划链接
    this.scheduledLinksInterval = setInterval(() => {
      this.processScheduledLinks().catch((err) => {
        this.logger.error(`处理计划链接失败: ${err.message}`);
      });
    }, EVERY_MINUTE);
    this.logger.log('计划链接定时任务已启动 (每分钟)');
  }

  onModuleDestroy() {
    if (this.scheduledLinksInterval) {
      clearInterval(this.scheduledLinksInterval);
      this.scheduledLinksInterval = null;
      this.logger.log('计划链接定时任务已停止');
    }
  }

  async create(createLinkDto: CreateLinkDto, userId: string, teamId: string): Promise<Link> {
    // 安全检查：验证目标 URL 是否安全
    const safetyCheck = await this.securityService.quickSafetyCheck(createLinkDto.originalUrl);
    if (!safetyCheck.allowed) {
      throw new BadRequestException(`URL 被拒绝: ${safetyCheck.reason}`);
    }

    // 如果 URL 可疑但允许，记录警告
    if (safetyCheck.reputation?.category === 'suspicious') {
      this.logger.warn(
        `Suspicious URL created by team ${teamId}: ${createLinkDto.originalUrl} (score: ${safetyCheck.reputation.score})`,
      );
    }

    let shortCode = createLinkDto.customSlug;

    if (shortCode) {
      const existing = await this.findByShortCode(shortCode);
      if (existing) {
        throw new ConflictException('Short code already exists');
      }
    } else {
      shortCode = await this.generateUniqueShortCode();
    }

    // Hash password if provided
    let settings = createLinkDto.settings || {};
    if (settings.passwordProtected && settings.password) {
      settings = {
        ...settings,
        password: await this.hashPassword(settings.password),
      };
    }

    const link = this.linkRepository.create({
      ...createLinkDto,
      shortCode,
      userId,
      teamId,
      domain: createLinkDto.domain || 'lnk.day',
      settings,
    });

    const savedLink = await this.linkRepository.save(link);

    // 更新文件夹链接计数
    if (savedLink.folderId) {
      await this.folderService.updateLinkCount(savedLink.folderId, 1);
    }

    // 缓存新创建的链接
    await this.redisService.setLink(savedLink);

    // 发布链接创建事件
    await this.linkEventService.publishLinkCreated({
      linkId: savedLink.id,
      shortCode: savedLink.shortCode,
      originalUrl: savedLink.originalUrl,
      userId: savedLink.userId,
      teamId: savedLink.teamId,
      customDomain: savedLink.domain,
    });

    return savedLink;
  }

  // ========== 密码保护 ==========

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async setLinkPassword(linkId: string, password: string): Promise<Link> {
    const link = await this.findOne(linkId);
    const hashedPassword = await this.hashPassword(password);

    link.settings = {
      ...link.settings,
      passwordProtected: true,
      password: hashedPassword,
    };

    return this.linkRepository.save(link);
  }

  async removeLinkPassword(linkId: string): Promise<Link> {
    const link = await this.findOne(linkId);

    link.settings = {
      ...link.settings,
      passwordProtected: false,
      password: undefined,
    };

    return this.linkRepository.save(link);
  }

  async verifyLinkPassword(linkId: string, password: string): Promise<boolean> {
    const link = await this.findOne(linkId);

    if (!link.settings?.passwordProtected || !link.settings?.password) {
      return true; // No password protection
    }

    return bcrypt.compare(password, link.settings.password);
  }

  async findAll(
    teamId: string,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      status?: string;
      search?: string;
      folderId?: string;
    },
  ): Promise<{ links: Link[]; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Math.min(Number(options?.limit) || 20, 100); // 最大100条
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';

    this.logger.debug(`findAll called with teamId=${teamId}, page=${page}, limit=${limit}, sortBy=${sortBy}, sortOrder=${sortOrder}, folderId=${options?.folderId || 'none'}`);

    // 构建查询条件
    const queryBuilder = this.linkRepository.createQueryBuilder('link');
    queryBuilder.where('link.teamId = :teamId', { teamId });

    // 状态筛选
    if (options?.status) {
      queryBuilder.andWhere('link.status = :status', { status: options.status.toUpperCase() });
    }

    // 文件夹筛选
    if (options?.folderId) {
      queryBuilder.andWhere('link.folderId = :folderId', { folderId: options.folderId });
    }

    // 搜索（标题、短码、原始URL）
    if (options?.search) {
      queryBuilder.andWhere(
        '(link.title ILIKE :search OR link.shortCode ILIKE :search OR link.originalUrl ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // 排序（只允许特定字段）
    const allowedSortFields = ['createdAt', 'updatedAt', 'clicks', 'title', 'shortCode', 'totalClicks'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`link.${safeSortBy}`, safeSortOrder);

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [links, total] = await queryBuilder.getManyAndCount();

    this.logger.debug(`findAll result: found ${total} links for teamId=${teamId}`);

    return { links, total, page, limit };
  }

  /**
   * 管理后台使用：查询所有链接（不限 teamId）
   */
  async findAllAdmin(
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      status?: string;
      search?: string;
      teamId?: string; // 可选：按团队筛选
    },
  ): Promise<{ links: Link[]; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Math.min(Number(options?.limit) || 20, 100);
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';

    this.logger.debug(`findAllAdmin called with page=${page}, limit=${limit}, teamId=${options?.teamId || 'all'}`);

    const queryBuilder = this.linkRepository.createQueryBuilder('link');

    // 可选：按团队筛选
    if (options?.teamId) {
      queryBuilder.where('link.teamId = :teamId', { teamId: options.teamId });
    }

    // 状态筛选
    if (options?.status) {
      queryBuilder.andWhere('link.status = :status', { status: options.status.toUpperCase() });
    }

    // 搜索
    if (options?.search) {
      queryBuilder.andWhere(
        '(link.title ILIKE :search OR link.shortCode ILIKE :search OR link.originalUrl ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // 排序
    const allowedSortFields = ['createdAt', 'updatedAt', 'clicks', 'title', 'shortCode', 'totalClicks'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`link.${safeSortBy}`, safeSortOrder);

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [links, total] = await queryBuilder.getManyAndCount();

    this.logger.debug(`findAllAdmin result: found ${total} links`);

    return { links, total, page, limit };
  }

  async findOne(id: string): Promise<Link> {
    const link = await this.linkRepository.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException(`Link with ID ${id} not found`);
    }
    return link;
  }

  async findByShortCode(shortCode: string): Promise<Link | null> {
    // 1. 检查缓存
    const cached = await this.redisService.getLink(shortCode);

    if (cached === 'NOT_FOUND') {
      return null; // 负缓存命中
    }

    if (cached) {
      this.logger.debug(`Cache hit for shortCode: ${shortCode}`);
      return cached as Link;
    }

    // 2. 缓存未命中，查询数据库
    this.logger.debug(`Cache miss for shortCode: ${shortCode}`);
    const link = await this.linkRepository.findOne({ where: { shortCode } });

    // 3. 更新缓存
    if (link) {
      await this.redisService.setLink(link);
    } else {
      await this.redisService.setNotFound(shortCode);
    }

    return link;
  }

  async update(id: string, updateLinkDto: UpdateLinkDto): Promise<Link> {
    const link = await this.findOne(id);
    const oldShortCode = link.shortCode;
    const oldFolderId = link.folderId;

    Object.assign(link, updateLinkDto);
    const savedLink = await this.linkRepository.save(link);

    // 更新文件夹链接计数（如果文件夹发生变化）
    if (oldFolderId !== savedLink.folderId) {
      if (oldFolderId) {
        await this.folderService.updateLinkCount(oldFolderId, -1);
      }
      if (savedLink.folderId) {
        await this.folderService.updateLinkCount(savedLink.folderId, 1);
      }
    }

    // 如果 shortCode 变更，删除旧缓存
    if (oldShortCode !== savedLink.shortCode) {
      await this.redisService.deleteLink(oldShortCode);
    }

    // 更新缓存
    await this.redisService.setLink(savedLink);

    // 发布链接更新事件
    const changes: Record<string, { old: any; new: any }> = {
      originalUrl: { old: link.originalUrl, new: savedLink.originalUrl },
    };
    if (oldShortCode !== savedLink.shortCode) {
      changes.shortCode = { old: oldShortCode, new: savedLink.shortCode };
    }
    await this.linkEventService.publishLinkUpdated({
      linkId: savedLink.id,
      shortCode: savedLink.shortCode,
      changes,
      userId: savedLink.userId,
      teamId: savedLink.teamId,
    });

    return savedLink;
  }

  async remove(id: string): Promise<void> {
    const link = await this.findOne(id);
    const shortCode = link.shortCode;
    const linkId = link.id;
    const userId = link.userId;
    const folderId = link.folderId;

    await this.linkRepository.remove(link);

    // 更新文件夹链接计数
    if (folderId) {
      await this.folderService.updateLinkCount(folderId, -1);
    }

    // 删除缓存
    await this.redisService.deleteLink(shortCode);

    // 发布链接删除事件
    await this.linkEventService.publishLinkDeleted({
      linkId,
      shortCode,
      userId,
      teamId: link.teamId,
    });
  }

  async incrementClicks(id: string): Promise<void> {
    await this.linkRepository.increment({ id }, 'totalClicks', 1);
  }

  private async generateUniqueShortCode(): Promise<string> {
    let shortCode: string;
    let exists: boolean;

    do {
      shortCode = nanoid();
      const link = await this.findByShortCode(shortCode);
      exists = !!link;
    } while (exists);

    return shortCode;
  }

  // ========== 批量操作 ==========

  async bulkOperation(dto: BulkOperationDto, teamId: string): Promise<{ success: number; failed: number }> {
    const links = await this.linkRepository.find({
      where: { id: In(dto.ids), teamId },
    });

    if (links.length === 0) {
      throw new NotFoundException('No links found with the provided IDs');
    }

    let success = 0;
    let failed = dto.ids.length - links.length;

    switch (dto.action) {
      case BulkAction.DELETE:
        // 更新文件夹链接计数
        const folderCountMap = new Map<string, number>();
        for (const link of links) {
          if (link.folderId) {
            folderCountMap.set(link.folderId, (folderCountMap.get(link.folderId) || 0) + 1);
          }
        }
        await this.linkRepository.remove(links);
        for (const [folderId, count] of folderCountMap) {
          await this.folderService.updateLinkCount(folderId, -count);
        }
        success = links.length;
        break;

      case BulkAction.ARCHIVE:
        await this.linkRepository.update(
          { id: In(links.map((l) => l.id)) },
          { status: LinkStatus.INACTIVE },
        );
        success = links.length;
        break;

      case BulkAction.ACTIVATE:
        await this.linkRepository.update(
          { id: In(links.map((l) => l.id)) },
          { status: LinkStatus.ACTIVE },
        );
        success = links.length;
        break;

      case BulkAction.DEACTIVATE:
        await this.linkRepository.update(
          { id: In(links.map((l) => l.id)) },
          { status: LinkStatus.INACTIVE },
        );
        success = links.length;
        break;

      case BulkAction.ADD_TAGS:
        if (!dto.tags || dto.tags.length === 0) {
          throw new BadRequestException('Tags are required for add_tags action');
        }
        for (const link of links) {
          const existingTags = link.tags || [];
          const newTags = [...new Set([...existingTags, ...dto.tags])];
          link.tags = newTags;
        }
        await this.linkRepository.save(links);
        success = links.length;
        break;

      case BulkAction.REMOVE_TAGS:
        if (!dto.tags || dto.tags.length === 0) {
          throw new BadRequestException('Tags are required for remove_tags action');
        }
        for (const link of links) {
          link.tags = (link.tags || []).filter((t) => !dto.tags!.includes(t));
        }
        await this.linkRepository.save(links);
        success = links.length;
        break;

      default:
        throw new BadRequestException(`Unknown action: ${dto.action}`);
    }

    return { success, failed };
  }

  async bulkCreate(dto: BulkCreateDto, userId: string, teamId: string): Promise<{ created: Link[]; failed: Array<{ index: number; error: string }> }> {
    const created: Link[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < dto.links.length; i++) {
      const linkData = dto.links[i]!;
      try {
        let shortCode = linkData.customSlug;

        if (shortCode) {
          const existing = await this.findByShortCode(shortCode);
          if (existing) {
            failed.push({ index: i, error: `Short code "${shortCode}" already exists` });
            continue;
          }
        } else {
          shortCode = await this.generateUniqueShortCode();
        }

        const link = this.linkRepository.create({
          originalUrl: linkData.originalUrl,
          title: linkData.title,
          shortCode,
          tags: linkData.tags || [],
          userId,
          teamId,
          domain: 'lnk.day',
        });

        const savedLink = await this.linkRepository.save(link);
        created.push(savedLink);
      } catch (error: any) {
        failed.push({ index: i, error: error.message || 'Unknown error' });
      }
    }

    return { created, failed };
  }

  // ========== 统计相关 ==========

  async getStats(teamId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalClicks: number;
    topLinks: Link[];
  }> {
    const totalLinks = await this.linkRepository.count({ where: { teamId } });
    const activeLinks = await this.linkRepository.count({
      where: { teamId, status: LinkStatus.ACTIVE },
    });

    const clicksResult = await this.linkRepository
      .createQueryBuilder('link')
      .select('SUM(link.totalClicks)', 'total')
      .where('link.teamId = :teamId', { teamId })
      .getRawOne();

    const topLinks = await this.linkRepository.find({
      where: { teamId },
      order: { totalClicks: 'DESC' },
      take: 10,
    });

    return {
      totalLinks,
      activeLinks,
      totalClicks: parseInt(clicksResult?.total || '0', 10),
      topLinks,
    };
  }

  async getLinkStats(id: string): Promise<{
    link: Link;
    clicksToday: number;
    clicksThisWeek: number;
    clicksThisMonth: number;
  }> {
    const link = await this.findOne(id);

    // 简化版本 - 实际应从 analytics-service 获取详细数据
    return {
      link,
      clicksToday: 0,
      clicksThisWeek: 0,
      clicksThisMonth: 0,
    };
  }

  // ========== 链接克隆 ==========

  async cloneLink(id: string, dto: CloneLinkDto, userId: string, teamId: string): Promise<Link> {
    const sourceLink = await this.findOne(id);

    // 生成或验证新的短码
    let newShortCode = dto.newShortCode;
    if (newShortCode) {
      const existing = await this.findByShortCode(newShortCode);
      if (existing) {
        throw new ConflictException('Short code already exists');
      }
    } else {
      newShortCode = await this.generateUniqueShortCode();
    }

    // 创建克隆链接
    const clonedLink = this.linkRepository.create({
      originalUrl: sourceLink.originalUrl,
      shortCode: newShortCode,
      title: dto.newTitle || `${sourceLink.title || 'Link'} (Copy)`,
      description: sourceLink.description,
      domain: sourceLink.domain,
      userId,
      teamId,
      folderId: dto.targetFolderId || sourceLink.folderId,
      tags: dto.copyTags !== false ? [...(sourceLink.tags || [])] : [],
      utmParams: dto.copyUtmParams !== false ? { ...sourceLink.utmParams } : undefined,
      settings: dto.copySettings !== false ? JSON.parse(JSON.stringify(sourceLink.settings)) : {},
      status: LinkStatus.ACTIVE,
      totalClicks: 0,
      uniqueClicks: 0,
    });

    return this.linkRepository.save(clonedLink);
  }

  // ========== 定时发布 ==========

  async scheduleLink(id: string, dto: ScheduleLinkDto, userId: string): Promise<LinkSchedule> {
    const link = await this.findOne(id);

    // 检查是否有已存在的待执行计划
    const existingSchedule = await this.scheduleRepository.findOne({
      where: {
        linkId: id,
        action: dto.action as unknown as ScheduleAction,
        status: ScheduleStatus.PENDING,
      },
    });

    if (existingSchedule) {
      throw new ConflictException(`A pending ${dto.action} schedule already exists for this link`);
    }

    const schedule = this.scheduleRepository.create({
      linkId: id,
      action: dto.action as unknown as ScheduleAction,
      scheduledAt: new Date(dto.scheduledAt),
      timezone: dto.timezone || 'UTC',
      createdBy: userId,
    });

    return this.scheduleRepository.save(schedule);
  }

  async getSchedules(linkId: string): Promise<LinkSchedule[]> {
    return this.scheduleRepository.find({
      where: { linkId },
      order: { scheduledAt: 'ASC' },
    });
  }

  async getPendingSchedules(linkId: string): Promise<LinkSchedule[]> {
    return this.scheduleRepository.find({
      where: { linkId, status: ScheduleStatus.PENDING },
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * 获取定时任务并验证归属
   */
  async getScheduleWithOwnership(scheduleId: string, teamId: string): Promise<LinkSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['link'],
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.link.teamId !== teamId) {
      throw new NotFoundException('Schedule not found'); // 不暴露归属信息
    }

    return schedule;
  }

  async updateSchedule(scheduleId: string, dto: UpdateScheduleDto, teamId: string): Promise<LinkSchedule> {
    const schedule = await this.getScheduleWithOwnership(scheduleId, teamId);

    if (schedule.status !== ScheduleStatus.PENDING) {
      throw new BadRequestException('Can only update pending schedules');
    }

    if (dto.scheduledAt) {
      schedule.scheduledAt = new Date(dto.scheduledAt);
    }
    if (dto.timezone) {
      schedule.timezone = dto.timezone;
    }

    return this.scheduleRepository.save(schedule);
  }

  async cancelSchedule(scheduleId: string, teamId: string): Promise<LinkSchedule> {
    const schedule = await this.getScheduleWithOwnership(scheduleId, teamId);

    if (schedule.status !== ScheduleStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending schedules');
    }

    schedule.status = ScheduleStatus.CANCELLED;
    return this.scheduleRepository.save(schedule);
  }

  // 定时任务 - 每分钟执行一次检查 (通过 setInterval 在 onModuleInit 中启动)
  async processScheduledLinks(): Promise<void> {
    const now = new Date();

    const pendingSchedules = await this.scheduleRepository.find({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledAt: LessThanOrEqual(now),
      },
      relations: ['link'],
    });

    for (const schedule of pendingSchedules) {
      try {
        await this.executeSchedule(schedule);
        schedule.status = ScheduleStatus.EXECUTED;
        schedule.executedAt = new Date();
      } catch (error: any) {
        schedule.status = ScheduleStatus.FAILED;
        schedule.errorMessage = error.message || 'Unknown error';
      }
      await this.scheduleRepository.save(schedule);
    }
  }

  private async executeSchedule(schedule: LinkSchedule): Promise<void> {
    const link = await this.linkRepository.findOne({
      where: { id: schedule.linkId },
    });

    if (!link) {
      throw new Error('Link not found');
    }

    switch (schedule.action) {
      case ScheduleAction.PUBLISH:
        link.status = LinkStatus.ACTIVE;
        break;
      case ScheduleAction.UNPUBLISH:
        link.status = LinkStatus.INACTIVE;
        break;
      case ScheduleAction.EXPIRE:
        link.status = LinkStatus.EXPIRED;
        link.expiresAt = new Date();
        break;
      default:
        throw new Error(`Unknown action: ${schedule.action}`);
    }

    await this.linkRepository.save(link);
  }

  /**
   * Get platform-wide link statistics (for admin console)
   */
  async getGlobalStats(): Promise<{
    totalLinks: number;
    activeLinks: number;
    inactiveLinks: number;
    expiredLinks: number;
    suspendedLinks: number;
    totalClicks: number;
    totalUniqueClicks: number;
  }> {
    const [
      totalLinks,
      activeLinks,
      inactiveLinks,
      expiredLinks,
      suspendedLinks,
    ] = await Promise.all([
      this.linkRepository.count(),
      this.linkRepository.count({ where: { status: LinkStatus.ACTIVE } }),
      this.linkRepository.count({ where: { status: LinkStatus.INACTIVE } }),
      this.linkRepository.count({ where: { status: LinkStatus.EXPIRED } }),
      this.linkRepository.count({ where: { status: LinkStatus.SUSPENDED } }),
    ]);

    // Get aggregated click stats
    const aggregateResult = await this.linkRepository
      .createQueryBuilder('link')
      .select('SUM(link.totalClicks)', 'totalClicks')
      .addSelect('SUM(link.uniqueClicks)', 'totalUniqueClicks')
      .getRawOne();

    return {
      totalLinks,
      activeLinks,
      inactiveLinks,
      expiredLinks,
      suspendedLinks,
      totalClicks: parseInt(aggregateResult?.totalClicks || '0', 10),
      totalUniqueClicks: parseInt(aggregateResult?.totalUniqueClicks || '0', 10),
    };
  }

  /**
   * 转移文件夹中的链接到另一个文件夹或移除文件夹关联
   * @param fromFolderId 源文件夹ID
   * @param toFolderId 目标文件夹ID，null 表示移除文件夹关联（链接变为未分类）
   */
  async transferLinksFromFolder(fromFolderId: string, toFolderId: string | null): Promise<number> {
    // 批量更新链接的 folderId
    const result = await this.linkRepository
      .createQueryBuilder()
      .update(Link)
      .set({ folderId: toFolderId ?? undefined })
      .where('folderId = :fromFolderId', { fromFolderId })
      .execute();

    const affectedCount = result.affected || 0;

    // 更新目标文件夹的链接计数
    if (toFolderId && affectedCount > 0) {
      await this.folderService.updateLinkCount(toFolderId, affectedCount);
    }

    return affectedCount;
  }
}
