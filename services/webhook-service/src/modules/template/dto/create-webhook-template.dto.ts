import { IsString, IsOptional, IsEnum, IsObject, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookPlatform, WebhookEvent } from '../../webhook/entities/webhook.entity';

export class CreateWebhookTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '平台类型', enum: WebhookPlatform })
  @IsOptional()
  @IsEnum(WebhookPlatform)
  platform?: WebhookPlatform;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: '默认事件类型' })
  @IsOptional()
  @IsString()
  defaultEvent?: WebhookEvent;

  @ApiPropertyOptional({ description: '密钥' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: '默认过滤条件' })
  @IsOptional()
  @IsObject()
  defaultFilters?: {
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

  @ApiPropertyOptional({ description: '默认请求头' })
  @IsOptional()
  @IsObject()
  defaultHeaders?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Slack 配置' })
  @IsOptional()
  @IsObject()
  slackConfig?: {
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Discord 配置' })
  @IsOptional()
  @IsObject()
  discordConfig?: {
    username?: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional({ description: 'Teams 配置' })
  @IsOptional()
  @IsObject()
  teamsConfig?: {
    title?: string;
    themeColor?: string;
  };

  @ApiPropertyOptional({ description: '消息模板' })
  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @ApiPropertyOptional({ description: 'Payload 模板' })
  @IsOptional()
  @IsObject()
  payloadTemplate?: Record<string, any>;
}
