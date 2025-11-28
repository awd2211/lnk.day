import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  In,
  Like,
  MoreThanOrEqual,
  LessThanOrEqual,
  Not,
  IsNull,
} from 'typeorm';

import { Link, LinkStatus } from '../link/entities/link.entity';
import { LinkService } from '../link/link.service';
import {
  ImportLinksDto,
  ImportLinkItemDto,
  ImportResultDto,
} from './dto/import-links.dto';
import {
  ExportLinksQueryDto,
  ExportFormat,
  ExportSortField,
  ExportSortOrder,
  ParsedCsvRow,
  AVAILABLE_EXPORT_FIELDS,
} from './dto/export-links.dto';
import {
  BatchUpdateDto,
  BatchDeleteDto,
  BatchArchiveDto,
  BatchRestoreDto,
  BatchMoveToFolderDto,
  BatchOperationResultDto,
  BulkSelectQueryDto,
} from './dto/batch-edit.dto';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    private readonly linkService: LinkService,
  ) {}

  // ========== CSV 导入 ==========

  async importFromCsv(
    csvContent: string,
    userId: string,
    teamId: string,
    skipDuplicates: boolean = false,
  ): Promise<ImportResultDto> {
    const rows = this.parseCsv(csvContent);
    const links = rows.map((row) => this.csvRowToLinkItem(row));

    return this.importLinks({ links, skipDuplicates }, userId, teamId);
  }

  async importLinks(
    dto: ImportLinksDto,
    userId: string,
    teamId: string,
  ): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      totalProcessed: dto.links.length,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      createdLinks: [],
      errors: [],
    };

    for (let i = 0; i < dto.links.length; i++) {
      const item = dto.links[i]!;

      try {
        // 检查重复
        if (item.customSlug) {
          const existing = await this.linkService.findByShortCode(item.customSlug);
          if (existing) {
            if (dto.skipDuplicates) {
              result.skippedCount++;
              continue;
            }
            result.failedCount++;
            result.errors.push({
              row: i + 1,
              originalUrl: item.originalUrl,
              error: `Short code "${item.customSlug}" already exists`,
            });
            continue;
          }
        }

        // 构建 UTM 参数
        const utmParams =
          item.utmSource || item.utmMedium || item.utmCampaign
            ? {
                source: item.utmSource,
                medium: item.utmMedium,
                campaign: item.utmCampaign,
                content: item.utmContent,
                term: item.utmTerm,
              }
            : undefined;

        // 创建链接
        const link = await this.linkService.create(
          {
            originalUrl: item.originalUrl,
            customSlug: item.customSlug,
            title: item.title,
            tags: item.tags,
            folderId: item.folderId,
            utmParams,
          },
          userId,
          teamId,
        );

        result.successCount++;
        result.createdLinks.push({
          originalUrl: item.originalUrl,
          shortUrl: `https://${link.domain}/${link.shortCode}`,
          shortCode: link.shortCode,
        });
      } catch (error: any) {
        result.failedCount++;
        result.errors.push({
          row: i + 1,
          originalUrl: item.originalUrl,
          error: error.message || 'Unknown error',
        });
      }
    }

    return result;
  }

  // ========== CSV/Excel 导出 ==========

  async exportLinks(
    teamId: string,
    query: ExportLinksQueryDto,
  ): Promise<{ content: string | Buffer; filename: string; contentType: string }> {
    const links = await this.getLinksForExport(teamId, query);

    const format = query.format || ExportFormat.CSV;
    const timestamp = new Date().toISOString().split('T')[0];
    const prefix = query.filenamePrefix || 'links-export';

    if (format === ExportFormat.JSON) {
      return {
        content: JSON.stringify(this.formatLinksForExport(links, query), null, 2),
        filename: `${prefix}-${timestamp}.json`,
        contentType: 'application/json',
      };
    }

    if (format === ExportFormat.XLSX) {
      const xlsxContent = await this.linksToXlsx(links, query);
      return {
        content: xlsxContent,
        filename: `${prefix}-${timestamp}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    // CSV 格式
    const csvContent = this.linksToCsv(links, query);
    return {
      content: csvContent,
      filename: `${prefix}-${timestamp}.csv`,
      contentType: 'text/csv',
    };
  }

  private async getLinksForExport(
    teamId: string,
    query: ExportLinksQueryDto,
  ): Promise<Link[]> {
    const queryBuilder = this.linkRepository
      .createQueryBuilder('link')
      .where('link.teamId = :teamId', { teamId });

    // Folder filter
    if (query.folderId) {
      queryBuilder.andWhere('link.folderId = :folderId', { folderId: query.folderId });
    }

    // Status filter
    if (query.status) {
      queryBuilder.andWhere('link.status = :status', { status: query.status });
    }

    // Date range filter
    if (query.startDate) {
      queryBuilder.andWhere('link.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere('link.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    // Search filter
    if (query.search) {
      queryBuilder.andWhere(
        '(link.title ILIKE :search OR link.originalUrl ILIKE :search OR link.shortCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere('link.tags && ARRAY[:...tags]::varchar[]', {
        tags: query.tags,
      });
    }

    // Click count filter
    if (query.minClicks !== undefined) {
      queryBuilder.andWhere('link.totalClicks >= :minClicks', {
        minClicks: query.minClicks,
      });
    }
    if (query.maxClicks !== undefined) {
      queryBuilder.andWhere('link.totalClicks <= :maxClicks', {
        maxClicks: query.maxClicks,
      });
    }

    // Has expiry filter
    if (query.hasExpiry) {
      queryBuilder.andWhere('link.expiresAt IS NOT NULL');
    }

    // Has password filter
    if (query.hasPassword) {
      queryBuilder.andWhere('link.password IS NOT NULL');
    }

    // Sorting
    const sortField = query.sortBy || ExportSortField.CREATED_AT;
    const sortOrder = query.sortOrder?.toUpperCase() as 'ASC' | 'DESC' || 'DESC';
    queryBuilder.orderBy(`link.${sortField}`, sortOrder);

    // Limit
    const limit = Math.min(query.limit || 10000, 50000);
    queryBuilder.take(limit);

    return queryBuilder.getMany();
  }

  /**
   * Format links for JSON/API export
   */
  private formatLinksForExport(links: Link[], query: ExportLinksQueryDto): any[] {
    const fields = query.fields?.length ? query.fields : Object.keys(AVAILABLE_EXPORT_FIELDS);
    const dateFormat = query.dateFormat || 'YYYY-MM-DD HH:mm:ss';

    return links.map((link) => {
      const formatted: Record<string, any> = {};

      for (const field of fields) {
        let value = (link as any)[field];

        // Handle special fields
        if (field === 'tags' && Array.isArray(value)) {
          // Keep as array for JSON
        } else if (['createdAt', 'updatedAt', 'expiresAt', 'lastClickAt'].includes(field) && value) {
          value = this.formatDate(new Date(value), dateFormat);
        } else if (field === 'utmParams' && value) {
          // Flatten UTM params
          formatted['utmSource'] = value.source;
          formatted['utmMedium'] = value.medium;
          formatted['utmCampaign'] = value.campaign;
          formatted['utmContent'] = value.content;
          formatted['utmTerm'] = value.term;
          continue;
        } else if (field === 'hasPassword') {
          value = !!(link as any).password;
        } else if (field === 'hasExpiry') {
          value = !!(link as any).expiresAt;
        }

        formatted[field] = value ?? null;
      }

      return formatted;
    });
  }

  /**
   * Generate XLSX content
   */
  private async linksToXlsx(links: Link[], query: ExportLinksQueryDto): Promise<Buffer> {
    // Note: In production, use a library like 'xlsx' or 'exceljs'
    // For now, we'll create a simple XML-based XLSX structure
    // This is a simplified implementation - production should use proper library

    const fields = query.fields?.length
      ? query.fields
      : ['shortCode', 'originalUrl', 'title', 'domain', 'tags', 'totalClicks', 'status', 'createdAt'];

    const dateFormat = query.dateFormat || 'YYYY-MM-DD HH:mm:ss';
    const tagSeparator = query.tagSeparator || ';';

    // Create simple CSV as fallback (should use exceljs in production)
    const csvContent = this.linksToCsv(links, query);

    // For now, return CSV content as buffer
    // In production, use proper XLSX library
    return Buffer.from(csvContent, 'utf-8');
  }

  private linksToCsv(links: Link[], query: ExportLinksQueryDto): string {
    const defaultFields = [
      'shortCode',
      'originalUrl',
      'title',
      'domain',
      'tags',
      'totalClicks',
      'status',
      'createdAt',
    ];

    const exportFields = query.fields?.length ? query.fields : defaultFields;
    const tagSeparator = query.tagSeparator || ';';
    const dateFormat = query.dateFormat || 'YYYY-MM-DD HH:mm:ss';

    // Get display names for header if available
    const header = exportFields
      .map((field) => AVAILABLE_EXPORT_FIELDS[field as keyof typeof AVAILABLE_EXPORT_FIELDS] || field)
      .join(',');

    // CSV 行
    const rows = links.map((link) => {
      return exportFields
        .map((field) => {
          let value = (link as any)[field];

          // 处理特殊字段
          if (field === 'tags' && Array.isArray(value)) {
            value = value.join(tagSeparator);
          }
          if (['createdAt', 'updatedAt', 'expiresAt', 'lastClickAt'].includes(field) && value) {
            value = this.formatDate(new Date(value), dateFormat);
          }
          if (field === 'utmParams' && value) {
            value = JSON.stringify(value);
          }
          if (field === 'hasPassword') {
            value = !!(link as any).password ? '是' : '否';
          }
          if (field === 'hasExpiry') {
            value = !!(link as any).expiresAt ? '是' : '否';
          }

          // CSV 转义
          return this.escapeCsvValue(String(value ?? ''));
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Format date according to specified format
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  // ========== CSV 解析工具 ==========

  private parseCsv(csvContent: string): ParsedCsvRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must have a header row and at least one data row');
    }

    const headerLine = lines[0]!;
    const headers = this.parseCsvLine(headerLine).map((h) =>
      h.toLowerCase().trim(),
    );

    // 验证必需字段
    const urlIndex = headers.findIndex(
      (h) => h === 'originalurl' || h === 'url' || h === 'original_url',
    );
    if (urlIndex === -1) {
      throw new BadRequestException(
        'CSV must contain an "originalUrl" or "url" column',
      );
    }

    const rows: ParsedCsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);
      const row: ParsedCsvRow = {
        originalUrl: values[urlIndex] || '',
      };

      // 映射其他字段
      const slugIndex = headers.findIndex(
        (h) => h === 'customslug' || h === 'slug' || h === 'custom_slug' || h === 'shortcode',
      );
      if (slugIndex !== -1) row.customSlug = values[slugIndex];

      const titleIndex = headers.findIndex((h) => h === 'title');
      if (titleIndex !== -1) row.title = values[titleIndex];

      const tagsIndex = headers.findIndex((h) => h === 'tags');
      if (tagsIndex !== -1) row.tags = values[tagsIndex];

      const utmSourceIndex = headers.findIndex(
        (h) => h === 'utmsource' || h === 'utm_source',
      );
      if (utmSourceIndex !== -1) row.utmSource = values[utmSourceIndex];

      const utmMediumIndex = headers.findIndex(
        (h) => h === 'utmmedium' || h === 'utm_medium',
      );
      if (utmMediumIndex !== -1) row.utmMedium = values[utmMediumIndex];

      const utmCampaignIndex = headers.findIndex(
        (h) => h === 'utmcampaign' || h === 'utm_campaign',
      );
      if (utmCampaignIndex !== -1) row.utmCampaign = values[utmCampaignIndex];

      const folderIndex = headers.findIndex(
        (h) => h === 'folderid' || h === 'folder_id' || h === 'folder',
      );
      if (folderIndex !== -1) row.folderId = values[folderIndex];

      if (row.originalUrl) {
        rows.push(row);
      }
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  private csvRowToLinkItem(row: ParsedCsvRow): ImportLinkItemDto {
    return {
      originalUrl: row.originalUrl,
      customSlug: row.customSlug || undefined,
      title: row.title || undefined,
      tags: row.tags ? row.tags.split(';').map((t) => t.trim()).filter(Boolean) : undefined,
      utmSource: row.utmSource || undefined,
      utmMedium: row.utmMedium || undefined,
      utmCampaign: row.utmCampaign || undefined,
      folderId: row.folderId || undefined,
    };
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ========== CSV 模板生成 ==========

  getCsvTemplate(): string {
    const headers = [
      'originalUrl',
      'customSlug',
      'title',
      'tags',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'folderId',
    ];

    const exampleRow = [
      'https://example.com/my-page',
      'my-link',
      'My Link Title',
      'marketing;campaign',
      'newsletter',
      'email',
      'spring-sale',
      '',
    ];

    return [headers.join(','), exampleRow.join(',')].join('\n');
  }

  // ========== 批量编辑操作 ==========

  /**
   * 批量更新链接
   */
  async batchUpdate(
    dto: BatchUpdateDto,
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    const result: BatchOperationResultDto = {
      operation: 'update',
      totalProcessed: dto.linkIds.length,
      successCount: 0,
      failedCount: 0,
      successIds: [],
      errors: [],
    };

    // 验证所有链接属于该团队
    const links = await this.linkRepository.find({
      where: { id: In(dto.linkIds), teamId },
    });

    const foundIds = new Set(links.map((l) => l.id));
    const notFoundIds = dto.linkIds.filter((id) => !foundIds.has(id));

    for (const id of notFoundIds) {
      result.failedCount++;
      result.errors.push({ linkId: id, error: 'Link not found or unauthorized' });
    }

    // 批量更新找到的链接
    for (const link of links) {
      try {
        // 处理标签
        if (dto.setTags !== undefined) {
          link.tags = dto.setTags;
        } else {
          if (dto.addTags && dto.addTags.length > 0) {
            const existingTags = link.tags || [];
            link.tags = [...new Set([...existingTags, ...dto.addTags])];
          }
          if (dto.removeTags && dto.removeTags.length > 0) {
            link.tags = (link.tags || []).filter((t) => !dto.removeTags!.includes(t));
          }
        }

        // 处理文件夹
        if (dto.folderId !== undefined) {
          link.folderId = dto.folderId || undefined;
        }

        // 处理状态
        if (dto.status) {
          link.status = dto.status;
        }

        // 处理过期时间
        if (dto.removeExpiry) {
          link.expiresAt = undefined;
        } else if (dto.expiresAt) {
          link.expiresAt = dto.expiresAt;
        }

        link.updatedAt = new Date();
        await this.linkRepository.save(link);

        result.successCount++;
        result.successIds.push(link.id);
      } catch (error: any) {
        result.failedCount++;
        result.errors.push({ linkId: link.id, error: error.message });
      }
    }

    return result;
  }

  /**
   * 批量删除链接
   */
  async batchDelete(
    dto: BatchDeleteDto,
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    const result: BatchOperationResultDto = {
      operation: dto.permanent ? 'permanent_delete' : 'soft_delete',
      totalProcessed: dto.linkIds.length,
      successCount: 0,
      failedCount: 0,
      successIds: [],
      errors: [],
    };

    const links = await this.linkRepository.find({
      where: { id: In(dto.linkIds), teamId },
    });

    const foundIds = new Set(links.map((l) => l.id));
    const notFoundIds = dto.linkIds.filter((id) => !foundIds.has(id));

    for (const id of notFoundIds) {
      result.failedCount++;
      result.errors.push({ linkId: id, error: 'Link not found or unauthorized' });
    }

    for (const link of links) {
      try {
        if (dto.permanent) {
          await this.linkRepository.remove(link);
        } else {
          link.status = LinkStatus.INACTIVE;
          link.updatedAt = new Date();
          await this.linkRepository.save(link);
        }

        result.successCount++;
        result.successIds.push(link.id);
      } catch (error: any) {
        result.failedCount++;
        result.errors.push({ linkId: link.id, error: error.message });
      }
    }

    return result;
  }

  /**
   * 批量归档链接
   */
  async batchArchive(
    dto: BatchArchiveDto,
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    const result: BatchOperationResultDto = {
      operation: 'archive',
      totalProcessed: dto.linkIds.length,
      successCount: 0,
      failedCount: 0,
      successIds: [],
      errors: [],
    };

    const links = await this.linkRepository.find({
      where: { id: In(dto.linkIds), teamId },
    });

    const foundIds = new Set(links.map((l) => l.id));
    const notFoundIds = dto.linkIds.filter((id) => !foundIds.has(id));

    for (const id of notFoundIds) {
      result.failedCount++;
      result.errors.push({ linkId: id, error: 'Link not found or unauthorized' });
    }

    for (const link of links) {
      try {
        link.status = LinkStatus.INACTIVE;
        link.updatedAt = new Date();
        await this.linkRepository.save(link);

        result.successCount++;
        result.successIds.push(link.id);
      } catch (error: any) {
        result.failedCount++;
        result.errors.push({ linkId: link.id, error: error.message });
      }
    }

    return result;
  }

  /**
   * 批量恢复链接
   */
  async batchRestore(
    dto: BatchRestoreDto,
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    const result: BatchOperationResultDto = {
      operation: 'restore',
      totalProcessed: dto.linkIds.length,
      successCount: 0,
      failedCount: 0,
      successIds: [],
      errors: [],
    };

    const links = await this.linkRepository.find({
      where: {
        id: In(dto.linkIds),
        teamId,
        status: LinkStatus.INACTIVE,
      },
    });

    const foundIds = new Set(links.map((l) => l.id));
    const notFoundIds = dto.linkIds.filter((id) => !foundIds.has(id));

    for (const id of notFoundIds) {
      result.failedCount++;
      result.errors.push({ linkId: id, error: 'Link not found, unauthorized, or not inactive' });
    }

    for (const link of links) {
      try {
        link.status = LinkStatus.ACTIVE;
        link.updatedAt = new Date();
        await this.linkRepository.save(link);

        result.successCount++;
        result.successIds.push(link.id);
      } catch (error: any) {
        result.failedCount++;
        result.errors.push({ linkId: link.id, error: error.message });
      }
    }

    return result;
  }

  /**
   * 批量移动到文件夹
   */
  async batchMoveToFolder(
    dto: BatchMoveToFolderDto,
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    const result: BatchOperationResultDto = {
      operation: 'move_to_folder',
      totalProcessed: dto.linkIds.length,
      successCount: 0,
      failedCount: 0,
      successIds: [],
      errors: [],
    };

    // 批量更新
    try {
      const updateResult = await this.linkRepository.update(
        { id: In(dto.linkIds), teamId },
        { folderId: dto.folderId || undefined, updatedAt: new Date() },
      );

      result.successCount = updateResult.affected || 0;
      result.failedCount = dto.linkIds.length - result.successCount;

      // 获取成功更新的ID
      if (result.successCount > 0) {
        const updatedLinks = await this.linkRepository.find({
          where: { id: In(dto.linkIds), teamId },
          select: ['id'],
        });
        result.successIds = updatedLinks.map((l) => l.id);
      }

      // 记录失败的ID
      const successIdSet = new Set(result.successIds);
      for (const id of dto.linkIds) {
        if (!successIdSet.has(id)) {
          result.errors.push({ linkId: id, error: 'Link not found or unauthorized' });
        }
      }
    } catch (error: any) {
      result.failedCount = dto.linkIds.length;
      for (const id of dto.linkIds) {
        result.errors.push({ linkId: id, error: error.message });
      }
    }

    return result;
  }

  /**
   * 根据条件批量选择链接ID
   */
  async bulkSelectIds(
    query: BulkSelectQueryDto,
    teamId: string,
  ): Promise<{ ids: string[]; total: number }> {
    const where: any = { teamId };

    if (query.folderId) {
      where.folderId = query.folderId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.createdAfter) {
      where.createdAt = MoreThanOrEqual(new Date(query.createdAfter));
    }

    if (query.createdBefore) {
      if (where.createdAt) {
        where.createdAt = Between(
          new Date(query.createdAfter!),
          new Date(query.createdBefore),
        );
      } else {
        where.createdAt = LessThanOrEqual(new Date(query.createdBefore));
      }
    }

    let queryBuilder = this.linkRepository
      .createQueryBuilder('link')
      .select('link.id')
      .where(where);

    // 标签过滤
    if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim());
      // PostgreSQL array overlap
      queryBuilder = queryBuilder.andWhere(
        'link.tags && ARRAY[:...tags]::varchar[]',
        { tags: tagList },
      );
    }

    // 搜索
    if (query.search) {
      queryBuilder = queryBuilder.andWhere(
        '(link.title ILIKE :search OR link.originalUrl ILIKE :search OR link.shortCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const limit = Math.min(query.limit || 500, 500);

    const [links, total] = await queryBuilder
      .orderBy('link.createdAt', 'DESC')
      .take(limit)
      .getManyAndCount();

    return {
      ids: links.map((l) => l.id),
      total,
    };
  }

  /**
   * 批量添加标签
   */
  async batchAddTags(
    linkIds: string[],
    tags: string[],
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchUpdate(
      { linkIds, addTags: tags },
      teamId,
    );
  }

  /**
   * 批量移除标签
   */
  async batchRemoveTags(
    linkIds: string[],
    tags: string[],
    teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchUpdate(
      { linkIds, removeTags: tags },
      teamId,
    );
  }
}
