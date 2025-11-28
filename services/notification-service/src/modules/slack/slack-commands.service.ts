import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { SlackOAuthService } from './slack-oauth.service';
import { SlackInstallation } from './entities/slack-installation.entity';
import { SlashCommandPayload, InteractivePayload } from './dto/slack.dto';

interface LinkServiceResponse {
  id: string;
  shortUrl: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  createdAt: string;
}

interface LinkStats {
  totalClicks: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
  recentClicks: Array<{ timestamp: string; country?: string; device?: string }>;
}

@Injectable()
export class SlackCommandsService {
  private readonly logger = new Logger(SlackCommandsService.name);
  private readonly linkServiceUrl: string;
  private readonly analyticsServiceUrl: string;
  private readonly appBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: SlackOAuthService,
  ) {
    this.linkServiceUrl = this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003');
    this.analyticsServiceUrl = this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:8000');
    this.appBaseUrl = this.configService.get('APP_BASE_URL', 'https://app.lnk.day');
  }

  // Handle /lnk slash command
  async handleSlashCommand(payload: SlashCommandPayload): Promise<any> {
    const installation = await this.oauthService.getInstallationBySlackTeamId(payload.team_id);

    if (!installation) {
      return {
        response_type: 'ephemeral',
        text: '❌ lnk.day is not connected to this workspace. Please install the app first.',
      };
    }

    const [command, ...args] = payload.text.trim().split(/\s+/);
    const argText = args.join(' ');

    switch (command?.toLowerCase()) {
      case 'create':
      case 'shorten':
        return this.handleCreateCommand(installation, argText, payload);

      case 'stats':
        return this.handleStatsCommand(installation, argText, payload);

      case 'search':
      case 'find':
        return this.handleSearchCommand(installation, argText, payload);

      case 'recent':
      case 'list':
        return this.handleListCommand(installation, payload);

      case 'help':
      default:
        return this.getHelpMessage();
    }
  }

  // Handle create link command: /lnk create https://example.com
  private async handleCreateCommand(
    installation: SlackInstallation,
    url: string,
    payload: SlashCommandPayload,
  ): Promise<any> {
    if (!url) {
      return {
        response_type: 'ephemeral',
        text: '❌ Please provide a URL to shorten.\nUsage: `/lnk create https://example.com`',
      };
    }

    // Validate URL
    if (!this.isValidUrl(url)) {
      return {
        response_type: 'ephemeral',
        text: '❌ Invalid URL. Please provide a valid URL starting with http:// or https://',
      };
    }

    try {
      // Create link via link-service
      const response = await axios.post(
        `${this.linkServiceUrl}/links`,
        {
          originalUrl: url,
          title: `Created from Slack by ${payload.user_name}`,
          metadata: {
            source: 'slack',
            slackUserId: payload.user_id,
            slackUserName: payload.user_name,
            slackChannelId: payload.channel_id,
          },
        },
        {
          headers: {
            'X-Team-Id': installation.teamId,
            'X-Internal-Service': 'notification-service',
          },
        },
      );

      const link: LinkServiceResponse = response.data;

      return {
        response_type: 'in_channel',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Link created successfully!*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🔗 <${link.shortUrl}|${link.shortUrl}>\n📎 ${link.originalUrl}`,
            },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: '📊 View Stats' },
              action_id: 'view_stats',
              value: link.id,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Created by <@${payload.user_id}>`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to create link: ${error.message}`);
      return {
        response_type: 'ephemeral',
        text: `❌ Failed to create link: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  // Handle stats command: /lnk stats <link-id-or-url>
  private async handleStatsCommand(
    installation: SlackInstallation,
    query: string,
    payload: SlashCommandPayload,
  ): Promise<any> {
    if (!query) {
      return {
        response_type: 'ephemeral',
        text: '❌ Please provide a link ID or short URL.\nUsage: `/lnk stats abc123`',
      };
    }

    try {
      // Get link info
      const linkResponse = await axios.get(`${this.linkServiceUrl}/links/resolve/${query}`, {
        headers: {
          'X-Team-Id': installation.teamId,
          'X-Internal-Service': 'notification-service',
        },
      });

      const link: LinkServiceResponse = linkResponse.data;

      // Get analytics
      const statsResponse = await axios.get(`${this.analyticsServiceUrl}/api/links/${link.id}/stats`, {
        params: { period: '7d' },
      });

      const stats: LinkStats = statsResponse.data;

      const topCountriesText = stats.topCountries
        ?.slice(0, 3)
        .map((c) => `${this.countryFlag(c.country)} ${c.country}: ${c.clicks}`)
        .join('\n') || 'No data yet';

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📊 Link Statistics' },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${link.title || link.shortUrl}*\n<${link.shortUrl}|${link.shortUrl}>`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Total Clicks*\n${stats.totalClicks.toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*Unique Visitors*\n${stats.uniqueVisitors.toLocaleString()}`,
              },
            ],
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Top Countries (7 days)*\n${topCountriesText}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `<${this.appBaseUrl}/links/${link.id}|View full analytics in dashboard>`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return {
        response_type: 'ephemeral',
        text: `❌ Could not find link or retrieve stats. Please check the link ID or URL.`,
      };
    }
  }

  // Handle search command: /lnk search <query>
  private async handleSearchCommand(
    installation: SlackInstallation,
    query: string,
    payload: SlashCommandPayload,
  ): Promise<any> {
    if (!query) {
      return {
        response_type: 'ephemeral',
        text: '❌ Please provide a search query.\nUsage: `/lnk search marketing`',
      };
    }

    try {
      const response = await axios.get(`${this.linkServiceUrl}/links/search`, {
        params: { q: query, limit: 5 },
        headers: {
          'X-Team-Id': installation.teamId,
          'X-Internal-Service': 'notification-service',
        },
      });

      const links: LinkServiceResponse[] = response.data.items || [];

      if (links.length === 0) {
        return {
          response_type: 'ephemeral',
          text: `🔍 No links found matching "${query}"`,
        };
      }

      const linkBlocks = links.map((link) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${link.title || 'Untitled'}*\n<${link.shortUrl}|${link.shortUrl}> · ${link.clicks} clicks`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Copy' },
          action_id: 'copy_link',
          value: link.shortUrl,
        },
      }));

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `🔍 Search Results for "${query}"` },
          },
          ...linkBlocks,
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Found ${links.length} results · <${this.appBaseUrl}/links?search=${encodeURIComponent(query)}|View all in dashboard>`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to search: ${error.message}`);
      return {
        response_type: 'ephemeral',
        text: '❌ Search failed. Please try again.',
      };
    }
  }

  // Handle list command: /lnk recent
  private async handleListCommand(
    installation: SlackInstallation,
    payload: SlashCommandPayload,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.linkServiceUrl}/links`, {
        params: { limit: 5, sortBy: 'createdAt', sortOrder: 'DESC' },
        headers: {
          'X-Team-Id': installation.teamId,
          'X-Internal-Service': 'notification-service',
        },
      });

      const links: LinkServiceResponse[] = response.data.items || [];

      if (links.length === 0) {
        return {
          response_type: 'ephemeral',
          text: '📭 No links yet. Create one with `/lnk create https://example.com`',
        };
      }

      const linkBlocks = links.map((link) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${link.title || 'Untitled'}*\n<${link.shortUrl}|${link.shortUrl}> · ${link.clicks} clicks · ${this.formatDate(link.createdAt)}`,
        },
      }));

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📋 Recent Links' },
          },
          ...linkBlocks,
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '➕ Create New Link' },
                action_id: 'open_create_modal',
                style: 'primary',
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '📊 View Dashboard' },
                action_id: 'open_dashboard',
                url: `${this.appBaseUrl}/links`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to list links: ${error.message}`);
      return {
        response_type: 'ephemeral',
        text: '❌ Failed to retrieve links. Please try again.',
      };
    }
  }

  // Help message
  private getHelpMessage(): any {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔗 lnk.day - Slash Commands' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Available Commands:*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '`/lnk create <url>` - Create a new short link\n`/lnk stats <id>` - View link statistics\n`/lnk search <query>` - Search your links\n`/lnk recent` - Show recent links\n`/lnk help` - Show this help message',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Examples:*\n`/lnk create https://example.com/long-url`\n`/lnk stats abc123`\n`/lnk search marketing`',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Need help? <${this.appBaseUrl}/help|Visit our documentation>`,
            },
          ],
        },
      ],
    };
  }

  // Handle interactive actions (button clicks, etc.)
  async handleInteraction(payload: InteractivePayload): Promise<any> {
    const installation = await this.oauthService.getInstallationBySlackTeamId(payload.team.id);

    if (!installation) {
      return { text: '❌ lnk.day is not connected to this workspace.' };
    }

    if (payload.type === 'block_actions' && payload.actions) {
      const action = payload.actions[0];

      switch (action.action_id) {
        case 'view_stats':
          // Respond with stats for the link
          return this.handleStatsCommand(installation, action.value, {
            user_id: payload.user.id,
          } as SlashCommandPayload);

        case 'copy_link':
          return {
            response_type: 'ephemeral',
            text: `📋 Link copied: ${action.value}`,
            replace_original: false,
          };

        case 'open_create_modal':
          await this.openCreateLinkModal(installation, payload.trigger_id);
          return { response_action: 'clear' };

        default:
          return { text: 'Unknown action' };
      }
    }

    if (payload.type === 'view_submission') {
      return this.handleModalSubmission(installation, payload);
    }

    return { text: 'Unknown interaction type' };
  }

  // Open create link modal
  private async openCreateLinkModal(installation: SlackInstallation, triggerId: string): Promise<void> {
    const modal = {
      type: 'modal',
      callback_id: 'create_link_modal',
      title: { type: 'plain_text', text: 'Create Short Link' },
      submit: { type: 'plain_text', text: 'Create' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'url_block',
          element: {
            type: 'url_text_input',
            action_id: 'original_url',
            placeholder: { type: 'plain_text', text: 'https://example.com/long-url' },
          },
          label: { type: 'plain_text', text: 'URL to shorten' },
        },
        {
          type: 'input',
          block_id: 'title_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'title',
            placeholder: { type: 'plain_text', text: 'My awesome link' },
          },
          label: { type: 'plain_text', text: 'Title (optional)' },
        },
        {
          type: 'input',
          block_id: 'alias_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'custom_alias',
            placeholder: { type: 'plain_text', text: 'my-custom-alias' },
          },
          label: { type: 'plain_text', text: 'Custom alias (optional)' },
          hint: { type: 'plain_text', text: 'Leave empty for auto-generated short code' },
        },
        {
          type: 'input',
          block_id: 'tags_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'tags',
            placeholder: { type: 'plain_text', text: 'marketing, campaign, q4' },
          },
          label: { type: 'plain_text', text: 'Tags (comma separated)' },
        },
      ],
    };

    await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${installation.botAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_id: triggerId,
        view: modal,
      }),
    });
  }

  // Handle modal submission
  private async handleModalSubmission(
    installation: SlackInstallation,
    payload: InteractivePayload,
  ): Promise<any> {
    if (payload.view?.callback_id === 'create_link_modal') {
      const values = payload.view.state.values;

      const originalUrl = values.url_block?.original_url?.value;
      const title = values.title_block?.title?.value;
      const customAlias = values.alias_block?.custom_alias?.value;
      const tagsStr = values.tags_block?.tags?.value;
      const tags = tagsStr?.split(',').map((t) => t.trim()).filter(Boolean);

      try {
        const response = await axios.post(
          `${this.linkServiceUrl}/links`,
          {
            originalUrl,
            title,
            customAlias,
            tags,
            metadata: {
              source: 'slack_modal',
              slackUserId: payload.user.id,
              slackUserName: payload.user.username,
            },
          },
          {
            headers: {
              'X-Team-Id': installation.teamId,
              'X-Internal-Service': 'notification-service',
            },
          },
        );

        const link: LinkServiceResponse = response.data;

        // Post success message to the user
        await this.oauthService.sendBotMessage(
          installation,
          payload.user.id, // DM the user
          `✅ Link created: ${link.shortUrl}`,
          [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Link created successfully!*\n\n🔗 <${link.shortUrl}|${link.shortUrl}>\n📎 ${link.originalUrl}`,
              },
            },
          ],
        );

        return { response_action: 'clear' };
      } catch (error) {
        return {
          response_action: 'errors',
          errors: {
            url_block: error.response?.data?.message || 'Failed to create link',
          },
        };
      }
    }

    return { response_action: 'clear' };
  }

  // Utility: Validate URL
  private isValidUrl(string: string): boolean {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Utility: Country flag emoji
  private countryFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const offset = 127397;
    return String.fromCodePoint(
      ...countryCode.toUpperCase().split('').map((c) => c.charCodeAt(0) + offset),
    );
  }

  // Utility: Format date
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
