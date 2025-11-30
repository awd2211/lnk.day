import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  Headers,
  UseGuards,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';

import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { SlackService } from './slack.service';
import { SlackOAuthService } from './slack-oauth.service';
import { SlackCommandsService } from './slack-commands.service';
import {
  InitiateSlackOAuthDto,
  SlackOAuthCallbackDto,
  SlashCommandPayload,
  InteractivePayload,
  SlackEventPayload,
  UpdateSlackSettingsDto,
} from './dto/slack.dto';

// ========== DTO Classes for existing endpoints ==========

class SendSlackMessageDto {
  webhookUrl: string;
  text?: string;
  blocks?: any[];
}

class LinkCreatedNotificationDto {
  webhookUrl: string;
  title: string;
  shortUrl: string;
  originalUrl: string;
  createdBy: string;
}

class MilestoneNotificationDto {
  webhookUrl: string;
  linkTitle: string;
  shortUrl: string;
  clicks: number;
  milestone: number;
}

class AlertNotificationDto {
  webhookUrl: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
}

class WeeklyReportDto {
  webhookUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  topLinks: Array<{ title: string; clicks: number }>;
  growthPercent: number;
  period: string;
}

@ApiTags('slack')
@Controller('slack')
export class SlackController {
  constructor(
    private readonly slackService: SlackService,
    private readonly oauthService: SlackOAuthService,
    private readonly commandsService: SlackCommandsService,
  ) {}

  // ========== OAuth Endpoints ==========

  @Get('oauth/install')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Slack OAuth installation URL' })
  getInstallUrl(
    @Query() dto: InitiateSlackOAuthDto,
    @ScopedTeamId() teamId: string,
    @Res() res: Response,
  ) {
    const authUrl = this.oauthService.generateAuthUrl(teamId, dto.redirectUrl);
    return res.redirect(authUrl);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle Slack OAuth callback' })
  async handleOAuthCallback(
    @Query() query: SlackOAuthCallbackDto,
    @Res() res: Response,
  ) {
    if (query.error) {
      return res.redirect(`/integrations/slack?error=${query.error}`);
    }

    try {
      const { installation, redirectUrl } = await this.oauthService.handleCallback(
        query.code!,
        query.state!,
      );

      const successUrl = redirectUrl || `/integrations/slack?success=true&workspace=${encodeURIComponent(installation.slackTeamName)}`;
      return res.redirect(successUrl);
    } catch (error: any) {
      return res.redirect(`/integrations/slack?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('installation')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Slack installation for team' })
  async getInstallation(@ScopedTeamId() teamId: string) {
    const installation = await this.oauthService.getInstallationByTeamId(teamId);

    if (!installation) {
      return { installed: false };
    }

    return {
      installed: true,
      workspaceName: installation.slackTeamName,
      installedAt: installation.installedAt,
      settings: installation.settings,
      defaultChannel: installation.defaultChannelId,
    };
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Slack notification settings' })
  async updateSettings(
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateSlackSettingsDto,
  ) {
    const installation = await this.oauthService.updateSettings(teamId, dto);
    return {
      success: true,
      settings: installation.settings,
    };
  }

  @Get('channels')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available Slack channels' })
  async listChannels(@ScopedTeamId() teamId: string) {
    const channels = await this.oauthService.listChannels(teamId);
    return { channels };
  }

  @Delete('uninstall')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Uninstall Slack app' })
  async uninstall(@ScopedTeamId() teamId: string) {
    await this.oauthService.uninstall(teamId);
    return { success: true };
  }

  // ========== Slack Events & Interactions (Public Endpoints) ==========

  @Post('events')
  @ApiExcludeEndpoint()
  async handleEvent(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Body() payload: SlackEventPayload,
  ) {
    // URL verification challenge
    if (payload.type === 'url_verification') {
      return { challenge: payload.challenge };
    }

    // Verify signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    if (!this.oauthService.verifySignature(signature, timestamp, rawBody)) {
      throw new BadRequestException('Invalid signature');
    }

    // Handle event
    if (payload.type === 'event_callback' && payload.event) {
      // Process events asynchronously
      this.handleSlackEvent(payload);
    }

    return { ok: true };
  }

  @Post('commands')
  @ApiExcludeEndpoint()
  async handleCommand(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Body() payload: SlashCommandPayload,
  ) {
    // Verify signature
    const rawBody = req.rawBody?.toString() || new URLSearchParams(payload as any).toString();
    if (!this.oauthService.verifySignature(signature, timestamp, rawBody)) {
      throw new BadRequestException('Invalid signature');
    }

    return this.commandsService.handleSlashCommand(payload);
  }

  @Post('interactions')
  @ApiExcludeEndpoint()
  async handleInteraction(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Body('payload') payloadStr: string,
  ) {
    // Parse payload (Slack sends it as form-urlencoded with a 'payload' field)
    const payload: InteractivePayload = JSON.parse(payloadStr);

    // Verify signature
    const rawBody = req.rawBody?.toString() || `payload=${encodeURIComponent(payloadStr)}`;
    if (!this.oauthService.verifySignature(signature, timestamp, rawBody)) {
      throw new BadRequestException('Invalid signature');
    }

    return this.commandsService.handleInteraction(payload);
  }

  // Handle Slack events asynchronously
  private async handleSlackEvent(payload: SlackEventPayload): Promise<void> {
    const event = payload.event;

    switch (event?.type) {
      case 'app_uninstalled':
        // Handle app uninstall
        if (payload.team_id) {
          const installation = await this.oauthService.getInstallationBySlackTeamId(payload.team_id);
          if (installation) {
            await this.oauthService.uninstall(installation.teamId);
          }
        }
        break;

      case 'app_home_opened':
        // Could show a welcome message on app home
        break;

      // Add more event handlers as needed
    }
  }

  // ========== Webhook Notification Endpoints ==========

  @Post('send')
  @ApiOperation({ summary: 'Send a custom Slack message' })
  async sendMessage(@Body() dto: SendSlackMessageDto) {
    const success = await this.slackService.sendWebhook(dto.webhookUrl, {
      text: dto.text,
      blocks: dto.blocks,
    });
    return { success };
  }

  @Post('notify/link-created')
  @ApiOperation({ summary: 'Send link created notification to Slack' })
  async notifyLinkCreated(@Body() dto: LinkCreatedNotificationDto) {
    const success = await this.slackService.sendLinkCreatedNotification(dto.webhookUrl, {
      title: dto.title,
      shortUrl: dto.shortUrl,
      originalUrl: dto.originalUrl,
      createdBy: dto.createdBy,
    });
    return { success };
  }

  @Post('notify/milestone')
  @ApiOperation({ summary: 'Send milestone notification to Slack' })
  async notifyMilestone(@Body() dto: MilestoneNotificationDto) {
    const success = await this.slackService.sendMilestoneNotification(dto.webhookUrl, {
      linkTitle: dto.linkTitle,
      shortUrl: dto.shortUrl,
      clicks: dto.clicks,
      milestone: dto.milestone,
    });
    return { success };
  }

  @Post('notify/alert')
  @ApiOperation({ summary: 'Send alert notification to Slack' })
  async notifyAlert(@Body() dto: AlertNotificationDto) {
    const success = await this.slackService.sendAlertNotification(dto.webhookUrl, {
      type: dto.type,
      severity: dto.severity,
      message: dto.message,
      details: dto.details,
    });
    return { success };
  }

  @Post('notify/weekly-report')
  @ApiOperation({ summary: 'Send weekly report to Slack' })
  async notifyWeeklyReport(@Body() dto: WeeklyReportDto) {
    const success = await this.slackService.sendWeeklyReport(dto.webhookUrl, {
      totalClicks: dto.totalClicks,
      uniqueVisitors: dto.uniqueVisitors,
      topLinks: dto.topLinks,
      growthPercent: dto.growthPercent,
      period: dto.period,
    });
    return { success };
  }

  // ========== Team-based Notifications (using installation) ==========

  @Post('notify/team/:teamId/link-created')
  @ApiOperation({ summary: 'Send link created notification to team Slack' })
  async notifyTeamLinkCreated(
    @Param('teamId') teamId: string,
    @Body() dto: Omit<LinkCreatedNotificationDto, 'webhookUrl'>,
  ) {
    const installation = await this.oauthService.getInstallationByTeamId(teamId);

    if (!installation || !installation.settings.notifyOnLinkCreate) {
      return { success: false, reason: 'Not configured' };
    }

    const channel = installation.defaultChannelId || installation.incomingWebhookChannelId;

    if (installation.incomingWebhookUrl) {
      const success = await this.slackService.sendLinkCreatedNotification(
        installation.incomingWebhookUrl,
        dto,
      );
      return { success };
    }

    if (channel) {
      const success = await this.oauthService.sendBotMessage(
        installation,
        channel,
        `🔗 New link created: ${dto.title}`,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${dto.title}*\n<${dto.shortUrl}|${dto.shortUrl}>`,
            },
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `Created by ${dto.createdBy}` }],
          },
        ],
      );
      return { success };
    }

    return { success: false, reason: 'No channel configured' };
  }

  @Post('notify/team/:teamId/milestone')
  @ApiOperation({ summary: 'Send milestone notification to team Slack' })
  async notifyTeamMilestone(
    @Param('teamId') teamId: string,
    @Body() dto: Omit<MilestoneNotificationDto, 'webhookUrl'>,
  ) {
    const installation = await this.oauthService.getInstallationByTeamId(teamId);

    if (!installation || !installation.settings.notifyOnMilestone) {
      return { success: false, reason: 'Not configured' };
    }

    // Check if this milestone is in the configured thresholds
    const thresholds = installation.settings.milestoneThresholds || [100, 1000, 10000, 100000];
    if (!thresholds.includes(dto.milestone)) {
      return { success: false, reason: 'Milestone not in thresholds' };
    }

    if (installation.incomingWebhookUrl) {
      const success = await this.slackService.sendMilestoneNotification(
        installation.incomingWebhookUrl,
        dto,
      );
      return { success };
    }

    const channel = installation.defaultChannelId || installation.incomingWebhookChannelId;
    if (channel) {
      const success = await this.oauthService.sendBotMessage(
        installation,
        channel,
        `🎉 Milestone reached: ${dto.linkTitle} hit ${dto.milestone} clicks!`,
      );
      return { success };
    }

    return { success: false, reason: 'No channel configured' };
  }
}
