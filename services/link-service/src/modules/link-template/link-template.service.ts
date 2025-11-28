import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';

import { LinkTemplate, LinkTemplatePreset } from './entities/link-template.entity';
import {
  CreateLinkTemplateDto,
  UpdateLinkTemplateDto,
  CreateLinkFromTemplateDto,
  LinkTemplateQueryDto,
} from './dto/link-template.dto';
import { LinkService } from '../link/link.service';

@Injectable()
export class LinkTemplateService {
  constructor(
    @InjectRepository(LinkTemplate)
    private readonly templateRepository: Repository<LinkTemplate>,
    @InjectRepository(LinkTemplatePreset)
    private readonly presetRepository: Repository<LinkTemplatePreset>,
    private readonly linkService: LinkService,
  ) {}

  // ========== Custom Templates CRUD ==========

  async create(
    dto: CreateLinkTemplateDto,
    userId: string,
    teamId: string,
  ): Promise<LinkTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      teamId,
      createdBy: userId,
    });

    return this.templateRepository.save(template);
  }

  async findAll(
    teamId: string,
    query: LinkTemplateQueryDto,
  ): Promise<{ templates: LinkTemplate[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    let queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .where('template.teamId = :teamId', { teamId });

    if (query.search) {
      queryBuilder = queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.favoritesOnly) {
      queryBuilder = queryBuilder.andWhere('template.isFavorite = true');
    }

    const [templates, total] = await queryBuilder
      .orderBy('template.isFavorite', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .addOrderBy('template.lastUsedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { templates, total };
  }

  async findOne(id: string, teamId: string): Promise<LinkTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    dto: UpdateLinkTemplateDto,
    teamId: string,
  ): Promise<LinkTemplate> {
    const template = await this.findOne(id, teamId);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async remove(id: string, teamId: string): Promise<void> {
    const template = await this.findOne(id, teamId);
    await this.templateRepository.remove(template);
  }

  async toggleFavorite(id: string, teamId: string): Promise<LinkTemplate> {
    const template = await this.findOne(id, teamId);
    template.isFavorite = !template.isFavorite;
    return this.templateRepository.save(template);
  }

  // ========== Create Link From Template ==========

  async createLinkFromTemplate(
    dto: CreateLinkFromTemplateDto,
    userId: string,
    teamId: string,
  ) {
    const template = await this.findOne(dto.templateId, teamId);

    // Merge UTM params
    const utmParams = {
      ...template.defaultUtmParams,
      ...dto.utmOverrides,
    };

    // Merge tags
    const tags = [
      ...(template.defaultTags || []),
      ...(dto.additionalTags || []),
    ];

    // Calculate expiry
    let expiresAt: Date | undefined;
    if (template.defaultExpiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + template.defaultExpiresInDays);
    }

    // Create the link
    const link = await this.linkService.create(
      {
        originalUrl: dto.originalUrl,
        customSlug: dto.customSlug,
        title: dto.title,
        domain: template.defaultDomain,
        folderId: template.defaultFolderId,
        tags: tags.length > 0 ? tags : undefined,
        utmParams: Object.keys(utmParams).length > 0 ? utmParams : undefined,
        expiresAt,
      },
      userId,
      teamId,
    );

    // Update template usage stats
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    await this.templateRepository.save(template);

    return link;
  }

  // ========== Preset Templates ==========

  async getPresets(): Promise<LinkTemplatePreset[]> {
    return this.presetRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getPresetsByCategory(category: string): Promise<LinkTemplatePreset[]> {
    return this.presetRepository.find({
      where: { category, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async createFromPreset(
    presetId: string,
    name: string,
    userId: string,
    teamId: string,
  ): Promise<LinkTemplate> {
    const preset = await this.presetRepository.findOne({
      where: { id: presetId },
    });

    if (!preset) {
      throw new NotFoundException(`Preset with ID ${presetId} not found`);
    }

    const template = this.templateRepository.create({
      name: name || preset.name,
      description: preset.description,
      icon: preset.icon,
      color: preset.color,
      teamId,
      createdBy: userId,
      defaultTags: preset.defaults.tags,
      defaultUtmParams: preset.defaults.utmParams,
      defaultDeviceTargeting: preset.defaults.deviceTargeting,
    });

    return this.templateRepository.save(template);
  }

  // ========== Seed Presets ==========

  async seedPresets(): Promise<void> {
    const existingCount = await this.presetRepository.count();
    if (existingCount > 0) {
      return;
    }

    const presets: Partial<LinkTemplatePreset>[] = [
      // Marketing Templates
      {
        name: '营销活动',
        description: '通用营销活动链接模板',
        icon: 'megaphone',
        color: '#3498db',
        category: 'marketing',
        defaults: {
          tags: ['marketing', 'campaign'],
          utmParams: {
            medium: 'campaign',
          },
        },
        sortOrder: 1,
      },
      {
        name: '促销活动',
        description: '限时促销和折扣活动',
        icon: 'tag',
        color: '#e74c3c',
        category: 'marketing',
        defaults: {
          tags: ['promotion', 'sale'],
          utmParams: {
            medium: 'promotion',
            campaign: 'sale',
          },
        },
        sortOrder: 2,
      },
      {
        name: '产品发布',
        description: '新产品发布链接',
        icon: 'rocket',
        color: '#9b59b6',
        category: 'marketing',
        defaults: {
          tags: ['product', 'launch'],
          utmParams: {
            medium: 'product',
            campaign: 'launch',
          },
        },
        sortOrder: 3,
      },

      // Social Media Templates
      {
        name: 'Instagram Bio',
        description: 'Instagram 个人简介链接',
        icon: 'instagram',
        color: '#e1306c',
        category: 'social',
        defaults: {
          tags: ['social', 'instagram'],
          utmParams: {
            source: 'instagram',
            medium: 'social',
          },
        },
        sortOrder: 1,
      },
      {
        name: 'TikTok Bio',
        description: 'TikTok 个人简介链接',
        icon: 'video',
        color: '#000000',
        category: 'social',
        defaults: {
          tags: ['social', 'tiktok'],
          utmParams: {
            source: 'tiktok',
            medium: 'social',
          },
        },
        sortOrder: 2,
      },
      {
        name: 'Twitter/X 分享',
        description: 'Twitter/X 分享链接',
        icon: 'twitter',
        color: '#1da1f2',
        category: 'social',
        defaults: {
          tags: ['social', 'twitter'],
          utmParams: {
            source: 'twitter',
            medium: 'social',
          },
        },
        sortOrder: 3,
      },
      {
        name: '微信分享',
        description: '微信分享链接',
        icon: 'message-circle',
        color: '#07c160',
        category: 'social',
        defaults: {
          tags: ['social', 'wechat'],
          utmParams: {
            source: 'wechat',
            medium: 'social',
          },
        },
        sortOrder: 4,
      },
      {
        name: '微博分享',
        description: '微博分享链接',
        icon: 'message-square',
        color: '#e6162d',
        category: 'social',
        defaults: {
          tags: ['social', 'weibo'],
          utmParams: {
            source: 'weibo',
            medium: 'social',
          },
        },
        sortOrder: 5,
      },

      // Email Templates
      {
        name: '邮件营销',
        description: '邮件营销活动链接',
        icon: 'mail',
        color: '#f39c12',
        category: 'email',
        defaults: {
          tags: ['email', 'newsletter'],
          utmParams: {
            medium: 'email',
          },
        },
        sortOrder: 1,
      },
      {
        name: '新闻通讯',
        description: '新闻通讯链接',
        icon: 'newspaper',
        color: '#1abc9c',
        category: 'email',
        defaults: {
          tags: ['email', 'newsletter'],
          utmParams: {
            source: 'newsletter',
            medium: 'email',
          },
        },
        sortOrder: 2,
      },
      {
        name: '交易邮件',
        description: '订单确认、发货通知等',
        icon: 'shopping-cart',
        color: '#2ecc71',
        category: 'email',
        defaults: {
          tags: ['email', 'transactional'],
          utmParams: {
            medium: 'email',
            campaign: 'transactional',
          },
        },
        sortOrder: 3,
      },

      // QR Code Templates
      {
        name: '线下物料',
        description: '海报、传单等印刷品',
        icon: 'qr-code',
        color: '#34495e',
        category: 'qr',
        defaults: {
          tags: ['offline', 'print'],
          utmParams: {
            source: 'print',
            medium: 'offline',
          },
        },
        sortOrder: 1,
      },
      {
        name: '产品包装',
        description: '产品包装上的二维码',
        icon: 'box',
        color: '#8e44ad',
        category: 'qr',
        defaults: {
          tags: ['offline', 'packaging'],
          utmParams: {
            source: 'packaging',
            medium: 'offline',
          },
        },
        sortOrder: 2,
      },
      {
        name: '店铺展示',
        description: '实体店内展示',
        icon: 'store',
        color: '#e67e22',
        category: 'qr',
        defaults: {
          tags: ['offline', 'store'],
          utmParams: {
            source: 'store',
            medium: 'offline',
          },
        },
        sortOrder: 3,
      },

      // Custom/Other Templates
      {
        name: 'API 集成',
        description: '通过API创建的链接',
        icon: 'code',
        color: '#95a5a6',
        category: 'custom',
        defaults: {
          tags: ['api', 'integration'],
          utmParams: {
            medium: 'api',
          },
        },
        sortOrder: 1,
      },
      {
        name: '合作伙伴',
        description: '合作伙伴推广链接',
        icon: 'users',
        color: '#27ae60',
        category: 'custom',
        defaults: {
          tags: ['partner', 'referral'],
          utmParams: {
            medium: 'partner',
          },
        },
        sortOrder: 2,
      },
      {
        name: '付费广告',
        description: 'SEM/信息流等付费广告',
        icon: 'dollar-sign',
        color: '#f1c40f',
        category: 'custom',
        defaults: {
          tags: ['paid', 'ads'],
          utmParams: {
            medium: 'cpc',
          },
        },
        sortOrder: 3,
      },
    ];

    for (const preset of presets) {
      const entity = this.presetRepository.create(preset);
      await this.presetRepository.save(entity);
    }

    console.log(`Seeded ${presets.length} link template presets`);
  }

  // ========== Statistics ==========

  async getMostUsedTemplates(
    teamId: string,
    limit: number = 5,
  ): Promise<LinkTemplate[]> {
    return this.templateRepository.find({
      where: { teamId },
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  async getRecentlyUsedTemplates(
    teamId: string,
    limit: number = 5,
  ): Promise<LinkTemplate[]> {
    return this.templateRepository
      .createQueryBuilder('template')
      .where('template.teamId = :teamId', { teamId })
      .andWhere('template.lastUsedAt IS NOT NULL')
      .orderBy('template.lastUsedAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
