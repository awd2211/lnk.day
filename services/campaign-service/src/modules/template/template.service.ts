import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignTemplate } from './template.entity';
import { Campaign, CampaignStatus } from '../campaign/entities/campaign.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(CampaignTemplate)
    private readonly templateRepository: Repository<CampaignTemplate>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async create(data: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    const template = this.templateRepository.create(data);
    return this.templateRepository.save(template);
  }

  async createFromCampaign(
    campaignId: string,
    name: string,
    userId: string,
    teamId: string,
    options?: {
      description?: string;
      isPublic?: boolean;
      includeGoals?: boolean;
    },
  ): Promise<CampaignTemplate> {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const template = this.templateRepository.create({
      name,
      description: options?.description || `Template from ${campaign.name}`,
      teamId,
      userId,
      isPublic: options?.isPublic || false,
      type: campaign.type,
      channels: campaign.channels,
      utmParams: campaign.utmParams,
      settings: campaign.settings,
      tags: campaign.tags,
      defaultGoals: options?.includeGoals && campaign.goal
        ? {
            clicks: campaign.goal.type === 'clicks' ? campaign.goal.target : undefined,
            conversions: campaign.goal.type === 'conversions' ? campaign.goal.target : undefined,
            revenue: campaign.goal.type === 'revenue' ? campaign.goal.target : undefined,
          }
        : undefined,
    });

    return this.templateRepository.save(template);
  }

  async findAll(teamId: string): Promise<CampaignTemplate[]> {
    return this.templateRepository.find({
      where: [{ teamId }, { isPublic: true }],
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
  }

  async findPublic(): Promise<CampaignTemplate[]> {
    return this.templateRepository.find({
      where: { isPublic: true },
      order: { usageCount: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CampaignTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async update(id: string, data: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, data);
    return this.templateRepository.save(template);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }

  async duplicate(id: string, userId: string, teamId: string): Promise<CampaignTemplate> {
    const template = await this.findOne(id);

    const duplicated = this.templateRepository.create({
      name: `${template.name} (副本)`,
      description: template.description,
      type: template.type,
      channels: template.channels,
      utmParams: template.utmParams,
      settings: template.settings,
      tags: template.tags,
      defaultGoals: template.defaultGoals,
      isPublic: false, // 复制后默认为私有
      userId,
      teamId,
      usageCount: 0,
    });

    return this.templateRepository.save(duplicated);
  }

  async getCategories(): Promise<{ id: string; name: string; description: string; templates: CampaignTemplate[] }[]> {
    // 返回按类型分组的系统模板类别
    const publicTemplates = await this.findPublic();

    const categories = [
      { id: 'social-media', name: '社交媒体营销', description: '适用于社交平台推广' },
      { id: 'email-marketing', name: '邮件营销', description: '适用于电子邮件推广' },
      { id: 'paid-ads', name: '付费广告', description: '适用于付费广告推广' },
      { id: 'influencer', name: '网红合作', description: '适用于 KOL 推广' },
      { id: 'product-launch', name: '产品发布', description: '适用于新产品推广' },
      { id: 'seasonal', name: '季节性促销', description: '适用于节假日促销' },
    ];

    return categories.map(cat => ({
      ...cat,
      templates: publicTemplates.filter(t => t.tags?.includes(cat.id) || t.type === cat.id),
    }));
  }

  async createCampaignFromTemplate(
    templateId: string,
    campaignData: {
      name: string;
      userId: string;
      teamId: string;
      startDate?: Date;
      endDate?: Date;
      budget?: number;
      overrides?: Partial<Campaign>;
    },
  ): Promise<Campaign> {
    const template = await this.findOne(templateId);

    // Increment usage count
    template.usageCount += 1;
    await this.templateRepository.save(template);

    const campaign = this.campaignRepository.create({
      name: campaignData.name,
      userId: campaignData.userId,
      teamId: campaignData.teamId,
      type: template.type,
      status: CampaignStatus.DRAFT,
      channels: template.channels,
      utmParams: template.utmParams,
      settings: template.settings,
      tags: template.tags,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      budget: campaignData.budget,
      goal: template.defaultGoals
        ? {
            type: 'clicks',
            target: template.defaultGoals.clicks || 0,
            current: 0,
          }
        : undefined,
      ...campaignData.overrides,
    });

    return this.campaignRepository.save(campaign);
  }
}
