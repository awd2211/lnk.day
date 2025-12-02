import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { WebhookTemplatePlatform } from '../entities/webhook-template-preset.entity';

export class CreateWebhookTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ['slack', 'discord', 'teams', 'custom'] })
  @IsOptional()
  @IsEnum(['slack', 'discord', 'teams', 'custom'])
  platform?: WebhookTemplatePlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ enum: ['GET', 'POST', 'PUT'] })
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT'])
  method?: 'GET' | 'POST' | 'PUT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  slackConfig?: {
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  discordConfig?: {
    username?: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  teamsConfig?: {
    themeColor?: string;
    sections?: any[];
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payloadTemplate?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateWebhookTemplateDto extends PartialType(CreateWebhookTemplateDto) {}
