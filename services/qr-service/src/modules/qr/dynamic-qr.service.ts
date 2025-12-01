import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DynamicQrCode } from './entities/dynamic-qr.entity';
import { QrService } from './qr.service';
import { nanoid } from 'nanoid';

export interface CreateDynamicQrDto {
  name: string;
  description?: string;
  destinationUrl: string;
  customCode?: string;
  qrOptions?: {
    size?: number;
    foregroundColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    logoSize?: number;
    gradient?: {
      enabled: boolean;
      startColor: string;
      endColor: string;
      direction: 'horizontal' | 'vertical' | 'diagonal';
    };
    eyeStyle?: {
      outer: string;
      inner: string;
      color?: string;
    };
    textLabel?: {
      enabled: boolean;
      text: string;
      fontSize?: number;
      color?: string;
      position?: 'bottom' | 'top';
    };
  };
  tags?: string[];
  folderId?: string;
  expiresAt?: Date;
  schedule?: {
    enabled: boolean;
    rules: Array<{
      days: number[];
      startTime: string;
      endTime: string;
      url: string;
    }>;
    defaultUrl: string;
  };
}

export interface UpdateDynamicQrDto {
  name?: string;
  description?: string;
  destinationUrl?: string;
  qrOptions?: CreateDynamicQrDto['qrOptions'];
  tags?: string[];
  folderId?: string;
  expiresAt?: Date;
  isActive?: boolean;
  schedule?: CreateDynamicQrDto['schedule'];
  changeReason?: string;
}

export interface DynamicQrListOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  tags?: string[];
  folderId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'totalScans' | 'name';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class DynamicQrService {
  constructor(
    @InjectRepository(DynamicQrCode)
    private readonly dynamicQrRepository: Repository<DynamicQrCode>,
    private readonly qrService: QrService,
  ) {}

  async create(
    teamId: string,
    userId: string,
    dto: CreateDynamicQrDto,
  ): Promise<DynamicQrCode> {
    // Generate or validate short code
    const shortCode = dto.customCode || nanoid(8);

    // Check if short code is unique
    const existing = await this.dynamicQrRepository.findOne({
      where: { shortCode },
    });
    if (existing) {
      throw new BadRequestException('Short code already exists');
    }

    const dynamicQr = this.dynamicQrRepository.create({
      teamId,
      createdBy: userId,
      name: dto.name,
      description: dto.description,
      shortCode,
      destinationUrl: dto.destinationUrl,
      qrOptions: dto.qrOptions,
      tags: dto.tags,
      folderId: dto.folderId,
      expiresAt: dto.expiresAt,
      schedule: dto.schedule,
      urlHistory: [
        {
          url: dto.destinationUrl,
          changedAt: new Date().toISOString(),
          changedBy: userId,
          reason: 'Initial creation',
        },
      ],
    });

    return this.dynamicQrRepository.save(dynamicQr);
  }

  async findAll(
    teamId: string,
    options: DynamicQrListOptions = {},
  ): Promise<{ data: DynamicQrCode[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      tags,
      folderId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const query = this.dynamicQrRepository
      .createQueryBuilder('qr')
      .where('qr.teamId = :teamId', { teamId });

    if (search) {
      query.andWhere(
        '(qr.name ILIKE :search OR qr.description ILIKE :search OR qr.shortCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      query.andWhere('qr.isActive = :isActive', { isActive });
    }

    if (tags && tags.length > 0) {
      query.andWhere('qr.tags && :tags', { tags });
    }

    if (folderId) {
      query.andWhere('qr.folderId = :folderId', { folderId });
    }

    const [data, total] = await query
      .orderBy(`qr.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, teamId: string): Promise<DynamicQrCode> {
    const qr = await this.dynamicQrRepository.findOne({
      where: { id, teamId },
    });
    if (!qr) {
      throw new NotFoundException('Dynamic QR code not found');
    }
    return qr;
  }

  async findByShortCode(shortCode: string): Promise<DynamicQrCode | null> {
    return this.dynamicQrRepository.findOne({
      where: { shortCode, isActive: true },
    });
  }

  async update(
    id: string,
    teamId: string,
    userId: string,
    dto: UpdateDynamicQrDto,
  ): Promise<DynamicQrCode> {
    const qr = await this.findOne(id, teamId);

    // Track URL changes
    if (dto.destinationUrl && dto.destinationUrl !== qr.destinationUrl) {
      qr.urlHistory = [
        ...qr.urlHistory,
        {
          url: dto.destinationUrl,
          changedAt: new Date().toISOString(),
          changedBy: userId,
          reason: dto.changeReason,
        },
      ];
      qr.destinationUrl = dto.destinationUrl;
    }

    // Update other fields
    if (dto.name !== undefined) qr.name = dto.name;
    if (dto.description !== undefined) qr.description = dto.description;
    if (dto.qrOptions !== undefined) qr.qrOptions = dto.qrOptions;
    if (dto.tags !== undefined) qr.tags = dto.tags;
    if (dto.folderId !== undefined) qr.folderId = dto.folderId;
    if (dto.expiresAt !== undefined) qr.expiresAt = dto.expiresAt;
    if (dto.isActive !== undefined) qr.isActive = dto.isActive;
    if (dto.schedule !== undefined) qr.schedule = dto.schedule;

    return this.dynamicQrRepository.save(qr);
  }

  async delete(id: string, teamId: string): Promise<void> {
    const qr = await this.findOne(id, teamId);
    await this.dynamicQrRepository.remove(qr);
  }

  async deactivate(id: string, teamId: string): Promise<DynamicQrCode> {
    const qr = await this.findOne(id, teamId);
    qr.isActive = false;
    return this.dynamicQrRepository.save(qr);
  }

  async activate(id: string, teamId: string): Promise<DynamicQrCode> {
    const qr = await this.findOne(id, teamId);
    qr.isActive = true;
    return this.dynamicQrRepository.save(qr);
  }

  async recordScan(id: string): Promise<void> {
    await this.dynamicQrRepository.increment({ id }, 'totalScans', 1);
    await this.dynamicQrRepository.update(id, { lastScannedAt: new Date() });
  }

  async getDestinationUrl(shortCode: string): Promise<string | null> {
    const qr = await this.findByShortCode(shortCode);
    if (!qr) return null;

    // Check if expired
    if (qr.expiresAt && new Date() > qr.expiresAt) {
      return null;
    }

    // Check schedule
    if (qr.schedule?.enabled && qr.schedule.rules.length > 0) {
      const scheduledUrl = this.getScheduledUrl(qr.schedule);
      if (scheduledUrl) return scheduledUrl;
      return qr.schedule.defaultUrl;
    }

    return qr.destinationUrl;
  }

  private getScheduledUrl(schedule: DynamicQrCode['schedule']): string | null {
    if (!schedule) return null;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (const rule of schedule.rules) {
      if (rule.days.includes(currentDay)) {
        if (currentTime >= rule.startTime && currentTime <= rule.endTime) {
          return rule.url;
        }
      }
    }

    return null;
  }

  async generateQrImage(
    id: string,
    teamId: string,
    baseUrl: string,
  ): Promise<Buffer> {
    const qr = await this.findOne(id, teamId);
    const redirectUrl = `${baseUrl}/q/${qr.shortCode}`;

    return this.qrService.generate(redirectUrl, {
      ...qr.qrOptions,
      errorCorrectionLevel: 'H',
    }) as Promise<Buffer>;
  }

  async getStats(teamId: string): Promise<{
    total: number;
    active: number;
    totalScans: number;
    recentlyCreated: number;
  }> {
    const stats = await this.dynamicQrRepository
      .createQueryBuilder('qr')
      .select([
        'COUNT(*) as total',
        'SUM(CASE WHEN qr.isActive = true THEN 1 ELSE 0 END) as active',
        'SUM(qr.totalScans) as totalScans',
        `SUM(CASE WHEN qr.createdAt > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as recentlyCreated`,
      ])
      .where('qr.teamId = :teamId', { teamId })
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      totalScans: parseInt(stats.totalscans) || 0,
      recentlyCreated: parseInt(stats.recentlycreated) || 0,
    };
  }

  async bulkUpdateDestination(
    teamId: string,
    userId: string,
    ids: string[],
    newUrl: string,
    reason?: string,
  ): Promise<number> {
    let updated = 0;
    for (const id of ids) {
      try {
        await this.update(id, teamId, userId, {
          destinationUrl: newUrl,
          changeReason: reason,
        });
        updated++;
      } catch (e) {
        // Skip failed updates
      }
    }
    return updated;
  }

  async bulkDeactivate(teamId: string, ids: string[]): Promise<number> {
    const result = await this.dynamicQrRepository.update(
      { teamId, id: { $in: ids } as any },
      { isActive: false },
    );
    return result.affected || 0;
  }

  async getUrlHistory(id: string, teamId: string): Promise<DynamicQrCode['urlHistory']> {
    const qr = await this.findOne(id, teamId);
    return qr.urlHistory;
  }

  async duplicateQr(
    id: string,
    teamId: string,
    userId: string,
    newName?: string,
  ): Promise<DynamicQrCode> {
    const original = await this.findOne(id, teamId);

    return this.create(teamId, userId, {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      destinationUrl: original.destinationUrl,
      qrOptions: original.qrOptions,
      tags: original.tags,
      folderId: original.folderId,
      schedule: original.schedule,
    });
  }
}
