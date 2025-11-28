import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEventType, WebhookFilters } from '../entities/webhook-endpoint.entity';

export class WebhookThresholdDto {
  @ApiProperty({ enum: ['clicks', 'conversions', 'revenue'] })
  @IsString()
  metric: 'clicks' | 'conversions' | 'revenue';

  @ApiProperty({ enum: ['gt', 'gte', 'lt', 'lte', 'eq'] })
  @IsString()
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

  @ApiProperty({ example: 1000 })
  value: number;
}

export class WebhookFiltersDto implements WebhookFilters {
  @ApiPropertyOptional({
    example: ['marketing', 'campaign'],
    description: '按标签过滤，只有包含这些标签的链接事件才会触发',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: ['link_abc123', 'link_xyz789'],
    description: '按链接ID过滤，只有这些链接的事件才会触发',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkIds?: string[];

  @ApiPropertyOptional({
    example: ['campaign_123'],
    description: '按营销活动ID过滤',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaignIds?: string[];

  @ApiPropertyOptional({
    example: ['lnk.day', 'brand.com'],
    description: '按域名过滤',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @ApiPropertyOptional({
    description: '阈值条件，例如点击数超过1000时触发',
    type: WebhookThresholdDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookThresholdDto)
  threshold?: WebhookThresholdDto;
}

export class CreateWebhookDto {
  @ApiProperty({ example: 'My Webhook' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'https://api.example.com/webhooks/lnkday' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    enum: WebhookEventType,
    isArray: true,
    example: ['link.created', 'link.clicked'],
  })
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events: WebhookEventType[];

  @ApiPropertyOptional({ example: 'Webhook for link events' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: { 'X-Custom-Header': 'value' } })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: '事件过滤器配置',
    type: WebhookFiltersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookFiltersDto)
  filters?: WebhookFiltersDto;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'Updated Webhook Name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://api.example.com/webhooks/new-url' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    enum: WebhookEventType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events?: WebhookEventType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: '事件过滤器配置',
    type: WebhookFiltersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookFiltersDto)
  filters?: WebhookFiltersDto;
}

export class WebhookResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ enum: WebhookEventType, isArray: true })
  events: WebhookEventType[];

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty({ nullable: true })
  lastTriggeredAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class TestWebhookDto {
  @ApiProperty({
    enum: WebhookEventType,
    example: WebhookEventType.LINK_CREATED,
  })
  @IsEnum(WebhookEventType)
  event: WebhookEventType;
}
