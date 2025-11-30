import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Campaign, CampaignStatus, UTMParams } from './entities/campaign.entity';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async create(data: Partial<Campaign>): Promise<Campaign> {
    const campaign = this.campaignRepository.create(data);
    return this.campaignRepository.save(campaign);
  }

  async findAll(teamId?: string, options?: { status?: CampaignStatus; page?: number; limit?: number }): Promise<{ items: Campaign[]; total: number; page: number; limit: number }> {
    const where: any = {};
    if (teamId) where.teamId = teamId;
    if (options?.status) where.status = options.status;

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [items, total] = await this.campaignRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findActive(teamId: string): Promise<Campaign[]> {
    const now = new Date();
    return this.campaignRepository.find({
      where: {
        teamId,
        status: CampaignStatus.ACTIVE,
      },
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const campaign = await this.findOne(id);
    Object.assign(campaign, data);
    return this.campaignRepository.save(campaign);
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    await this.campaignRepository.remove(campaign);
  }

  async start(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Campaign can only be started from draft or paused status');
    }

    campaign.status = CampaignStatus.ACTIVE;
    if (!campaign.startDate) {
      campaign.startDate = new Date();
    }

    return this.campaignRepository.save(campaign);
  }

  async pause(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  async complete(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.status = CampaignStatus.COMPLETED;
    campaign.endDate = new Date();
    return this.campaignRepository.save(campaign);
  }

  async archive(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.status = CampaignStatus.ARCHIVED;
    return this.campaignRepository.save(campaign);
  }

  async addLinks(id: string, linkIds: string[]): Promise<Campaign> {
    const campaign = await this.findOne(id);
    const existingIds = campaign.linkIds || [];
    campaign.linkIds = [...new Set([...existingIds, ...linkIds])];
    campaign.totalLinks = campaign.linkIds.length;
    return this.campaignRepository.save(campaign);
  }

  async removeLinks(id: string, linkIds: string[]): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.linkIds = (campaign.linkIds || []).filter((lid) => !linkIds.includes(lid));
    campaign.totalLinks = campaign.linkIds.length;
    return this.campaignRepository.save(campaign);
  }

  async updateStats(id: string, stats: { clicks?: number; conversions?: number; revenue?: number }): Promise<void> {
    const updates: any = {};

    if (stats.clicks !== undefined) {
      await this.campaignRepository.increment({ id }, 'totalClicks', stats.clicks);
    }
    if (stats.conversions !== undefined) {
      await this.campaignRepository.increment({ id }, 'conversions', stats.conversions);
    }
    if (stats.revenue !== undefined) {
      await this.campaignRepository.increment({ id }, 'revenue', stats.revenue);
    }
  }

  async getStats(id: string): Promise<{
    campaign: Campaign;
    performance: {
      clickRate: number;
      conversionRate: number;
      costPerClick: number;
      roi: number;
    };
  }> {
    const campaign = await this.findOne(id);

    const clickRate = campaign.totalLinks > 0 ? campaign.totalClicks / campaign.totalLinks : 0;
    const conversionRate = campaign.totalClicks > 0 ? (campaign.conversions / campaign.totalClicks) * 100 : 0;
    const costPerClick = campaign.totalClicks > 0 ? Number(campaign.spent) / campaign.totalClicks : 0;
    const roi = Number(campaign.spent) > 0 ? ((Number(campaign.revenue) - Number(campaign.spent)) / Number(campaign.spent)) * 100 : 0;

    return {
      campaign,
      performance: {
        clickRate,
        conversionRate,
        costPerClick,
        roi,
      },
    };
  }

  buildUtmUrl(baseUrl: string, utmParams: UTMParams): string {
    const url = new URL(baseUrl);

    if (utmParams.source) url.searchParams.set('utm_source', utmParams.source);
    if (utmParams.medium) url.searchParams.set('utm_medium', utmParams.medium);
    if (utmParams.campaign) url.searchParams.set('utm_campaign', utmParams.campaign);
    if (utmParams.term) url.searchParams.set('utm_term', utmParams.term);
    if (utmParams.content) url.searchParams.set('utm_content', utmParams.content);

    return url.toString();
  }

  async duplicate(id: string, userId: string, teamId: string): Promise<Campaign> {
    const original = await this.findOne(id);

    const duplicate = this.campaignRepository.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      userId,
      teamId,
      type: original.type,
      status: CampaignStatus.DRAFT,
      channels: original.channels || [],
      utmParams: original.utmParams || {},
      goal: original.goal,
      budget: original.budget,
      tags: original.tags || [],
      linkIds: [],
      totalLinks: 0,
      totalClicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      revenue: 0,
      spent: 0,
      settings: original.settings || {},
    } as unknown as Campaign);

    return this.campaignRepository.save(duplicate);
  }
}
