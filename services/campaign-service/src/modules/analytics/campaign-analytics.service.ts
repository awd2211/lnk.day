import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Campaign } from '../campaign/entities/campaign.entity';

export interface ChannelStats {
  channel: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface TimeSeriesData {
  date: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
}

export interface LinkPerformance {
  linkId: string;
  title?: string;
  shortUrl?: string;
  clicks: number;
  percentage: number;
  conversions: number;
  conversionRate: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  overview: {
    totalClicks: number;
    uniqueVisitors: number;
    totalConversions: number;
    conversionRate: number;
    totalRevenue: number;
    roi: number;
    avgClicksPerDay: number;
    avgRevenuePerClick: number;
  };
  byChannel: ChannelStats[];
  byLink: LinkPerformance[];
  timeSeries: TimeSeriesData[];
  goals: {
    clickTarget: number;
    clickProgress: number;
    conversionTarget: number;
    conversionProgress: number;
    revenueTarget?: number;
    revenueProgress?: number;
  };
  topLocations: Array<{ country: string; clicks: number; percentage: number }>;
  topDevices: Array<{ type: string; os: string; clicks: number; percentage: number }>;
  topReferrers: Array<{ source: string; clicks: number; percentage: number }>;
}

export interface CampaignComparisonData {
  campaigns: Array<{
    id: string;
    name: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    roi: number;
  }>;
  winner?: string;
  metrics: {
    avgClicks: number;
    avgConversions: number;
    avgConversionRate: number;
    avgRevenue: number;
  };
}

@Injectable()
export class CampaignAnalyticsService {
  private readonly logger = new Logger(CampaignAnalyticsService.name);

  // Simulated click data storage (in production, this would come from ClickHouse or similar)
  private clickData: Map<string, any[]> = new Map();

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async getAnalytics(
    campaignId: string,
    options?: {
      range?: string; // '7d', '30d', '90d', 'custom'
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CampaignAnalytics> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const { startDate, endDate } = this.getDateRange(options?.range, options?.startDate, options?.endDate);
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate overview metrics
    const avgClicksPerDay = campaign.totalClicks / daysDiff;
    const conversionRate = campaign.totalClicks > 0
      ? (campaign.conversions / campaign.totalClicks) * 100
      : 0;
    const roi = Number(campaign.spent) > 0
      ? ((Number(campaign.revenue) - Number(campaign.spent)) / Number(campaign.spent)) * 100
      : 0;
    const avgRevenuePerClick = campaign.totalClicks > 0
      ? Number(campaign.revenue) / campaign.totalClicks
      : 0;

    // Generate mock channel data based on campaign channels
    const byChannel = this.generateChannelStats(campaign);
    const byLink = this.generateLinkPerformance(campaign);
    const timeSeries = this.generateTimeSeries(campaign, startDate, endDate);
    const topLocations = this.generateTopLocations(campaign.totalClicks);
    const topDevices = this.generateTopDevices(campaign.totalClicks);
    const topReferrers = this.generateTopReferrers(campaign.totalClicks);

    return {
      campaignId,
      overview: {
        totalClicks: campaign.totalClicks,
        uniqueVisitors: campaign.uniqueClicks,
        totalConversions: campaign.conversions,
        conversionRate,
        totalRevenue: Number(campaign.revenue),
        roi,
        avgClicksPerDay,
        avgRevenuePerClick,
      },
      byChannel,
      byLink,
      timeSeries,
      goals: {
        clickTarget: campaign.goal?.type === 'clicks' ? campaign.goal.target : 100000,
        clickProgress: campaign.totalClicks,
        conversionTarget: campaign.goal?.type === 'conversions' ? campaign.goal.target : 3000,
        conversionProgress: campaign.conversions,
        revenueTarget: campaign.goal?.type === 'revenue' ? campaign.goal.target : undefined,
        revenueProgress: campaign.goal?.type === 'revenue' ? Number(campaign.revenue) : undefined,
      },
      topLocations,
      topDevices,
      topReferrers,
    };
  }

  async getComparison(campaignIds: string[]): Promise<CampaignComparisonData> {
    const campaigns = await this.campaignRepository.find({
      where: campaignIds.map((id) => ({ id })),
    });

    const campaignData = campaigns.map((c) => {
      const conversionRate = c.totalClicks > 0 ? (c.conversions / c.totalClicks) * 100 : 0;
      const roi = Number(c.spent) > 0
        ? ((Number(c.revenue) - Number(c.spent)) / Number(c.spent)) * 100
        : 0;

      return {
        id: c.id,
        name: c.name,
        clicks: c.totalClicks,
        conversions: c.conversions,
        conversionRate,
        revenue: Number(c.revenue),
        roi,
      };
    });

    // Calculate averages
    const avgClicks = campaignData.reduce((sum, c) => sum + c.clicks, 0) / campaignData.length;
    const avgConversions = campaignData.reduce((sum, c) => sum + c.conversions, 0) / campaignData.length;
    const avgConversionRate = campaignData.reduce((sum, c) => sum + c.conversionRate, 0) / campaignData.length;
    const avgRevenue = campaignData.reduce((sum, c) => sum + c.revenue, 0) / campaignData.length;

    // Determine winner by ROI
    const winner = campaignData.length > 0
      ? campaignData.reduce((best, c) => (c.roi > best.roi ? c : best)).id
      : undefined;

    return {
      campaigns: campaignData,
      winner,
      metrics: {
        avgClicks,
        avgConversions,
        avgConversionRate,
        avgRevenue,
      },
    };
  }

  async getTeamOverview(
    teamId: string,
    options?: { range?: string; startDate?: Date; endDate?: Date },
  ): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    avgConversionRate: number;
    topCampaigns: Array<{ id: string; name: string; clicks: number; conversions: number }>;
  }> {
    const campaigns = await this.campaignRepository.find({
      where: { teamId },
    });

    const activeCampaigns = campaigns.filter((c) => c.status === 'active');
    const totalClicks = campaigns.reduce((sum, c) => sum + c.totalClicks, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + Number(c.revenue), 0);
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const topCampaigns = campaigns
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        clicks: c.totalClicks,
        conversions: c.conversions,
      }));

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
      totalClicks,
      totalConversions,
      totalRevenue,
      avgConversionRate,
      topCampaigns,
    };
  }

  async recordClick(
    campaignId: string,
    clickData: {
      linkId: string;
      channel?: string;
      country?: string;
      device?: string;
      os?: string;
      referrer?: string;
      timestamp?: Date;
    },
  ): Promise<void> {
    // Store click data
    const existing = this.clickData.get(campaignId) || [];
    existing.push({
      ...clickData,
      timestamp: clickData.timestamp || new Date(),
    });
    this.clickData.set(campaignId, existing);

    // Update campaign stats
    await this.campaignRepository.increment({ id: campaignId }, 'totalClicks', 1);
    this.logger.debug(`Recorded click for campaign ${campaignId}`);
  }

  async recordConversion(
    campaignId: string,
    conversionData: {
      linkId?: string;
      value?: number;
      orderId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.campaignRepository.increment({ id: campaignId }, 'conversions', 1);
    if (conversionData.value) {
      await this.campaignRepository.increment({ id: campaignId }, 'revenue', conversionData.value);
    }
    this.logger.debug(`Recorded conversion for campaign ${campaignId}`);
  }

  async exportAnalytics(
    campaignId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    options?: { range?: string; startDate?: Date; endDate?: Date },
  ): Promise<string> {
    const analytics = await this.getAnalytics(campaignId, options);

    if (format === 'csv') {
      return this.convertToCsv(analytics);
    }

    return JSON.stringify(analytics, null, 2);
  }

  private getDateRange(
    range?: string,
    customStart?: Date,
    customEnd?: Date,
  ): { startDate: Date; endDate: Date } {
    const endDate = customEnd || new Date();
    let startDate = customStart;

    if (!startDate) {
      const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
      startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private generateChannelStats(campaign: Campaign): ChannelStats[] {
    const channels = campaign.channels || ['direct'];
    const totalClicks = campaign.totalClicks;

    return channels.map((channel, index) => {
      // Distribute clicks among channels with some variation
      const weight = 1 / (index + 1);
      const channelClicks = Math.floor(totalClicks * weight * 0.4);
      const conversions = Math.floor(campaign.conversions * weight * 0.4);

      return {
        channel,
        clicks: channelClicks,
        uniqueClicks: Math.floor(channelClicks * 0.75),
        conversions,
        conversionRate: channelClicks > 0 ? (conversions / channelClicks) * 100 : 0,
        revenue: Number(campaign.revenue) * weight * 0.4,
      };
    });
  }

  private generateLinkPerformance(campaign: Campaign): LinkPerformance[] {
    const linkIds = campaign.linkIds || [];
    const totalClicks = campaign.totalClicks;

    return linkIds.slice(0, 10).map((linkId, index) => {
      const weight = 1 / (index + 1);
      const clicks = Math.floor(totalClicks * weight * 0.3);
      const conversions = Math.floor(campaign.conversions * weight * 0.3);

      return {
        linkId,
        clicks,
        percentage: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0,
        conversions,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      };
    });
  }

  private generateTimeSeries(campaign: Campaign, startDate: Date, endDate: Date): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgDaily = campaign.totalClicks / Math.max(1, days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const variance = 0.5 + Math.random();
      const clicks = Math.floor(avgDaily * variance);

      data.push({
        date: date.toISOString().split('T')[0],
        clicks,
        uniqueClicks: Math.floor(clicks * 0.75),
        conversions: Math.floor(clicks * 0.03),
        revenue: clicks * 1.5,
      });
    }

    return data;
  }

  private generateTopLocations(totalClicks: number): Array<{ country: string; clicks: number; percentage: number }> {
    const countries = [
      { country: 'CN', weight: 0.35 },
      { country: 'US', weight: 0.25 },
      { country: 'JP', weight: 0.12 },
      { country: 'GB', weight: 0.08 },
      { country: 'DE', weight: 0.06 },
      { country: 'FR', weight: 0.05 },
      { country: 'AU', weight: 0.04 },
      { country: 'CA', weight: 0.03 },
      { country: 'BR', weight: 0.02 },
    ];

    return countries.map((c) => ({
      country: c.country,
      clicks: Math.floor(totalClicks * c.weight),
      percentage: c.weight * 100,
    }));
  }

  private generateTopDevices(totalClicks: number): Array<{ type: string; os: string; clicks: number; percentage: number }> {
    const devices = [
      { type: 'mobile', os: 'iOS', weight: 0.35 },
      { type: 'mobile', os: 'Android', weight: 0.30 },
      { type: 'desktop', os: 'Windows', weight: 0.20 },
      { type: 'desktop', os: 'macOS', weight: 0.10 },
      { type: 'tablet', os: 'iPadOS', weight: 0.05 },
    ];

    return devices.map((d) => ({
      ...d,
      clicks: Math.floor(totalClicks * d.weight),
      percentage: d.weight * 100,
    }));
  }

  private generateTopReferrers(totalClicks: number): Array<{ source: string; clicks: number; percentage: number }> {
    const referrers = [
      { source: 'direct', weight: 0.25 },
      { source: 'wechat.com', weight: 0.20 },
      { source: 'weibo.com', weight: 0.15 },
      { source: 'douyin.com', weight: 0.12 },
      { source: 'google.com', weight: 0.10 },
      { source: 'baidu.com', weight: 0.08 },
      { source: 'twitter.com', weight: 0.05 },
      { source: 'facebook.com', weight: 0.05 },
    ];

    return referrers.map((r) => ({
      ...r,
      clicks: Math.floor(totalClicks * r.weight),
      percentage: r.weight * 100,
    }));
  }

  private convertToCsv(analytics: CampaignAnalytics): string {
    const lines: string[] = [];

    // Overview section
    lines.push('# Campaign Analytics Overview');
    lines.push('Metric,Value');
    lines.push(`Total Clicks,${analytics.overview.totalClicks}`);
    lines.push(`Unique Visitors,${analytics.overview.uniqueVisitors}`);
    lines.push(`Conversions,${analytics.overview.totalConversions}`);
    lines.push(`Conversion Rate,${analytics.overview.conversionRate.toFixed(2)}%`);
    lines.push(`Revenue,${analytics.overview.totalRevenue}`);
    lines.push(`ROI,${analytics.overview.roi.toFixed(2)}%`);
    lines.push('');

    // By Channel
    lines.push('# By Channel');
    lines.push('Channel,Clicks,Conversions,Conversion Rate,Revenue');
    for (const ch of analytics.byChannel) {
      lines.push(`${ch.channel},${ch.clicks},${ch.conversions},${ch.conversionRate.toFixed(2)}%,${ch.revenue}`);
    }
    lines.push('');

    // Time Series
    lines.push('# Time Series');
    lines.push('Date,Clicks,Unique Clicks,Conversions,Revenue');
    for (const ts of analytics.timeSeries) {
      lines.push(`${ts.date},${ts.clicks},${ts.uniqueClicks},${ts.conversions},${ts.revenue}`);
    }

    return lines.join('\n');
  }
}
