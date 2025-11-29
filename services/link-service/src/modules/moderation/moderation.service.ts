import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Between, FindOptionsWhere } from 'typeorm';
import { FlaggedLink, FlagReason, FlagSeverity, FlagStatus } from './entities/flagged-link.entity';
import { LinkReport } from './entities/link-report.entity';
import { Link, LinkStatus } from '../link/entities/link.entity';
import {
  QueryFlaggedLinksDto,
  CreateReportDto,
  ApproveDto,
  BlockDto,
  BulkApproveDto,
  BulkBlockDto,
  UpdateModerationSettingsDto,
  ModerationStatsDto,
} from './dto/moderation.dto';

export interface ModerationSettings {
  autoDetectionEnabled: boolean;
  autoBlockPhishing: boolean;
  autoBlockMalware: boolean;
  autoBlockThreshold: number;
  severityUpgradeThreshold: number;
  emailNotificationsEnabled: boolean;
  dailySummaryEnabled: boolean;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  // In-memory settings (could be moved to database or Redis)
  private settings: ModerationSettings = {
    autoDetectionEnabled: true,
    autoBlockPhishing: true,
    autoBlockMalware: true,
    autoBlockThreshold: 10,
    severityUpgradeThreshold: 5,
    emailNotificationsEnabled: true,
    dailySummaryEnabled: false,
  };

  constructor(
    @InjectRepository(FlaggedLink)
    private readonly flaggedLinkRepository: Repository<FlaggedLink>,
    @InjectRepository(LinkReport)
    private readonly linkReportRepository: Repository<LinkReport>,
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
  ) {}

  async getStats(): Promise<ModerationStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingReview, blockedToday, approvedToday, totalReports, autoBlocked, byReasonRaw] = await Promise.all([
      this.flaggedLinkRepository.count({ where: { status: FlagStatus.PENDING } }),
      this.flaggedLinkRepository.count({
        where: {
          status: FlagStatus.BLOCKED,
          reviewedAt: Between(todayStart, now),
        },
      }),
      this.flaggedLinkRepository.count({
        where: {
          status: FlagStatus.APPROVED,
          reviewedAt: Between(todayStart, now),
        },
      }),
      this.linkReportRepository.count(),
      this.flaggedLinkRepository.count({ where: { autoDetected: true, status: FlagStatus.BLOCKED } }),
      this.flaggedLinkRepository
        .createQueryBuilder('fl')
        .select('fl.reason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .groupBy('fl.reason')
        .getRawMany(),
    ]);

    const byReason = byReasonRaw.map(r => ({
      reason: r.reason,
      count: parseInt(r.count, 10),
    }));

    return {
      pendingReview,
      blockedToday,
      approvedToday,
      totalReports,
      autoBlocked,
      byReason,
    };
  }

  async findAll(query: QueryFlaggedLinksDto): Promise<{
    items: FlaggedLink[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<FlaggedLink> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.reason) {
      where.reason = query.reason;
    }
    if (query.severity) {
      where.severity = query.severity;
    }
    if (query.teamId) {
      where.teamId = query.teamId;
    }

    const queryBuilder = this.flaggedLinkRepository
      .createQueryBuilder('fl')
      .where(where);

    if (query.search) {
      queryBuilder.andWhere(
        '(fl.shortUrl ILIKE :search OR fl.destinationUrl ILIKE :search OR fl.userName ILIKE :search OR fl.userEmail ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('fl.detectedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<FlaggedLink> {
    const flaggedLink = await this.flaggedLinkRepository.findOne({
      where: { id },
      relations: ['link'],
    });

    if (!flaggedLink) {
      throw new NotFoundException(`Flagged link with ID ${id} not found`);
    }

    return flaggedLink;
  }

  async getReports(flaggedLinkId: string): Promise<LinkReport[]> {
    return this.linkReportRepository.find({
      where: { flaggedLinkId },
      order: { createdAt: 'DESC' },
    });
  }

  async createReport(dto: CreateReportDto, reporterIp?: string): Promise<FlaggedLink> {
    const link = await this.linkRepository.findOne({ where: { id: dto.linkId } });
    if (!link) {
      throw new NotFoundException(`Link with ID ${dto.linkId} not found`);
    }

    // Find or create flagged link
    let flaggedLink = await this.flaggedLinkRepository.findOne({
      where: { linkId: dto.linkId, status: FlagStatus.PENDING },
    });

    if (!flaggedLink) {
      flaggedLink = this.flaggedLinkRepository.create({
        linkId: link.id,
        shortUrl: `${link.domain}/${link.shortCode}`,
        destinationUrl: link.originalUrl,
        userId: link.userId,
        teamId: link.teamId,
        reason: dto.reason,
        severity: FlagSeverity.MEDIUM,
        status: FlagStatus.PENDING,
        reportCount: 0,
        autoDetected: false,
      });
    }

    // Create report
    const report = this.linkReportRepository.create({
      flaggedLinkId: flaggedLink.id,
      reason: dto.reason,
      description: dto.description,
      evidence: dto.evidence,
      reporterEmail: dto.reporterEmail,
      reporterIp,
    });

    // Update report count and severity
    flaggedLink.reportCount += 1;

    // Upgrade severity based on report count
    if (flaggedLink.reportCount >= this.settings.severityUpgradeThreshold) {
      if (flaggedLink.severity === FlagSeverity.LOW) {
        flaggedLink.severity = FlagSeverity.MEDIUM;
      } else if (flaggedLink.severity === FlagSeverity.MEDIUM) {
        flaggedLink.severity = FlagSeverity.HIGH;
      }
    }

    // Auto-block if threshold reached
    if (flaggedLink.reportCount >= this.settings.autoBlockThreshold) {
      flaggedLink.status = FlagStatus.BLOCKED;
      flaggedLink.reviewedAt = new Date();
      flaggedLink.notes = 'Auto-blocked due to high report count';

      // Suspend the link
      await this.linkRepository.update(link.id, { status: LinkStatus.SUSPENDED });
    }

    await this.flaggedLinkRepository.save(flaggedLink);
    await this.linkReportRepository.save(report);

    return flaggedLink;
  }

  async flagLink(
    linkId: string,
    reason: FlagReason,
    options?: {
      severity?: FlagSeverity;
      autoDetected?: boolean;
      detectedBy?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<FlaggedLink> {
    const link = await this.linkRepository.findOne({ where: { id: linkId } });
    if (!link) {
      throw new NotFoundException(`Link with ID ${linkId} not found`);
    }

    // Check if already flagged
    const existing = await this.flaggedLinkRepository.findOne({
      where: { linkId, status: In([FlagStatus.PENDING, FlagStatus.BLOCKED]) },
    });

    if (existing) {
      return existing;
    }

    const flaggedLink = this.flaggedLinkRepository.create({
      linkId: link.id,
      shortUrl: `${link.domain}/${link.shortCode}`,
      destinationUrl: link.originalUrl,
      userId: link.userId,
      teamId: link.teamId,
      reason,
      severity: options?.severity || FlagSeverity.MEDIUM,
      status: FlagStatus.PENDING,
      reportCount: 0,
      autoDetected: options?.autoDetected || false,
      detectedBy: options?.detectedBy,
      metadata: options?.metadata,
    });

    // Auto-block for phishing/malware if enabled
    if (
      (reason === FlagReason.PHISHING && this.settings.autoBlockPhishing) ||
      (reason === FlagReason.MALWARE && this.settings.autoBlockMalware)
    ) {
      flaggedLink.status = FlagStatus.BLOCKED;
      flaggedLink.severity = FlagSeverity.CRITICAL;
      flaggedLink.reviewedAt = new Date();
      flaggedLink.notes = `Auto-blocked: ${reason} detected`;

      // Suspend the link
      await this.linkRepository.update(link.id, { status: LinkStatus.SUSPENDED });
    }

    return this.flaggedLinkRepository.save(flaggedLink);
  }

  async approve(id: string, dto: ApproveDto, reviewerId: string, reviewerName?: string): Promise<FlaggedLink> {
    const flaggedLink = await this.findOne(id);

    if (flaggedLink.status !== FlagStatus.PENDING) {
      throw new BadRequestException('Only pending items can be approved');
    }

    flaggedLink.status = FlagStatus.APPROVED;
    flaggedLink.reviewedAt = new Date();
    flaggedLink.reviewedBy = reviewerId;
    flaggedLink.reviewerName = reviewerName;
    flaggedLink.notes = dto.note;

    // Reactivate link if it was suspended
    await this.linkRepository.update(flaggedLink.linkId, { status: LinkStatus.ACTIVE });

    return this.flaggedLinkRepository.save(flaggedLink);
  }

  async block(id: string, dto: BlockDto, reviewerId: string, reviewerName?: string): Promise<FlaggedLink> {
    const flaggedLink = await this.findOne(id);

    if (flaggedLink.status !== FlagStatus.PENDING) {
      throw new BadRequestException('Only pending items can be blocked');
    }

    flaggedLink.status = FlagStatus.BLOCKED;
    flaggedLink.reviewedAt = new Date();
    flaggedLink.reviewedBy = reviewerId;
    flaggedLink.reviewerName = reviewerName;
    flaggedLink.notes = dto.note;

    // Suspend the link
    await this.linkRepository.update(flaggedLink.linkId, { status: LinkStatus.SUSPENDED });

    // TODO: If blockUser is true, call user-service to block the user

    return this.flaggedLinkRepository.save(flaggedLink);
  }

  async bulkApprove(dto: BulkApproveDto, reviewerId: string, reviewerName?: string): Promise<number> {
    const flaggedLinks = await this.flaggedLinkRepository.find({
      where: { id: In(dto.ids), status: FlagStatus.PENDING },
    });

    const now = new Date();
    for (const flaggedLink of flaggedLinks) {
      flaggedLink.status = FlagStatus.APPROVED;
      flaggedLink.reviewedAt = now;
      flaggedLink.reviewedBy = reviewerId;
      flaggedLink.reviewerName = reviewerName;
      flaggedLink.notes = dto.note;

      // Reactivate links
      await this.linkRepository.update(flaggedLink.linkId, { status: LinkStatus.ACTIVE });
    }

    await this.flaggedLinkRepository.save(flaggedLinks);
    return flaggedLinks.length;
  }

  async bulkBlock(dto: BulkBlockDto, reviewerId: string, reviewerName?: string): Promise<number> {
    const flaggedLinks = await this.flaggedLinkRepository.find({
      where: { id: In(dto.ids), status: FlagStatus.PENDING },
    });

    const now = new Date();
    for (const flaggedLink of flaggedLinks) {
      flaggedLink.status = FlagStatus.BLOCKED;
      flaggedLink.reviewedAt = now;
      flaggedLink.reviewedBy = reviewerId;
      flaggedLink.reviewerName = reviewerName;
      flaggedLink.notes = dto.note;

      // Suspend links
      await this.linkRepository.update(flaggedLink.linkId, { status: LinkStatus.SUSPENDED });
    }

    await this.flaggedLinkRepository.save(flaggedLinks);
    return flaggedLinks.length;
  }

  async unflagLink(linkId: string): Promise<void> {
    const flaggedLink = await this.flaggedLinkRepository.findOne({
      where: { linkId, status: FlagStatus.PENDING },
    });

    if (flaggedLink) {
      flaggedLink.status = FlagStatus.REJECTED;
      await this.flaggedLinkRepository.save(flaggedLink);
    }
  }

  getSettings(): ModerationSettings {
    return { ...this.settings };
  }

  updateSettings(dto: UpdateModerationSettingsDto): ModerationSettings {
    if (dto.autoDetectionEnabled !== undefined) {
      this.settings.autoDetectionEnabled = dto.autoDetectionEnabled;
    }
    if (dto.autoBlockPhishing !== undefined) {
      this.settings.autoBlockPhishing = dto.autoBlockPhishing;
    }
    if (dto.autoBlockMalware !== undefined) {
      this.settings.autoBlockMalware = dto.autoBlockMalware;
    }
    if (dto.autoBlockThreshold !== undefined) {
      this.settings.autoBlockThreshold = dto.autoBlockThreshold;
    }
    if (dto.severityUpgradeThreshold !== undefined) {
      this.settings.severityUpgradeThreshold = dto.severityUpgradeThreshold;
    }
    if (dto.emailNotificationsEnabled !== undefined) {
      this.settings.emailNotificationsEnabled = dto.emailNotificationsEnabled;
    }
    if (dto.dailySummaryEnabled !== undefined) {
      this.settings.dailySummaryEnabled = dto.dailySummaryEnabled;
    }

    return { ...this.settings };
  }

  // Get blocked users (from flagged links where user was blocked)
  async getBlockedUsers(params?: { page?: number; limit?: number }): Promise<{
    items: Array<{ userId: string; userName?: string; userEmail?: string; blockedAt: Date; reason: string }>;
    total: number;
  }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    // Get unique users from blocked flagged links
    const [results, total] = await this.flaggedLinkRepository
      .createQueryBuilder('fl')
      .select('DISTINCT fl.userId', 'userId')
      .addSelect('fl.userName', 'userName')
      .addSelect('fl.userEmail', 'userEmail')
      .addSelect('fl.reviewedAt', 'blockedAt')
      .addSelect('fl.reason', 'reason')
      .where('fl.status = :status', { status: FlagStatus.BLOCKED })
      .orderBy('fl.reviewedAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany()
      .then(async (items) => {
        const count = await this.flaggedLinkRepository
          .createQueryBuilder('fl')
          .select('COUNT(DISTINCT fl.userId)', 'count')
          .where('fl.status = :status', { status: FlagStatus.BLOCKED })
          .getRawOne();
        return [items, parseInt(count?.count || '0', 10)];
      });

    return {
      items: results as any[],
      total: total as number,
    };
  }
}
