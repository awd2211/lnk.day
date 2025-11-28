import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TeamsService, TeamsCard } from './teams.service';

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
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

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
}
