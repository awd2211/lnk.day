import { IsString, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ========== OAuth DTOs ==========

export class SlackOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Slack' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Error from OAuth flow' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class InitiateSlackOAuthDto {
  @ApiProperty({ description: 'Team ID to associate with installation' })
  @IsString()
  teamId: string;

  @ApiPropertyOptional({ description: 'Redirect URL after installation' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

// ========== Slash Command DTOs ==========

export class SlashCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  enterprise_id?: string;
  enterprise_name?: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install?: string;
  response_url: string;
  trigger_id: string;
}

// ========== Interactive Message DTOs ==========

export class InteractivePayload {
  type: 'block_actions' | 'view_submission' | 'shortcut' | 'message_action';
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  api_app_id: string;
  token: string;
  container?: {
    type: string;
    message_ts: string;
    channel_id: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  message?: {
    type: string;
    ts: string;
    text: string;
  };
  view?: {
    id: string;
    type: string;
    callback_id: string;
    state: {
      values: Record<string, Record<string, any>>;
    };
    private_metadata?: string;
  };
  actions?: Array<{
    action_id: string;
    block_id: string;
    type: string;
    value?: string;
    selected_option?: { value: string };
  }>;
  trigger_id: string;
  response_url?: string;
  team: {
    id: string;
    domain: string;
    enterprise_id?: string;
    enterprise_name?: string;
  };
}

// ========== Event DTOs ==========

export class SlackEventPayload {
  token: string;
  challenge?: string; // URL verification
  type: 'url_verification' | 'event_callback';
  team_id?: string;
  api_app_id?: string;
  event?: {
    type: string;
    user?: string;
    channel?: string;
    text?: string;
    ts?: string;
    event_ts?: string;
    channel_type?: string;
  };
  event_id?: string;
  event_time?: number;
  authorizations?: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }>;
}

// ========== Settings DTOs ==========

export class UpdateSlackSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnLinkCreate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnMilestone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnAlert?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklyReport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  milestoneThresholds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultChannelId?: string;
}

// ========== Link Creation Modal DTOs ==========

export class CreateLinkFromSlackDto {
  originalUrl: string;
  customAlias?: string;
  title?: string;
  tags?: string[];
  expiresAt?: string;
}

// ========== Response Types ==========

export interface SlackApiResponse<T = any> {
  ok: boolean;
  error?: string;
  warning?: string;
  response_metadata?: {
    next_cursor?: string;
    scopes?: string[];
  };
  data?: T;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_member: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    email?: string;
    image_48?: string;
  };
}
