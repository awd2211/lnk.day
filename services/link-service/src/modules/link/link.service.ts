import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { Cron, CronExpression } from '@nestjs/schedule';
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

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

@Injectable()
export class LinkService {
  private readonly logger = new Logger(LinkService.name);

  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    @InjectRepository(LinkSchedule)
    private readonly scheduleRepository: Repository<LinkSchedule>,
    private readonly redisService: RedisService,
    private readonly linkEventService: LinkEventService,
  ) {}

  async create(createLinkDto: CreateLinkDto, userId: string, teamId: string): Promise<Link> {
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

    // 缓存新创建的链接
    await this.redisService.setLink(savedLink);

    // 发布链接创建事件
    await this.linkEventService.publishLinkCreated(savedLink.id, savedLink.shortCode, {
      originalUrl: savedLink.originalUrl,
      domain: savedLink.domain,
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

  async findAll(teamId: string, options?: { page?: number; limit?: number }): Promise<{ links: Link[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [links, total] = await this.linkRepository.findAndCount({
      where: { teamId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { links, total };
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

    Object.assign(link, updateLinkDto);
    const savedLink = await this.linkRepository.save(link);

    // 如果 shortCode 变更，删除旧缓存
    if (oldShortCode !== savedLink.shortCode) {
      await this.redisService.deleteLink(oldShortCode);
    }

    // 更新缓存
    await this.redisService.setLink(savedLink);

    // 发布链接更新事件
    await this.linkEventService.publishLinkUpdated(savedLink.id, savedLink.shortCode, {
      oldShortCode: oldShortCode !== savedLink.shortCode ? oldShortCode : undefined,
      originalUrl: savedLink.originalUrl,
    });

    return savedLink;
  }

  async remove(id: string): Promise<void> {
    const link = await this.findOne(id);
    const shortCode = link.shortCode;
    const linkId = link.id;

    await this.linkRepository.remove(link);

    // 删除缓存
    await this.redisService.deleteLink(shortCode);

    // 发布链接删除事件
    await this.linkEventService.publishLinkDeleted(linkId, shortCode);
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
        await this.linkRepository.remove(links);
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

  async updateSchedule(scheduleId: string, dto: UpdateScheduleDto): Promise<LinkSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

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

  async cancelSchedule(scheduleId: string): Promise<LinkSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status !== ScheduleStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending schedules');
    }

    schedule.status = ScheduleStatus.CANCELLED;
    return this.scheduleRepository.save(schedule);
  }

  // 定时任务 - 每分钟执行一次检查
  @Cron(CronExpression.EVERY_MINUTE)
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
}
