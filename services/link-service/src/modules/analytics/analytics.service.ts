import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PixelConfigEntity, AnalyticsPlatform } from './entities/pixel-config.entity';
import { ThirdPartyAnalyticsService, PixelConfig, TrackingEvent } from './third-party-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PixelConfigEntity)
    private readonly pixelConfigRepository: Repository<PixelConfigEntity>,
    private readonly thirdPartyAnalytics: ThirdPartyAnalyticsService,
  ) {}

  async createPixelConfig(
    teamId: string,
    data: Partial<PixelConfigEntity>,
  ): Promise<PixelConfigEntity> {
    const config = this.pixelConfigRepository.create({
      ...data,
      teamId,
    });
    return this.pixelConfigRepository.save(config);
  }

  async getTeamPixelConfigs(teamId: string): Promise<PixelConfigEntity[]> {
    return this.pixelConfigRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPixelConfigsForLink(
    teamId: string,
    linkId: string,
  ): Promise<PixelConfigEntity[]> {
    // Get both team-wide and link-specific configs
    return this.pixelConfigRepository
      .createQueryBuilder('pixel')
      .where('pixel.teamId = :teamId', { teamId })
      .andWhere('(pixel.linkId IS NULL OR pixel.linkId = :linkId)', { linkId })
      .andWhere('pixel.enabled = true')
      .getMany();
  }

  async getPixelConfig(id: string, teamId: string): Promise<PixelConfigEntity> {
    const config = await this.pixelConfigRepository.findOne({
      where: { id, teamId },
    });
    if (!config) {
      throw new NotFoundException('Pixel configuration not found');
    }
    return config;
  }

  async updatePixelConfig(
    id: string,
    teamId: string,
    data: Partial<PixelConfigEntity>,
  ): Promise<PixelConfigEntity> {
    const config = await this.getPixelConfig(id, teamId);
    Object.assign(config, data);
    return this.pixelConfigRepository.save(config);
  }

  async deletePixelConfig(id: string, teamId: string): Promise<void> {
    const config = await this.getPixelConfig(id, teamId);
    await this.pixelConfigRepository.remove(config);
  }

  async togglePixelConfig(id: string, teamId: string): Promise<PixelConfigEntity> {
    const config = await this.getPixelConfig(id, teamId);
    config.enabled = !config.enabled;
    return this.pixelConfigRepository.save(config);
  }

  validatePixelConfig(config: PixelConfig): { valid: boolean; errors: string[] } {
    return this.thirdPartyAnalytics.validatePixelConfig(config);
  }

  async generateTrackingScriptForLink(
    teamId: string,
    linkId: string,
    shortCode?: string,
    destinationUrl?: string,
  ): Promise<string> {
    const configs = await this.getPixelConfigsForLink(teamId, linkId);

    if (configs.length === 0) {
      return '';
    }

    const pixels: PixelConfig[] = configs.map((c) => ({
      platform: c.platform,
      pixelId: c.pixelId,
      enabled: c.enabled,
      events: c.events,
    }));

    const event: TrackingEvent = {
      eventName: 'link_click',
      linkId,
      shortCode: shortCode || linkId,
      url: destinationUrl || '',
    };

    return this.thirdPartyAnalytics.generateTrackingScript(pixels, event);
  }

  // Server-side tracking for redirect service
  async trackLinkClick(
    teamId: string,
    linkId: string,
    event: TrackingEvent,
    clientData?: {
      ip?: string;
      userAgent?: string;
      fbc?: string;
      fbp?: string;
    },
  ): Promise<void> {
    const configs = await this.pixelConfigRepository.find({
      where: {
        teamId,
        enabled: true,
        serverSideEnabled: true,
      },
    });

    for (const config of configs) {
      // Check if this config applies to the link
      if (config.linkId && config.linkId !== linkId) {
        continue;
      }

      // Check if the event type should be tracked
      if (config.events && !config.events.includes(event.eventName)) {
        continue;
      }

      const pixel: PixelConfig = {
        platform: config.platform,
        pixelId: config.pixelId,
        enabled: true,
      };

      await this.thirdPartyAnalytics.trackServerSideEvent(pixel, event, clientData);
    }
  }

  // Get aggregated stats
  async getPixelStats(teamId: string): Promise<{
    totalPixels: number;
    enabledPixels: number;
    byPlatform: Record<AnalyticsPlatform, number>;
    serverSideEnabled: number;
  }> {
    const configs = await this.getTeamPixelConfigs(teamId);

    const byPlatform: Record<string, number> = {};
    let enabledCount = 0;
    let serverSideCount = 0;

    for (const config of configs) {
      byPlatform[config.platform] = (byPlatform[config.platform] || 0) + 1;
      if (config.enabled) enabledCount++;
      if (config.serverSideEnabled) serverSideCount++;
    }

    return {
      totalPixels: configs.length,
      enabledPixels: enabledCount,
      byPlatform: byPlatform as Record<AnalyticsPlatform, number>,
      serverSideEnabled: serverSideCount,
    };
  }
}
