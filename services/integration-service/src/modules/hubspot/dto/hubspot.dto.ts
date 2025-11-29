import { IsString, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ========== OAuth DTOs ==========

export class HubSpotOAuthCallbackDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
}

export class InitiateHubSpotOAuthDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

// ========== Settings DTOs ==========

export class UpdateHubSpotSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncContacts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncDeals?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  logActivities?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCreateContacts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customPropertyMapping?: Record<string, string>;
}

// ========== Contact DTOs ==========

export class CreateHubSpotContactDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customProperties?: Record<string, any>;
}

export class UpdateHubSpotContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customProperties?: Record<string, any>;
}

// ========== Activity DTOs ==========

export class LogHubSpotActivityDto {
  @ApiProperty()
  @IsString()
  contactId: string;

  @ApiProperty({ enum: ['link_click', 'link_created', 'conversion', 'custom'] })
  @IsString()
  activityType: 'link_click' | 'link_created' | 'conversion' | 'custom';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ========== Deal DTOs ==========

export class AssociateLinkToDealDto {
  @ApiProperty()
  @IsString()
  dealId: string;

  @ApiProperty()
  @IsString()
  linkId: string;
}

// ========== Webhook DTOs ==========

export class HubSpotWebhookEvent {
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  eventType: string;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource: string;
  subscriptionType: string;
}

// ========== Response Types ==========

export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount?: string;
    dealstage: string;
    closedate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface HubSpotApiResponse<T = any> {
  results?: T[];
  paging?: {
    next?: { after: string };
  };
  total?: number;
}
