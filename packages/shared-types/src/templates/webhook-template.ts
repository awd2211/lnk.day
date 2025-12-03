/**
 * Webhook Template types
 * Used for configuring webhook integrations (Slack, Discord, Teams, Custom)
 */

import { BaseTemplate, BaseCreateTemplateDto } from './base';

export type WebhookPlatform = 'slack' | 'discord' | 'teams' | 'custom';

export type WebhookMethod = 'GET' | 'POST' | 'PUT';

export interface SlackConfig {
  channel?: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
}

export interface DiscordConfig {
  username?: string;
  avatarUrl?: string;
}

export interface TeamsConfig {
  themeColor?: string;
  sections?: any[];
}

export interface WebhookTemplate extends BaseTemplate {
  platform: WebhookPlatform;
  url?: string;
  method: WebhookMethod;
  headers?: Record<string, string>;
  slackConfig?: SlackConfig;
  discordConfig?: DiscordConfig;
  teamsConfig?: TeamsConfig;
  payloadTemplate?: Record<string, any>;
}

export interface CreateWebhookTemplateDto extends BaseCreateTemplateDto {
  platform: WebhookPlatform;
  url?: string;
  method?: WebhookMethod;
  headers?: Record<string, string>;
  slackConfig?: SlackConfig;
  discordConfig?: DiscordConfig;
  teamsConfig?: TeamsConfig;
  payloadTemplate?: Record<string, any>;
}
