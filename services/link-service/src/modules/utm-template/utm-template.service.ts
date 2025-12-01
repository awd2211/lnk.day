import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UTMTemplate } from './entities/utm-template.entity';

interface CreateUTMTemplateDto {
  name: string;
  description?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  isDefault?: boolean;
  tags?: string[];
}

interface UpdateUTMTemplateDto extends Partial<CreateUTMTemplateDto> {}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// 预定义的 UTM 参数选项
export const UTM_SUGGESTIONS = {
  sources: [
    'google', 'facebook', 'twitter', 'linkedin', 'instagram', 'youtube',
    'email', 'newsletter', 'affiliate', 'direct', 'organic', 'referral',
    'bing', 'yahoo', 'baidu', 'tiktok', 'reddit', 'pinterest', 'wechat',
    'weibo', 'douyin', 'zhihu', 'bilibili', 'xiaohongshu',
  ],
  mediums: [
    'cpc', 'cpm', 'email', 'social', 'organic', 'referral', 'display',
    'affiliate', 'banner', 'native', 'video', 'audio', 'sms', 'push',
    'retargeting', 'influencer', 'partnership', 'offline', 'qr',
  ],
  campaigns: [
    'spring_sale', 'summer_sale', 'autumn_sale', 'winter_sale',
    'black_friday', 'cyber_monday', 'new_year', 'holiday',
    'product_launch', 'brand_awareness', 'lead_gen', 'webinar',
    'event', 'content', 'newsletter', 'promo', 'giveaway',
  ],
};

@Injectable()
export class UTMTemplateService {
  private readonly logger = new Logger(UTMTemplateService.name);

  constructor(
    @InjectRepository(UTMTemplate)
    private readonly utmTemplateRepository: Repository<UTMTemplate>,
  ) {}

  async create(
    dto: CreateUTMTemplateDto,
    userId: string,
    teamId: string,
  ): Promise<UTMTemplate> {
    // 检查名称是否重复
    const existing = await this.utmTemplateRepository.findOne({
      where: { teamId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Template with this name already exists');
    }

    // 如果设为默认，取消其他默认模板
    if (dto.isDefault) {
      await this.utmTemplateRepository.update(
        { teamId, isDefault: true },
        { isDefault: false },
      );
    }

    const template = this.utmTemplateRepository.create({
      ...dto,
      teamId,
      createdBy: userId,
    });

    return this.utmTemplateRepository.save(template);
  }

  async findAll(
    teamId: string,
    options?: { tags?: string[]; search?: string },
  ): Promise<UTMTemplate[]> {
    let query = this.utmTemplateRepository
      .createQueryBuilder('template')
      .where('template.teamId = :teamId', { teamId })
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.name', 'ASC');

    if (options?.tags?.length) {
      query = query.andWhere('template.tags && ARRAY[:...tags]::varchar[]', {
        tags: options.tags,
      });
    }

    if (options?.search) {
      query = query.andWhere(
        '(template.name ILIKE :search OR template.source ILIKE :search OR template.campaign ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<UTMTemplate> {
    const template = await this.utmTemplateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`UTM Template with ID ${id} not found`);
    }
    return template;
  }

  async findDefault(teamId: string): Promise<UTMTemplate | null> {
    return this.utmTemplateRepository.findOne({
      where: { teamId, isDefault: true },
    });
  }

  async update(id: string, dto: UpdateUTMTemplateDto): Promise<UTMTemplate> {
    const template = await this.findOne(id);

    // 如果设为默认，取消其他默认模板
    if (dto.isDefault) {
      await this.utmTemplateRepository.update(
        { teamId: template.teamId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(template, dto);
    return this.utmTemplateRepository.save(template);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.utmTemplateRepository.remove(template);
  }

  async setDefault(id: string, teamId: string): Promise<UTMTemplate> {
    const template = await this.findOne(id);

    if (template.teamId !== teamId) {
      throw new BadRequestException('Template does not belong to this team');
    }

    // 取消其他默认
    await this.utmTemplateRepository.update(
      { teamId, isDefault: true },
      { isDefault: false },
    );

    // 设置新默认
    template.isDefault = true;
    return this.utmTemplateRepository.save(template);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.utmTemplateRepository.increment({ id }, 'usageCount', 1);
  }

  // UTM 参数构建工具
  buildUTMUrl(baseUrl: string, params: UTMParams): string {
    try {
      const url = new URL(baseUrl);

      if (params.source) url.searchParams.set('utm_source', params.source);
      if (params.medium) url.searchParams.set('utm_medium', params.medium);
      if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
      if (params.term) url.searchParams.set('utm_term', params.term);
      if (params.content) url.searchParams.set('utm_content', params.content);

      return url.toString();
    } catch {
      // 如果 URL 解析失败，手动构建
      const paramParts: string[] = [];
      if (params.source) paramParts.push(`utm_source=${encodeURIComponent(params.source)}`);
      if (params.medium) paramParts.push(`utm_medium=${encodeURIComponent(params.medium)}`);
      if (params.campaign) paramParts.push(`utm_campaign=${encodeURIComponent(params.campaign)}`);
      if (params.term) paramParts.push(`utm_term=${encodeURIComponent(params.term)}`);
      if (params.content) paramParts.push(`utm_content=${encodeURIComponent(params.content)}`);

      if (paramParts.length === 0) return baseUrl;

      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${paramParts.join('&')}`;
    }
  }

  // 解析 URL 中的 UTM 参数
  parseUTMParams(url: string): UTMParams {
    try {
      const parsedUrl = new URL(url);
      return {
        source: parsedUrl.searchParams.get('utm_source') || undefined,
        medium: parsedUrl.searchParams.get('utm_medium') || undefined,
        campaign: parsedUrl.searchParams.get('utm_campaign') || undefined,
        term: parsedUrl.searchParams.get('utm_term') || undefined,
        content: parsedUrl.searchParams.get('utm_content') || undefined,
      };
    } catch {
      return {};
    }
  }

  // 获取 UTM 参数建议
  getSuggestions(): typeof UTM_SUGGESTIONS {
    return UTM_SUGGESTIONS;
  }

  // 根据模板生成 UTM 参数
  async applyTemplate(
    templateId: string,
    overrides?: Partial<UTMParams>,
  ): Promise<UTMParams> {
    const template = await this.findOne(templateId);

    // 增加使用计数
    await this.incrementUsage(templateId);

    return {
      source: overrides?.source || template.source,
      medium: overrides?.medium || template.medium,
      campaign: overrides?.campaign || template.campaign,
      term: overrides?.term || template.term,
      content: overrides?.content || template.content,
    };
  }

  // 批量应用模板
  async bulkApplyTemplate(
    templateId: string,
    urls: string[],
  ): Promise<Array<{ originalUrl: string; urlWithUTM: string }>> {
    const template = await this.findOne(templateId);

    const params: UTMParams = {
      source: template.source,
      medium: template.medium,
      campaign: template.campaign,
      term: template.term,
      content: template.content,
    };

    // 增加使用计数
    await this.utmTemplateRepository.increment({ id: templateId }, 'usageCount', urls.length);

    return urls.map((url) => ({
      originalUrl: url,
      urlWithUTM: this.buildUTMUrl(url, params),
    }));
  }

  // 复制模板
  async duplicate(
    id: string,
    userId: string,
    newName?: string,
  ): Promise<UTMTemplate> {
    const template = await this.findOne(id);

    const newTemplate = this.utmTemplateRepository.create({
      name: newName || `${template.name} (Copy)`,
      description: template.description,
      source: template.source,
      medium: template.medium,
      campaign: template.campaign,
      term: template.term,
      content: template.content,
      tags: template.tags,
      teamId: template.teamId,
      createdBy: userId,
      isDefault: false,
      usageCount: 0,
    });

    return this.utmTemplateRepository.save(newTemplate);
  }

  // 获取统计
  async getStats(teamId: string): Promise<{
    totalTemplates: number;
    totalUsage: number;
    topTemplates: Array<{ name: string; usageCount: number }>;
    topSources: Array<{ source: string; count: number }>;
    topMediums: Array<{ medium: string; count: number }>;
  }> {
    const templates = await this.utmTemplateRepository.find({ where: { teamId } });

    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);

    const topTemplates = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map((t) => ({ name: t.name, usageCount: t.usageCount }));

    // 统计 sources
    const sourceCounts = new Map<string, number>();
    const mediumCounts = new Map<string, number>();

    for (const template of templates) {
      if (template.source) {
        sourceCounts.set(
          template.source,
          (sourceCounts.get(template.source) || 0) + template.usageCount,
        );
      }
      if (template.medium) {
        mediumCounts.set(
          template.medium,
          (mediumCounts.get(template.medium) || 0) + template.usageCount,
        );
      }
    }

    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    const topMediums = Array.from(mediumCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([medium, count]) => ({ medium, count }));

    return {
      totalTemplates: templates.length,
      totalUsage,
      topTemplates,
      topSources,
      topMediums,
    };
  }
}
