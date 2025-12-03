import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import {
  LinkTemplatePreset,
  UTMTemplatePreset,
  CampaignTemplatePreset,
  BioLinkTemplatePreset,
  QRStylePreset,
  DeepLinkTemplatePreset,
  WebhookTemplatePreset,
  RedirectRuleTemplatePreset,
  SeoTemplatePreset,
  ReportTemplatePreset,
} from './entities';
import {
  CreateLinkTemplateDto,
  UpdateLinkTemplateDto,
  ReorderLinkTemplatesDto,
  CreateUTMTemplateDto,
  UpdateUTMTemplateDto,
  CreateCampaignTemplateDto,
  UpdateCampaignTemplateDto,
  CreateBioLinkTemplateDto,
  UpdateBioLinkTemplateDto,
  CreateQRStyleDto,
  UpdateQRStyleDto,
  CreateDeepLinkTemplateDto,
  UpdateDeepLinkTemplateDto,
  CreateWebhookTemplateDto,
  UpdateWebhookTemplateDto,
  CreateRedirectRuleTemplateDto,
  UpdateRedirectRuleTemplateDto,
  CreateSeoTemplateDto,
  UpdateSeoTemplateDto,
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
} from './dto';

interface QueryOptions {
  search?: string;
  category?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(LinkTemplatePreset)
    private readonly linkTemplateRepo: Repository<LinkTemplatePreset>,
    @InjectRepository(UTMTemplatePreset)
    private readonly utmTemplateRepo: Repository<UTMTemplatePreset>,
    @InjectRepository(CampaignTemplatePreset)
    private readonly campaignTemplateRepo: Repository<CampaignTemplatePreset>,
    @InjectRepository(BioLinkTemplatePreset)
    private readonly bioLinkTemplateRepo: Repository<BioLinkTemplatePreset>,
    @InjectRepository(QRStylePreset)
    private readonly qrStyleRepo: Repository<QRStylePreset>,
    @InjectRepository(DeepLinkTemplatePreset)
    private readonly deepLinkTemplateRepo: Repository<DeepLinkTemplatePreset>,
    @InjectRepository(WebhookTemplatePreset)
    private readonly webhookTemplateRepo: Repository<WebhookTemplatePreset>,
    @InjectRepository(RedirectRuleTemplatePreset)
    private readonly redirectRuleTemplateRepo: Repository<RedirectRuleTemplatePreset>,
    @InjectRepository(SeoTemplatePreset)
    private readonly seoTemplateRepo: Repository<SeoTemplatePreset>,
    @InjectRepository(ReportTemplatePreset)
    private readonly reportTemplateRepo: Repository<ReportTemplatePreset>,
  ) {}

  // ==================== Link Templates ====================

  async findAllLinkTemplates(options: QueryOptions) {
    const { search, category, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.linkTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLinkTemplateStats() {
    const total = await this.linkTemplateRepo.count();
    const active = await this.linkTemplateRepo.count({ where: { isActive: true } });
    const totalUsage = await this.linkTemplateRepo
      .createQueryBuilder('t')
      .select('SUM(t.usageCount)', 'total')
      .getRawOne();

    const byCategory = await this.linkTemplateRepo
      .createQueryBuilder('t')
      .select('t.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.category')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      totalUsage: parseInt(totalUsage?.total || '0', 10),
      byCategory,
    };
  }

  async findOneLinkTemplate(id: string) {
    const template = await this.linkTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Link template not found');
    }
    return template;
  }

  async createLinkTemplate(dto: CreateLinkTemplateDto, createdBy?: string) {
    const template = this.linkTemplateRepo.create({
      ...dto,
      createdBy,
    });
    return this.linkTemplateRepo.save(template);
  }

  async updateLinkTemplate(id: string, dto: UpdateLinkTemplateDto) {
    const template = await this.findOneLinkTemplate(id);
    Object.assign(template, dto);
    return this.linkTemplateRepo.save(template);
  }

  async removeLinkTemplate(id: string) {
    const template = await this.findOneLinkTemplate(id);
    await this.linkTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleLinkTemplate(id: string) {
    const template = await this.findOneLinkTemplate(id);
    template.isActive = !template.isActive;
    return this.linkTemplateRepo.save(template);
  }

  async reorderLinkTemplates(dto: ReorderLinkTemplatesDto) {
    for (const item of dto.items) {
      await this.linkTemplateRepo.update(item.id, { sortOrder: item.sortOrder });
    }
    return { success: true };
  }

  // ==================== UTM Templates ====================

  async findAllUTMTemplates(options: QueryOptions & { platform?: string }) {
    const { search, category, platform, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (platform) {
      where.platform = platform;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.utmTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUTMPlatforms() {
    const platforms = await this.utmTemplateRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.platform', 'platform')
      .where('t.platform IS NOT NULL')
      .getRawMany();
    return platforms.map((p) => p.platform).filter(Boolean);
  }

  async findOneUTMTemplate(id: string) {
    const template = await this.utmTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('UTM template not found');
    }
    return template;
  }

  async createUTMTemplate(dto: CreateUTMTemplateDto) {
    const template = this.utmTemplateRepo.create(dto);
    return this.utmTemplateRepo.save(template);
  }

  async updateUTMTemplate(id: string, dto: UpdateUTMTemplateDto) {
    const template = await this.findOneUTMTemplate(id);
    Object.assign(template, dto);
    return this.utmTemplateRepo.save(template);
  }

  async removeUTMTemplate(id: string) {
    const template = await this.findOneUTMTemplate(id);
    await this.utmTemplateRepo.remove(template);
    return { success: true };
  }

  async seedUTMPlatformTemplates() {
    const platformTemplates = [
      { name: 'Google Ads', platform: 'google_ads', category: 'advertising', source: 'google', medium: 'cpc' },
      { name: 'Facebook Ads', platform: 'facebook', category: 'advertising', source: 'facebook', medium: 'paid_social' },
      { name: 'Instagram', platform: 'instagram', category: 'social', source: 'instagram', medium: 'social' },
      { name: 'Twitter/X', platform: 'twitter', category: 'social', source: 'twitter', medium: 'social' },
      { name: 'LinkedIn', platform: 'linkedin', category: 'social', source: 'linkedin', medium: 'social' },
      { name: 'TikTok', platform: 'tiktok', category: 'social', source: 'tiktok', medium: 'social' },
      { name: 'YouTube', platform: 'youtube', category: 'content', source: 'youtube', medium: 'video' },
      { name: 'Email Newsletter', platform: 'email', category: 'email', source: 'newsletter', medium: 'email' },
      { name: 'Affiliate', platform: 'affiliate', category: 'affiliate', source: 'affiliate', medium: 'referral' },
    ];

    const created = [];
    for (const tmpl of platformTemplates) {
      const existing = await this.utmTemplateRepo.findOne({ where: { platform: tmpl.platform } });
      if (!existing) {
        const template = this.utmTemplateRepo.create(tmpl as any);
        created.push(await this.utmTemplateRepo.save(template));
      }
    }
    return { created: created.length, templates: created };
  }

  // ==================== Campaign Templates ====================

  async findAllCampaignTemplates(options: QueryOptions & { scenario?: string }) {
    const { search, scenario, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (scenario) {
      where.scenario = scenario;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.campaignTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCampaignScenarios() {
    return [
      { value: 'holiday_promotion', label: '节日促销' },
      { value: 'new_product_launch', label: '新品发布' },
      { value: 'flash_sale', label: '限时抢购' },
      { value: 'seasonal_campaign', label: '季节性活动' },
      { value: 'brand_awareness', label: '品牌推广' },
      { value: 'lead_generation', label: '获客活动' },
      { value: 'event_marketing', label: '活动营销' },
      { value: 'influencer_collaboration', label: '网红合作' },
      { value: 'referral_program', label: '推荐计划' },
      { value: 'newsletter', label: '邮件营销' },
      { value: 'other', label: '其他' },
    ];
  }

  async findOneCampaignTemplate(id: string) {
    const template = await this.campaignTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Campaign template not found');
    }
    return template;
  }

  async createCampaignTemplate(dto: CreateCampaignTemplateDto) {
    const template = this.campaignTemplateRepo.create(dto);
    return this.campaignTemplateRepo.save(template);
  }

  async updateCampaignTemplate(id: string, dto: UpdateCampaignTemplateDto) {
    const template = await this.findOneCampaignTemplate(id);
    Object.assign(template, dto);
    return this.campaignTemplateRepo.save(template);
  }

  async removeCampaignTemplate(id: string) {
    const template = await this.findOneCampaignTemplate(id);
    await this.campaignTemplateRepo.remove(template);
    return { success: true };
  }

  // ==================== Bio Link Templates ====================

  async findAllBioLinkTemplates(options: QueryOptions & { industry?: string; layoutType?: string }) {
    const { search, category, industry, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (industry) {
      where.industry = industry;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.bioLinkTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBioLinkIndustries() {
    return [
      { value: 'influencer', label: '网红/博主' },
      { value: 'business', label: '企业/商务' },
      { value: 'restaurant', label: '餐饮' },
      { value: 'education', label: '教育' },
      { value: 'ecommerce', label: '电商' },
      { value: 'music', label: '音乐' },
      { value: 'fitness', label: '健身' },
      { value: 'portfolio', label: '作品集' },
      { value: 'nonprofit', label: '公益组织' },
      { value: 'healthcare', label: '医疗健康' },
      { value: 'other', label: '其他' },
    ];
  }

  async findOneBioLinkTemplate(id: string) {
    const template = await this.bioLinkTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Bio Link template not found');
    }
    return template;
  }

  async createBioLinkTemplate(dto: CreateBioLinkTemplateDto) {
    const template = this.bioLinkTemplateRepo.create(dto);
    return this.bioLinkTemplateRepo.save(template);
  }

  async updateBioLinkTemplate(id: string, dto: UpdateBioLinkTemplateDto) {
    const template = await this.findOneBioLinkTemplate(id);
    Object.assign(template, dto);
    return this.bioLinkTemplateRepo.save(template);
  }

  async removeBioLinkTemplate(id: string) {
    const template = await this.findOneBioLinkTemplate(id);
    await this.bioLinkTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleBioLinkTemplate(id: string) {
    const template = await this.findOneBioLinkTemplate(id);
    template.isActive = !template.isActive;
    return this.bioLinkTemplateRepo.save(template);
  }

  // ==================== QR Styles ====================

  async findAllQRStyles(options: QueryOptions) {
    const { search, category, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.qrStyleRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneQRStyle(id: string) {
    const style = await this.qrStyleRepo.findOne({ where: { id } });
    if (!style) {
      throw new NotFoundException('QR style not found');
    }
    return style;
  }

  async createQRStyle(dto: CreateQRStyleDto) {
    const style = this.qrStyleRepo.create(dto);
    return this.qrStyleRepo.save(style);
  }

  async updateQRStyle(id: string, dto: UpdateQRStyleDto) {
    const style = await this.findOneQRStyle(id);
    Object.assign(style, dto);
    return this.qrStyleRepo.save(style);
  }

  async removeQRStyle(id: string) {
    const style = await this.findOneQRStyle(id);
    await this.qrStyleRepo.remove(style);
    return { success: true };
  }

  async toggleQRStyle(id: string) {
    const style = await this.findOneQRStyle(id);
    style.isActive = !style.isActive;
    return this.qrStyleRepo.save(style);
  }

  async seedQRStyles() {
    const defaultStyles = [
      {
        name: '经典黑白',
        category: 'classic',
        style: { foregroundColor: '#000000', backgroundColor: '#FFFFFF' },
      },
      {
        name: '深蓝',
        category: 'classic',
        style: { foregroundColor: '#1E40AF', backgroundColor: '#FFFFFF' },
      },
      {
        name: '渐变紫',
        category: 'gradient',
        style: {
          foregroundColor: '#7C3AED',
          backgroundColor: '#FFFFFF',
          gradient: { enabled: true, startColor: '#7C3AED', endColor: '#EC4899', direction: 'diagonal' },
        },
      },
      {
        name: '圆点风格',
        category: 'modern',
        style: {
          foregroundColor: '#000000',
          backgroundColor: '#FFFFFF',
          dotStyle: 'dots',
          eyeStyle: { outer: 'circle', inner: 'circle' },
        },
      },
      {
        name: '圆角风格',
        category: 'modern',
        style: {
          foregroundColor: '#000000',
          backgroundColor: '#FFFFFF',
          dotStyle: 'rounded',
          cornerRadius: 8,
        },
      },
    ];

    const created = [];
    for (const styleData of defaultStyles) {
      const existing = await this.qrStyleRepo.findOne({ where: { name: styleData.name } });
      if (!existing) {
        const style = this.qrStyleRepo.create(styleData as any);
        created.push(await this.qrStyleRepo.save(style));
      }
    }
    return { created: created.length, styles: created };
  }

  // ==================== DeepLink Templates ====================

  async findAllDeepLinkTemplates(options: QueryOptions) {
    const { search, category, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.deepLinkTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneDeepLinkTemplate(id: string) {
    const template = await this.deepLinkTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('DeepLink template not found');
    }
    return template;
  }

  async createDeepLinkTemplate(dto: CreateDeepLinkTemplateDto) {
    const template = this.deepLinkTemplateRepo.create(dto);
    return this.deepLinkTemplateRepo.save(template);
  }

  async updateDeepLinkTemplate(id: string, dto: UpdateDeepLinkTemplateDto) {
    const template = await this.findOneDeepLinkTemplate(id);
    Object.assign(template, dto);
    return this.deepLinkTemplateRepo.save(template);
  }

  async removeDeepLinkTemplate(id: string) {
    const template = await this.findOneDeepLinkTemplate(id);
    await this.deepLinkTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleDeepLinkTemplate(id: string) {
    const template = await this.findOneDeepLinkTemplate(id);
    template.isActive = !template.isActive;
    return this.deepLinkTemplateRepo.save(template);
  }

  async getDeepLinkCategories() {
    return [
      { value: 'social', label: '社交平台' },
      { value: 'commerce', label: '电商应用' },
      { value: 'media', label: '媒体应用' },
      { value: 'utility', label: '工具应用' },
      { value: 'custom', label: '自定义' },
    ];
  }

  // ==================== Webhook Templates ====================

  async findAllWebhookTemplates(options: QueryOptions & { platform?: string }) {
    const { search, category, platform, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.platform = category; // category maps to platform for webhooks
    }
    if (platform) {
      where.platform = platform;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.webhookTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneWebhookTemplate(id: string) {
    const template = await this.webhookTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Webhook template not found');
    }
    return template;
  }

  async createWebhookTemplate(dto: CreateWebhookTemplateDto) {
    const template = this.webhookTemplateRepo.create(dto);
    return this.webhookTemplateRepo.save(template);
  }

  async updateWebhookTemplate(id: string, dto: UpdateWebhookTemplateDto) {
    const template = await this.findOneWebhookTemplate(id);
    Object.assign(template, dto);
    return this.webhookTemplateRepo.save(template);
  }

  async removeWebhookTemplate(id: string) {
    const template = await this.findOneWebhookTemplate(id);
    await this.webhookTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleWebhookTemplate(id: string) {
    const template = await this.findOneWebhookTemplate(id);
    template.isActive = !template.isActive;
    return this.webhookTemplateRepo.save(template);
  }

  async getWebhookPlatforms() {
    return [
      { value: 'slack', label: 'Slack' },
      { value: 'discord', label: 'Discord' },
      { value: 'teams', label: 'Microsoft Teams' },
      { value: 'custom', label: '自定义' },
    ];
  }

  // ==================== Redirect Rule Templates ====================

  async findAllRedirectRuleTemplates(options: QueryOptions) {
    const { search, category, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.redirectRuleTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneRedirectRuleTemplate(id: string) {
    const template = await this.redirectRuleTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Redirect rule template not found');
    }
    return template;
  }

  async createRedirectRuleTemplate(dto: CreateRedirectRuleTemplateDto) {
    const template = this.redirectRuleTemplateRepo.create(dto);
    return this.redirectRuleTemplateRepo.save(template);
  }

  async updateRedirectRuleTemplate(id: string, dto: UpdateRedirectRuleTemplateDto) {
    const template = await this.findOneRedirectRuleTemplate(id);
    Object.assign(template, dto);
    return this.redirectRuleTemplateRepo.save(template);
  }

  async removeRedirectRuleTemplate(id: string) {
    const template = await this.findOneRedirectRuleTemplate(id);
    await this.redirectRuleTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleRedirectRuleTemplate(id: string) {
    const template = await this.findOneRedirectRuleTemplate(id);
    template.isActive = !template.isActive;
    return this.redirectRuleTemplateRepo.save(template);
  }

  async getRedirectRuleCategories() {
    return [
      { value: 'ab_test', label: 'A/B 测试' },
      { value: 'geo', label: '地理位置' },
      { value: 'device', label: '设备类型' },
      { value: 'time', label: '时间规则' },
      { value: 'custom', label: '自定义' },
    ];
  }

  // ==================== SEO Templates ====================

  async findAllSeoTemplates(options: QueryOptions) {
    const { search, category, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.seoTemplateRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneSeoTemplate(id: string) {
    const template = await this.seoTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('SEO template not found');
    }
    return template;
  }

  async createSeoTemplate(dto: CreateSeoTemplateDto) {
    const template = this.seoTemplateRepo.create(dto);
    return this.seoTemplateRepo.save(template);
  }

  async updateSeoTemplate(id: string, dto: UpdateSeoTemplateDto) {
    const template = await this.findOneSeoTemplate(id);
    Object.assign(template, dto);
    return this.seoTemplateRepo.save(template);
  }

  async removeSeoTemplate(id: string) {
    const template = await this.findOneSeoTemplate(id);
    await this.seoTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleSeoTemplate(id: string) {
    const template = await this.findOneSeoTemplate(id);
    template.isActive = !template.isActive;
    return this.seoTemplateRepo.save(template);
  }

  async getSeoCategories() {
    return [
      { value: 'general', label: '通用' },
      { value: 'landing_page', label: '落地页' },
      { value: 'bio_link', label: 'Bio Link' },
      { value: 'product', label: '产品页' },
      { value: 'article', label: '文章' },
      { value: 'profile', label: '个人主页' },
    ];
  }

  // ==================== Report Templates ====================

  async findAllReportTemplates(options: QueryOptions) {
    const { search, category, status, page = 1, limit = 20 } = options;
    const where: any = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.isActive = status === 'active';
    }

    const [items, total] = await this.reportTemplateRepo.findAndCount({
      where,
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneReportTemplate(id: string) {
    const template = await this.reportTemplateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Report template not found');
    }
    return template;
  }

  async createReportTemplate(dto: CreateReportTemplateDto) {
    const template = this.reportTemplateRepo.create(dto);
    return this.reportTemplateRepo.save(template);
  }

  async updateReportTemplate(id: string, dto: UpdateReportTemplateDto) {
    const template = await this.findOneReportTemplate(id);
    Object.assign(template, dto);
    return this.reportTemplateRepo.save(template);
  }

  async removeReportTemplate(id: string) {
    const template = await this.findOneReportTemplate(id);
    await this.reportTemplateRepo.remove(template);
    return { success: true };
  }

  async toggleReportTemplate(id: string) {
    const template = await this.findOneReportTemplate(id);
    template.isActive = !template.isActive;
    return this.reportTemplateRepo.save(template);
  }

  async getReportCategories() {
    return [
      { value: 'traffic', label: '流量报告' },
      { value: 'conversion', label: '转化报告' },
      { value: 'engagement', label: '互动报告' },
      { value: 'comparison', label: '对比报告' },
      { value: 'custom', label: '自定义' },
    ];
  }

  async getAvailableMetrics() {
    return [
      { value: 'clicks', label: '点击数' },
      { value: 'unique_visitors', label: '独立访客' },
      { value: 'conversions', label: '转化数' },
      { value: 'conversion_rate', label: '转化率' },
      { value: 'bounce_rate', label: '跳出率' },
      { value: 'avg_time_on_page', label: '平均停留时间' },
      { value: 'page_views', label: '页面浏览' },
      { value: 'referrers', label: '来源' },
    ];
  }

  async getAvailableDimensions() {
    return [
      { value: 'date', label: '日期' },
      { value: 'country', label: '国家' },
      { value: 'city', label: '城市' },
      { value: 'device', label: '设备' },
      { value: 'browser', label: '浏览器' },
      { value: 'os', label: '操作系统' },
      { value: 'referrer', label: '来源' },
      { value: 'campaign', label: '活动' },
    ];
  }

  // ==================== Global Stats ====================

  async getTemplateStats() {
    const [
      linkCount,
      utmCount,
      campaignCount,
      bioLinkCount,
      qrCount,
      deepLinkCount,
      webhookCount,
      redirectRuleCount,
      seoCount,
      reportCount,
    ] = await Promise.all([
      this.linkTemplateRepo.count(),
      this.utmTemplateRepo.count(),
      this.campaignTemplateRepo.count(),
      this.bioLinkTemplateRepo.count(),
      this.qrStyleRepo.count(),
      this.deepLinkTemplateRepo.count(),
      this.webhookTemplateRepo.count(),
      this.redirectRuleTemplateRepo.count(),
      this.seoTemplateRepo.count(),
      this.reportTemplateRepo.count(),
    ]);

    return {
      link: linkCount,
      utm: utmCount,
      campaign: campaignCount,
      bioLink: bioLinkCount,
      qr: qrCount,
      deepLink: deepLinkCount,
      webhook: webhookCount,
      redirectRule: redirectRuleCount,
      seo: seoCount,
      report: reportCount,
      total: linkCount + utmCount + campaignCount + bioLinkCount + qrCount +
             deepLinkCount + webhookCount + redirectRuleCount + seoCount + reportCount,
    };
  }
}
