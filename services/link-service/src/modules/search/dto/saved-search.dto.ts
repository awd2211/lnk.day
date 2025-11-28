import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SavedSearchVisibility,
  SearchFilters,
  SearchSort,
  NotificationSettings,
} from '../entities/saved-search.entity';

export class SearchFiltersDto implements SearchFilters {
  @ApiPropertyOptional({ example: ['lnk.day', 'brand.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @ApiPropertyOptional({ example: ['marketing', 'campaign'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: ['active', 'expired'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaignIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  folderIds?: string[];

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  minClicks?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  maxClicks?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class SearchSortDto implements SearchSort {
  @ApiProperty({ example: 'createdAt' })
  @IsString()
  field: string;

  @ApiProperty({ enum: ['asc', 'desc'], example: 'desc' })
  @IsEnum(['asc', 'desc'])
  order: 'asc' | 'desc';
}

export class NotificationSettingsDto implements NotificationSettings {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: ['daily', 'weekly', 'on_match'], example: 'daily' })
  @IsEnum(['daily', 'weekly', 'on_match'])
  frequency: 'daily' | 'weekly' | 'on_match';

  @ApiProperty({ example: ['user@example.com'] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({ example: 10, description: '新结果数量阈值，超过才发送通知' })
  @IsOptional()
  @IsNumber()
  threshold?: number;
}

export class CreateSavedSearchDto {
  @ApiProperty({ example: '高点击营销链接' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '点击量超过1000的营销活动链接' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '营销活动' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ type: SearchFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @ApiPropertyOptional({ type: SearchSortDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchSortDto)
  sort?: SearchSortDto;

  @ApiPropertyOptional({
    enum: SavedSearchVisibility,
    default: SavedSearchVisibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(SavedSearchVisibility)
  visibility?: SavedSearchVisibility;

  @ApiPropertyOptional({ type: NotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notification?: NotificationSettingsDto;
}

export class UpdateSavedSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ type: SearchFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @ApiPropertyOptional({ type: SearchSortDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchSortDto)
  sort?: SearchSortDto;

  @ApiPropertyOptional({ enum: SavedSearchVisibility })
  @IsOptional()
  @IsEnum(SavedSearchVisibility)
  visibility?: SavedSearchVisibility;

  @ApiPropertyOptional({ type: NotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notification?: NotificationSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class SavedSearchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  query?: string;

  @ApiPropertyOptional()
  filters?: SearchFilters;

  @ApiPropertyOptional()
  sort?: SearchSort;

  @ApiProperty({ enum: SavedSearchVisibility })
  visibility: SavedSearchVisibility;

  @ApiPropertyOptional()
  notification?: NotificationSettings;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty()
  usageCount: number;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiPropertyOptional()
  lastResultCount?: number;

  @ApiProperty()
  createdAt: Date;
}
