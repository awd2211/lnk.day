import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { TeamsService, TeamsCard } from './teams.service';
import { TeamsInstallationService, CreateTeamsInstallationDto, UpdateTeamsSettingsDto } from './teams-installation.service';

class SendTeamsCardDto {
  webhookUrl: string;
  card: TeamsCard;
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

@ApiTags('teams')
@Controller('teams-notifications')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly installationService: TeamsInstallationService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a custom Teams card' })
  async sendCard(@Body() dto: SendTeamsCardDto) {
    const success = await this.teamsService.sendCard(dto.webhookUrl, dto.card);
    return { success };
  }

  @Post('notify/link-created')
  @ApiOperation({ summary: 'Send link created notification to Teams' })
  async notifyLinkCreated(@Body() dto: LinkCreatedNotificationDto) {
    const success = await this.teamsService.sendLinkCreatedNotification(dto.webhookUrl, {
      title: dto.title,
      shortUrl: dto.shortUrl,
      originalUrl: dto.originalUrl,
      createdBy: dto.createdBy,
    });
    return { success };
  }

  @Post('notify/milestone')
  @ApiOperation({ summary: 'Send milestone notification to Teams' })
  async notifyMilestone(@Body() dto: MilestoneNotificationDto) {
    const success = await this.teamsService.sendMilestoneNotification(dto.webhookUrl, {
      linkTitle: dto.linkTitle,
      shortUrl: dto.shortUrl,
      clicks: dto.clicks,
      milestone: dto.milestone,
    });
    return { success };
  }

  @Post('notify/alert')
  @ApiOperation({ summary: 'Send alert notification to Teams' })
  async notifyAlert(@Body() dto: AlertNotificationDto) {
    const success = await this.teamsService.sendAlertNotification(dto.webhookUrl, {
      type: dto.type,
      severity: dto.severity,
      message: dto.message,
      details: dto.details,
    });
    return { success };
  }

  @Post('notify/weekly-report')
  @ApiOperation({ summary: 'Send weekly report to Teams' })
  async notifyWeeklyReport(@Body() dto: WeeklyReportDto) {
    const success = await this.teamsService.sendWeeklyReport(dto.webhookUrl, {
      totalClicks: dto.totalClicks,
      uniqueVisitors: dto.uniqueVisitors,
      topLinks: dto.topLinks,
      growthPercent: dto.growthPercent,
      period: dto.period,
    });
    return { success };
  }

  // ========== Installation Management ==========

  @Get('installations')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all Teams installations for a team' })
  async getInstallations(@ScopedTeamId() teamId: string) {
    const installations = await this.installationService.findAllByTeam(teamId);
    return { installations };
  }

  @Post('installations')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new Teams installation' })
  async createInstallation(@Body() dto: CreateTeamsInstallationDto) {
    const installation = await this.installationService.create(dto);
    return { installation };
  }

  @Get('installations/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific Teams installation' })
  @ApiParam({ name: 'id', type: String })
  async getInstallation(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    const installation = await this.installationService.findOne(id, teamId);
    return { installation };
  }

  @Put('installations/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a Teams installation' })
  @ApiParam({ name: 'id', type: String })
  async updateInstallation(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateTeamsSettingsDto,
  ) {
    const installation = await this.installationService.update(id, teamId, dto);
    return { installation };
  }

  @Delete('installations/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a Teams installation' })
  @ApiParam({ name: 'id', type: String })
  async deleteInstallation(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    await this.installationService.delete(id, teamId);
    return { success: true };
  }

  @Post('installations/:id/test')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test notification' })
  @ApiParam({ name: 'id', type: String })
  async testInstallation(
    @Param('id', ParseUUIDPipe) id: string,
    @ScopedTeamId() teamId: string,
  ) {
    const success = await this.installationService.testNotification(id, teamId);
    return { success };
  }

  @Post('validate-webhook')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.INTEGRATIONS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a Teams webhook URL' })
  async validateWebhook(@Body() body: { webhookUrl: string }) {
    const valid = await this.installationService.validateWebhook(body.webhookUrl);
    return { valid };
  }

  // ========== Team-based Notifications ==========

  @Post('notify/team/:teamId/link-created')
  @ApiOperation({ summary: 'Notify all configured Teams channels of link creation' })
  async notifyTeamLinkCreated(
    @Param('teamId') teamId: string,
    @Body() dto: Omit<LinkCreatedNotificationDto, 'webhookUrl'>,
  ) {
    await this.installationService.notifyLinkCreated(teamId, dto);
    return { success: true };
  }

  @Post('notify/team/:teamId/milestone')
  @ApiOperation({ summary: 'Notify all configured Teams channels of milestone' })
  async notifyTeamMilestone(
    @Param('teamId') teamId: string,
    @Body() dto: Omit<MilestoneNotificationDto, 'webhookUrl'>,
  ) {
    await this.installationService.notifyMilestone(teamId, dto);
    return { success: true };
  }

  @Post('notify/team/:teamId/alert')
  @ApiOperation({ summary: 'Notify all configured Teams channels of alert' })
  async notifyTeamAlert(
    @Param('teamId') teamId: string,
    @Body() dto: Omit<AlertNotificationDto, 'webhookUrl'>,
  ) {
    await this.installationService.notifyAlert(teamId, dto);
    return { success: true };
  }
}
