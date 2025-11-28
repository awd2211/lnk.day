import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

import { LinkStatus } from '../../link/entities/link.entity';

/**
 * Batch operation types
 */
export enum BatchOperation {
  UPDATE = 'update',
  DELETE = 'delete',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  MOVE_TO_FOLDER = 'move_to_folder',
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags',
  SET_TAGS = 'set_tags',
  SET_EXPIRY = 'set_expiry',
  REMOVE_EXPIRY = 'remove_expiry',
  ENABLE_PASSWORD = 'enable_password',
  DISABLE_PASSWORD = 'disable_password',
}

/**
 * Batch update request
 */
export class BatchUpdateDto {
  @ApiProperty({
    type: [String],
    description: '要更新的链接ID列表',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  linkIds: string[];

  @ApiPropertyOptional({
    description: '要添加的标签',
    example: ['marketing', 'campaign'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addTags?: string[];

  @ApiPropertyOptional({
    description: '要移除的标签',
    example: ['old-tag'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeTags?: string[];

  @ApiPropertyOptional({
    description: '替换所有标签',
    example: ['new-tag-1', 'new-tag-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  setTags?: string[];

  @ApiPropertyOptional({
    description: '移动到文件夹ID',
    example: 'folder-uuid',
  })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({
    description: '设置链接状态',
    enum: LinkStatus,
  })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiPropertyOptional({
    description: '设置过期时间',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: '移除过期时间',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  removeExpiry?: boolean;
}

/**
 * Batch delete request
 */
export class BatchDeleteDto {
  @ApiProperty({
    type: [String],
    description: '要删除的链接ID列表',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  linkIds: string[];

  @ApiPropertyOptional({
    description: '永久删除而非软删除',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean;
}

/**
 * Batch archive request
 */
export class BatchArchiveDto {
  @ApiProperty({
    type: [String],
    description: '要归档的链接ID列表',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  linkIds: string[];
}

/**
 * Batch restore request
 */
export class BatchRestoreDto {
  @ApiProperty({
    type: [String],
    description: '要恢复的链接ID列表',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  linkIds: string[];
}

/**
 * Batch move to folder request
 */
export class BatchMoveToFolderDto {
  @ApiProperty({
    type: [String],
    description: '要移动的链接ID列表',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  linkIds: string[];

  @ApiProperty({
    description: '目标文件夹ID，为null则移到根目录',
    example: 'folder-uuid',
  })
  @IsOptional()
  @IsString()
  folderId?: string | null;
}

/**
 * Batch operation result
 */
export class BatchOperationResultDto {
  @ApiProperty({ description: '操作类型' })
  operation: string;

  @ApiProperty({ description: '处理总数' })
  totalProcessed: number;

  @ApiProperty({ description: '成功数' })
  successCount: number;

  @ApiProperty({ description: '失败数' })
  failedCount: number;

  @ApiProperty({ description: '成功的链接ID列表' })
  successIds: string[];

  @ApiProperty({ description: '失败详情' })
  errors: Array<{
    linkId: string;
    error: string;
  }>;
}

/**
 * Bulk select query (for selecting links based on filters)
 */
export class BulkSelectQueryDto {
  @ApiPropertyOptional({ description: '文件夹ID' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: '标签过滤（逗号分隔）' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '状态过滤', enum: LinkStatus })
  @IsOptional()
  @IsEnum(LinkStatus)
  status?: LinkStatus;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '创建时间起始' })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: '创建时间截止' })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: '最大返回数量', default: 500 })
  @IsOptional()
  limit?: number;
}
