import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { SlackInstallation } from './entities/slack-installation.entity';
import { SlackApiResponse, SlackChannel } from './dto/slack.dto';

interface OAuthAccessResponse {
  ok: boolean;
  error?: string;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

@Injectable()
export class SlackOAuthService {
  private readonly logger = new Logger(SlackOAuthService.name);
  private readonly clientId: string = '';
  private readonly clientSecret: string = '';
  private readonly signingSecret: string = '';
  private readonly redirectUri: string = '';
  private readonly baseUrl = 'https://slack.com/api';

  // In-memory state storage (use Redis in production)
  private oauthStates = new Map<string, { teamId: string; redirectUrl?: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SlackInstallation)
    private readonly installationRepo: Repository<SlackInstallation>,
  ) {
    this.clientId = this.configService.get<string>('SLACK_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('SLACK_CLIENT_SECRET') || '';
    this.signingSecret = this.configService.get<string>('SLACK_SIGNING_SECRET') || '';
    this.redirectUri = this.configService.get<string>('SLACK_REDIRECT_URI', 'https://app.lnk.day/api/slack/oauth/callback') || '';
  }

  // Generate OAuth authorization URL
  generateAuthUrl(teamId: string, redirectUrl?: string): string {
    const state = crypto.randomBytes(16).toString('hex');

    // Store state with 10 minute expiration
    this.oauthStates.set(state, {
      teamId,
      redirectUrl,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const scopes = [
      'channels:read',
      'chat:write',
      'chat:write.public',
      'commands',
      'incoming-webhook',
      'users:read',
      'users:read.email',
      'team:read',
    ];

    const userScopes = [
      'identity.basic',
      'identity.email',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopes.join(','),
      user_scope: userScopes.join(','),
      redirect_uri: this.redirectUri,
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  // Handle OAuth callback
  async handleCallback(code: string, state: string): Promise<{ installation: SlackInstallation; redirectUrl?: string }> {
    // Validate state
    const stateData = this.oauthStates.get(state);
    if (!stateData) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    if (stateData.expiresAt < Date.now()) {
      this.oauthStates.delete(state);
      throw new BadRequestException('State parameter has expired');
    }

    this.oauthStates.delete(state);

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(code);

    if (!tokenResponse.ok) {
      throw new BadRequestException(`Slack OAuth failed: ${tokenResponse.error}`);
    }

    // Create or update installation
    const installation = await this.saveInstallation(stateData.teamId, tokenResponse);

    return {
      installation,
      redirectUrl: stateData.redirectUrl,
    };
  }

  // Exchange authorization code for access token
  private async exchangeCodeForToken(code: string): Promise<OAuthAccessResponse> {
    const response = await fetch(`${this.baseUrl}/oauth.v2.access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    return response.json() as Promise<OAuthAccessResponse>;
  }

  // Save installation to database
  private async saveInstallation(
    teamId: string,
    tokenResponse: OAuthAccessResponse,
  ): Promise<SlackInstallation> {
    // Check if installation already exists
    let installation = await this.installationRepo.findOne({
      where: { slackTeamId: tokenResponse.team.id },
    });

    if (installation) {
      // Update existing installation
      installation.teamId = teamId;
      installation.slackTeamName = tokenResponse.team.name;
      installation.botUserId = tokenResponse.bot_user_id;
      installation.botAccessToken = tokenResponse.access_token;
      installation.botScopes = tokenResponse.scope.split(',');
      installation.isActive = true;

      if (tokenResponse.authed_user) {
        installation.userId = tokenResponse.authed_user.id;
        installation.userAccessToken = tokenResponse.authed_user.access_token;
        installation.userScopes = tokenResponse.authed_user.scope?.split(',');
      }

      if (tokenResponse.incoming_webhook) {
        installation.incomingWebhookUrl = tokenResponse.incoming_webhook.url;
        installation.incomingWebhookChannel = tokenResponse.incoming_webhook.channel;
        installation.incomingWebhookChannelId = tokenResponse.incoming_webhook.channel_id;
      }

      if (tokenResponse.enterprise) {
        installation.slackEnterpriseId = tokenResponse.enterprise.id;
        installation.slackEnterpriseName = tokenResponse.enterprise.name;
      }
    } else {
      // Create new installation
      installation = this.installationRepo.create({
        teamId,
        slackTeamId: tokenResponse.team.id,
        slackTeamName: tokenResponse.team.name,
        slackEnterpriseId: tokenResponse.enterprise?.id,
        slackEnterpriseName: tokenResponse.enterprise?.name,
        botUserId: tokenResponse.bot_user_id,
        botAccessToken: tokenResponse.access_token,
        botScopes: tokenResponse.scope.split(','),
        userId: tokenResponse.authed_user?.id,
        userAccessToken: tokenResponse.authed_user?.access_token,
        userScopes: tokenResponse.authed_user?.scope?.split(','),
        incomingWebhookUrl: tokenResponse.incoming_webhook?.url,
        incomingWebhookChannel: tokenResponse.incoming_webhook?.channel,
        incomingWebhookChannelId: tokenResponse.incoming_webhook?.channel_id,
        settings: {
          notifyOnLinkCreate: true,
          notifyOnMilestone: true,
          notifyOnAlert: true,
          weeklyReport: false,
          milestoneThresholds: [100, 1000, 10000, 100000],
        },
      });
    }

    await this.installationRepo.save(installation);
    this.logger.log(`Slack installation saved for team ${teamId} -> workspace ${tokenResponse.team.name}`);

    return installation;
  }

  // Get installation by team ID
  async getInstallationByTeamId(teamId: string): Promise<SlackInstallation | null> {
    return this.installationRepo.findOne({
      where: { teamId, isActive: true },
    });
  }

  // Get installation by Slack team ID
  async getInstallationBySlackTeamId(slackTeamId: string): Promise<SlackInstallation | null> {
    return this.installationRepo.findOne({
      where: { slackTeamId, isActive: true },
    });
  }

  // Uninstall Slack app
  async uninstall(teamId: string): Promise<void> {
    const installation = await this.getInstallationByTeamId(teamId);
    if (!installation) {
      throw new NotFoundException('Slack installation not found');
    }

    installation.isActive = false;
    await this.installationRepo.save(installation);

    this.logger.log(`Slack uninstalled for team ${teamId}`);
  }

  // Update settings
  async updateSettings(
    teamId: string,
    settings: Partial<SlackInstallation['settings']>,
  ): Promise<SlackInstallation> {
    const installation = await this.getInstallationByTeamId(teamId);
    if (!installation) {
      throw new NotFoundException('Slack installation not found');
    }

    installation.settings = { ...installation.settings, ...settings };

    if ((settings as any).defaultChannelId !== undefined) {
      installation.defaultChannelId = (settings as any).defaultChannelId;
    }

    return this.installationRepo.save(installation);
  }

  // List channels in workspace
  async listChannels(teamId: string): Promise<SlackChannel[]> {
    const installation = await this.getInstallationByTeamId(teamId);
    if (!installation) {
      throw new NotFoundException('Slack installation not found');
    }

    const response = await fetch(`${this.baseUrl}/conversations.list`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${installation.botAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json() as SlackApiResponse<{ channels: SlackChannel[] }>;

    if (!data.ok) {
      throw new BadRequestException(`Failed to list channels: ${data.error}`);
    }

    return data.data?.channels || [];
  }

  // Send message using bot token
  async sendBotMessage(
    installation: SlackInstallation,
    channel: string,
    text: string,
    blocks?: any[],
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${installation.botAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          text,
          blocks,
        }),
      });

      const data = await response.json() as SlackApiResponse;

      if (!data.ok) {
        this.logger.error(`Failed to send Slack message: ${data.error}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Slack API error: ${error.message}`);
      return false;
    }
  }

  // Verify Slack request signature
  verifySignature(
    signature: string,
    timestamp: string,
    body: string,
  ): boolean {
    if (!this.signingSecret) {
      this.logger.warn('Slack signing secret not configured');
      return false;
    }

    // Check timestamp is within 5 minutes
    const requestTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - requestTimestamp) > 300) {
      return false;
    }

    // Calculate signature
    const sigBaseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac('sha256', this.signingSecret);
    const mySignature = `v0=${hmac.update(sigBaseString).digest('hex')}`;

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(signature),
    );
  }

  // Clean up expired OAuth states
  cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.oauthStates.entries()) {
      if (data.expiresAt < now) {
        this.oauthStates.delete(state);
      }
    }
  }
}
