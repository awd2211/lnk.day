import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx',
}

export enum ExportSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  CLICKS = 'totalClicks',
  TITLE = 'title',
  SHORT_CODE = 'shortCode',
}

export enum ExportSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Available export fields with display names
 */
export const AVAILABLE_EXPORT_FIELDS = {
  // Basic info
  id: '链接ID',
  shortCode: '短码',
  originalUrl: '原始链接',
  title: '标题',
  description: '描述',
  domain: '域名',

  // Organization
  tags: '标签',
  folderId: '文件夹ID',
  folderName: '文件夹名称',

  // Status
  status: '状态',
  expiresAt: '过期时间',

  // Analytics
  totalClicks: '总点击数',
  uniqueClicks: '独立访客',
  lastClickAt: '最后点击时间',

  // UTM
  utmSource: 'UTM Source',
  utmMedium: 'UTM Medium',
  utmCampaign: 'UTM Campaign',
  utmContent: 'UTM Content',
  utmTerm: 'UTM Term',

  // QR
  hasQrCode: '有QR码',
  qrScans: 'QR扫描数',

  // Security
  hasPassword: '密码保护',
  hasExpiry: '有过期时间',

  // Timestamps
  createdAt: '创建时间',
  updatedAt: '更新时间',

  // Creator
  createdBy: '创建者',
} as const;

export class ExportLinksQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({ example: 'folder-uuid' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ example: ['marketing', 'blog'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: ['originalUrl', 'shortCode', 'title', 'totalClicks', 'createdAt'],
    description: 'Fields to include in export',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  // ========== Advanced Options ==========

  @ApiPropertyOptional({
    description: '搜索关键词过滤',
    example: 'marketing',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ExportSortField,
    default: ExportSortField.CREATED_AT,
    description: '排序字段',
  })
  @IsOptional()
  @IsEnum(ExportSortField)
  sortBy?: ExportSortField = ExportSortField.CREATED_AT;

  @ApiPropertyOptional({
    enum: ExportSortOrder,
    default: ExportSortOrder.DESC,
    description: '排序方向',
  })
  @IsOptional()
  @IsEnum(ExportSortOrder)
  sortOrder?: ExportSortOrder = ExportSortOrder.DESC;

  @ApiPropertyOptional({
    description: '最大导出数量 (最大 50000)',
    default: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50000)
  limit?: number = 10000;

  @ApiPropertyOptional({
    description: '是否包含分析数据',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeAnalytics?: boolean = false;

  @ApiPropertyOptional({
    description: '点击数最小值过滤',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minClicks?: number;

  @ApiPropertyOptional({
    description: '点击数最大值过滤',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxClicks?: number;

  @ApiPropertyOptional({
    description: '只导出有过期时间的链接',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasExpiry?: boolean;

  @ApiPropertyOptional({
    description: '只导出有密码保护的链接',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasPassword?: boolean;

  @ApiPropertyOptional({
    description: '导出文件名前缀',
    example: 'my-links',
  })
  @IsOptional()
  @IsString()
  filenamePrefix?: string;

  @ApiPropertyOptional({
    description: '时间戳格式 (Excel)',
    example: 'YYYY-MM-DD HH:mm:ss',
  })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({
    description: '标签分隔符 (CSV)',
    default: ';',
  })
  @IsOptional()
  @IsString()
  tagSeparator?: string = ';';
}

/**
 * Export preset configuration
 */
export class ExportPresetDto {
  @ApiPropertyOptional({ description: '预设名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '预设描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '导出配置' })
  config: ExportLinksQueryDto;
}

/**
 * Scheduled export configuration
 */
export class ScheduledExportDto {
  @ApiPropertyOptional({ description: '调度名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '导出配置' })
  config: ExportLinksQueryDto;

  @ApiPropertyOptional({
    description: 'Cron 表达式',
    example: '0 0 * * 1', // Every Monday at midnight
  })
  @IsString()
  schedule: string;

  @ApiPropertyOptional({
    description: '接收邮件地址',
    example: ['user@example.com'],
  })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({
    description: '是否启用',
    default: true,
  })
  @IsBoolean()
  enabled?: boolean = true;
}

export class ParsedCsvRow {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  tags?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  folderId?: string;
}
