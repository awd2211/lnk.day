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
} from 'class-validator';
import { WebhookEventType } from '../entities/webhook-endpoint.entity';

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
