import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamsInstallation } from './entities/teams-installation.entity';
import { TeamsService } from './teams.service';

export interface CreateTeamsInstallationDto {
  teamId: string;
  name: string;
  webhookUrl: string;
  channelName?: string;
  settings?: TeamsInstallation['settings'];
}

export interface UpdateTeamsSettingsDto {
  name?: string;
  webhookUrl?: string;
  channelName?: string;
  settings?: Partial<TeamsInstallation['settings']>;
  isActive?: boolean;
}

@Injectable()
export class TeamsInstallationService {
  constructor(
    @InjectRepository(TeamsInstallation)
    private readonly installationRepo: Repository<TeamsInstallation>,
    private readonly teamsService: TeamsService,
  ) {}

  // ========== CRUD ==========

  async create(dto: CreateTeamsInstallationDto): Promise<TeamsInstallation> {
    // Validate webhook URL
    const isValid = await this.validateWebhook(dto.webhookUrl);
    if (!isValid) {
      throw new BadRequestException('Invalid Teams webhook URL');
    }

    const installation = this.installationRepo.create({
      teamId: dto.teamId,
      name: dto.name,
      webhookUrl: dto.webhookUrl,
      channelName: dto.channelName,
      settings: dto.settings || {
        notifyOnLinkCreate: true,
        notifyOnMilestone: true,
        notifyOnAlert: true,
        weeklyReport: false,
        milestoneThresholds: [100, 1000, 10000, 100000],
      },
    });

    return this.installationRepo.save(installation);
  }

  async findAllByTeam(teamId: string): Promise<TeamsInstallation[]> {
    return this.installationRepo.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, teamId: string): Promise<TeamsInstallation> {
    const installation = await this.installationRepo.findOne({
      where: { id, teamId },
    });

    if (!installation) {
      throw new NotFoundException('Teams installation not found');
    }

    return installation;
  }

  async update(
    id: string,
    teamId: string,
    dto: UpdateTeamsSettingsDto,
  ): Promise<TeamsInstallation> {
    const installation = await this.findOne(id, teamId);

    if (dto.webhookUrl && dto.webhookUrl !== installation.webhookUrl) {
      const isValid = await this.validateWebhook(dto.webhookUrl);
      if (!isValid) {
        throw new BadRequestException('Invalid Teams webhook URL');
      }
    }

    if (dto.name !== undefined) installation.name = dto.name;
    if (dto.webhookUrl !== undefined) installation.webhookUrl = dto.webhookUrl;
    if (dto.channelName !== undefined) installation.channelName = dto.channelName;
    if (dto.isActive !== undefined) installation.isActive = dto.isActive;
    if (dto.settings) {
      installation.settings = { ...installation.settings, ...dto.settings };
    }

    return this.installationRepo.save(installation);
  }

  async delete(id: string, teamId: string): Promise<void> {
    const installation = await this.findOne(id, teamId);
    await this.installationRepo.remove(installation);
  }

  // ========== Webhook Validation ==========

  async validateWebhook(webhookUrl: string): Promise<boolean> {
    // Teams webhook URLs should start with specific Microsoft domains
    const validPrefixes = [
      'https://outlook.office.com/webhook/',
      'https://outlook.office365.com/webhook/',
      'https://',  // Allow other MS Teams webhook formats
    ];

    if (!validPrefixes.some((prefix) => webhookUrl.startsWith(prefix))) {
      return false;
    }

    // Try sending a test message
    try {
      const success = await this.teamsService.sendCard(webhookUrl, {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '0076D7',
        summary: 'lnk.day Connection Test',
        title: '✅ lnk.day Connected Successfully',
        sections: [
          {
            text: 'Your Teams channel is now connected to lnk.day!',
            markdown: true,
          },
        ],
      });

      return success;
    } catch {
      return false;
    }
  }

  async testNotification(id: string, teamId: string): Promise<boolean> {
    const installation = await this.findOne(id, teamId);

    return this.teamsService.sendCard(installation.webhookUrl, {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '0076D7',
      summary: 'lnk.day Test Notification',
      title: '🔔 Test Notification',
      sections: [
        {
          text: 'This is a test notification from lnk.day. If you can see this, your Teams integration is working correctly!',
          markdown: true,
        },
      ],
    });
  }

  // ========== Team-based Notifications ==========

  async notifyLinkCreated(
    teamId: string,
    data: { title: string; shortUrl: string; originalUrl: string; createdBy: string },
  ): Promise<void> {
    const installations = await this.getActiveInstallations(teamId, 'notifyOnLinkCreate');

    for (const installation of installations) {
      await this.teamsService.sendLinkCreatedNotification(installation.webhookUrl, data);
    }
  }

  async notifyMilestone(
    teamId: string,
    data: { linkTitle: string; shortUrl: string; clicks: number; milestone: number },
  ): Promise<void> {
    const installations = await this.installationRepo.find({
      where: { teamId, isActive: true },
    });

    for (const installation of installations) {
      if (!installation.settings.notifyOnMilestone) continue;

      // Check if milestone is in thresholds
      const thresholds = installation.settings.milestoneThresholds || [100, 1000, 10000, 100000];
      if (!thresholds.includes(data.milestone)) continue;

      await this.teamsService.sendMilestoneNotification(installation.webhookUrl, data);
    }
  }

  async notifyAlert(
    teamId: string,
    alert: { type: string; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; details?: string },
  ): Promise<void> {
    const installations = await this.getActiveInstallations(teamId, 'notifyOnAlert');

    for (const installation of installations) {
      await this.teamsService.sendAlertNotification(installation.webhookUrl, alert);
    }
  }

  async sendWeeklyReport(
    teamId: string,
    report: {
      totalClicks: number;
      uniqueVisitors: number;
      topLinks: Array<{ title: string; clicks: number }>;
      growthPercent: number;
      period: string;
    },
  ): Promise<void> {
    const installations = await this.getActiveInstallations(teamId, 'weeklyReport');

    for (const installation of installations) {
      await this.teamsService.sendWeeklyReport(installation.webhookUrl, report);
    }
  }

  private async getActiveInstallations(
    teamId: string,
    settingKey: keyof TeamsInstallation['settings'],
  ): Promise<TeamsInstallation[]> {
    const installations = await this.installationRepo.find({
      where: { teamId, isActive: true },
    });

    return installations.filter((i) => i.settings[settingKey]);
  }
}
