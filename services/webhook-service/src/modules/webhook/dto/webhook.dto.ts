import { IsString, IsEnum, IsOptional, IsUrl, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookPlatform, WebhookEvent } from '../entities/webhook.entity';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook 名称' })
  @IsString()
  name: string;

  @ApiProperty({ enum: WebhookPlatform, description: '平台类型' })
  @IsEnum(WebhookPlatform)
  platform: WebhookPlatform;

  @ApiProperty({ description: 'Webhook URL' })
  @IsUrl()
  webhookUrl: string;

  @ApiProperty({ description: '事件类型' })
  @IsString()
  event: WebhookEvent;

  @ApiPropertyOptional({ description: '过滤器配置' })
  @IsOptional()
  @IsObject()
  filters?: {
    linkIds?: string[];
    pageIds?: string[];
    campaignIds?: string[];
    tags?: string[];
    conditions?: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith';
      value: any;
    }>;
  };

  @ApiPropertyOptional({ description: '自定义请求头' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: '自定义签名密钥' })
  @IsOptional()
  @IsString()
  secret?: string;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook 名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: '事件类型' })
  @IsOptional()
  @IsString()
  event?: WebhookEvent;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '过滤器配置' })
  @IsOptional()
  @IsObject()
  filters?: {
    linkIds?: string[];
    pageIds?: string[];
    campaignIds?: string[];
    tags?: string[];
    conditions?: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith';
      value: any;
    }>;
  };

  @ApiPropertyOptional({ description: '自定义请求头' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

export class FireWebhookDto {
  @ApiProperty({ description: '事件类型' })
  @IsString()
  event: WebhookEvent;

  @ApiProperty({ description: '团队 ID' })
  @IsString()
  teamId: string;

  @ApiProperty({ description: '事件数据' })
  @IsObject()
  data: Record<string, any>;
}

export class WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}
