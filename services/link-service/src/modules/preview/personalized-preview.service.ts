import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  PreviewConfig,
  PreviewTemplate,
  PreviewAnalytics,
  PreviewTargetType,
  DeviceType,
} from './entities/preview-config.entity';
import { Link } from '../link/entities/link.entity';

interface VisitorContext {
  userAgent?: string;
  ip?: string;
  country?: string;
  language?: string;
  device?: DeviceType;
  referrer?: string;
  platform?: string;
  timestamp?: Date;
}

export interface PersonalizedPreviewMeta {
  // Open Graph
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType: string;
  ogUrl: string;
  ogSiteName?: string;
  // Twitter
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterCreator?: string;
  // Custom
  customMeta?: Record<string, string>;
  // Debug info
  appliedConfigId?: string;
  abTestGroup?: string;
}

@Injectable()
export class PersonalizedPreviewService {
  private readonly logger = new Logger(PersonalizedPreviewService.name);

  constructor(
    @InjectRepository(PreviewConfig)
    private previewConfigRepo: Repository<PreviewConfig>,
    @InjectRepository(PreviewTemplate)
    private previewTemplateRepo: Repository<PreviewTemplate>,
    @InjectRepository(PreviewAnalytics)
    private previewAnalyticsRepo: Repository<PreviewAnalytics>,
    @InjectRepository(Link)
    private linkRepo: Repository<Link>,
  ) {}

  // ==================== Preview Config CRUD ====================

  async createConfig(
    linkId: string,
    data: Partial<PreviewConfig>,
    teamId: string,
  ): Promise<PreviewConfig> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId, teamId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const config = this.previewConfigRepo.create({
      ...data,
      linkId,
    });

    return this.previewConfigRepo.save(config);
  }

  async updateConfig(
    id: string,
    data: Partial<PreviewConfig>,
    teamId: string,
  ): Promise<PreviewConfig> {
    const config = await this.previewConfigRepo.findOne({
      where: { id },
      relations: ['link'],
    });

    if (!config || config.link?.teamId !== teamId) {
      throw new NotFoundException('Preview config not found');
    }

    Object.assign(config, data);
    return this.previewConfigRepo.save(config);
  }

  async deleteConfig(id: string, teamId: string): Promise<void> {
    const config = await this.previewConfigRepo.findOne({
      where: { id },
      relations: ['link'],
    });

    if (!config || config.link?.teamId !== teamId) {
      throw new NotFoundException('Preview config not found');
    }

    await this.previewConfigRepo.remove(config);
  }

  async getConfigsByLink(linkId: string, teamId: string): Promise<PreviewConfig[]> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId, teamId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return this.previewConfigRepo.find({
      where: { linkId },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async getConfig(id: string, teamId: string): Promise<PreviewConfig> {
    const config = await this.previewConfigRepo.findOne({
      where: { id },
      relations: ['link'],
    });

    if (!config || config.link?.teamId !== teamId) {
      throw new NotFoundException('Preview config not found');
    }

    return config;
  }

  // ==================== Preview Template CRUD ====================

  async createTemplate(
    teamId: string,
    data: Partial<PreviewTemplate>,
  ): Promise<PreviewTemplate> {
    if (data.isDefault) {
      await this.previewTemplateRepo.update(
        { teamId, isDefault: true },
        { isDefault: false },
      );
    }

    const template = this.previewTemplateRepo.create({
      ...data,
      teamId,
    });

    return this.previewTemplateRepo.save(template);
  }

  async updateTemplate(
    id: string,
    data: Partial<PreviewTemplate>,
    teamId: string,
  ): Promise<PreviewTemplate> {
    const template = await this.previewTemplateRepo.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (data.isDefault && !template.isDefault) {
      await this.previewTemplateRepo.update(
        { teamId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(template, data);
    return this.previewTemplateRepo.save(template);
  }

  async deleteTemplate(id: string, teamId: string): Promise<void> {
    const template = await this.previewTemplateRepo.findOne({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.previewTemplateRepo.remove(template);
  }

  async getTemplates(teamId: string): Promise<PreviewTemplate[]> {
    return this.previewTemplateRepo.find({
      where: { teamId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  // ==================== Personalized Preview Generation ====================

  async generatePersonalizedPreview(
    linkId: string,
    context: VisitorContext,
  ): Promise<PersonalizedPreviewMeta> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const now = new Date();

    // 获取所有适用的配置
    const configs = await this.previewConfigRepo.find({
      where: {
        linkId,
        isActive: true,
      },
      order: { priority: 'DESC' },
    });

    // 筛选时间范围内的配置
    const activeConfigs = configs.filter((config) => {
      if (config.startDate && config.startDate > now) return false;
      if (config.endDate && config.endDate < now) return false;
      return true;
    });

    // 匹配最合适的配置
    const matchedConfig = this.matchConfig(activeConfigs, context);

    // 构建预览元数据
    const preview = this.buildPreviewMeta(link, matchedConfig, context);

    // 记录分析数据
    await this.recordAnalytics(linkId, matchedConfig?.id, context);

    return preview;
  }

  private matchConfig(
    configs: PreviewConfig[],
    context: VisitorContext,
  ): PreviewConfig | null {
    for (const config of configs) {
      if (this.configMatches(config, context)) {
        if (config.abTestEnabled) {
          const random = Math.random() * 100;
          if (random > config.abTestWeight) {
            continue;
          }
        }
        return config;
      }
    }
    return null;
  }

  private configMatches(config: PreviewConfig, context: VisitorContext): boolean {
    switch (config.targetType) {
      case PreviewTargetType.DEVICE:
        return this.matchDevice(config.targetValue, context.device);

      case PreviewTargetType.COUNTRY:
        return this.matchValue(config.targetValue, context.country);

      case PreviewTargetType.LANGUAGE:
        return this.matchValue(config.targetValue, context.language);

      case PreviewTargetType.REFERRER:
        return this.matchReferrer(config.targetValue, context.referrer);

      case PreviewTargetType.USER_AGENT:
        return this.matchUserAgent(config.targetValue, context.userAgent);

      case PreviewTargetType.TIME:
        return this.matchTime(config.targetValue, context.timestamp || new Date());

      case PreviewTargetType.CUSTOM:
        return this.matchCustomConditions(config.conditions, context);

      default:
        return false;
    }
  }

  private matchDevice(targetValue: string, device?: DeviceType): boolean {
    if (!device) return false;
    if (targetValue === DeviceType.ALL) return true;
    return targetValue.toLowerCase() === device.toLowerCase();
  }

  private matchValue(targetValue: string, contextValue?: string): boolean {
    if (!contextValue) return false;
    const targets = targetValue.split(',').map((v) => v.trim().toLowerCase());
    return targets.includes(contextValue.toLowerCase());
  }

  private matchReferrer(targetValue: string, referrer?: string): boolean {
    if (!referrer) return false;
    const patterns = targetValue.split(',').map((v) => v.trim().toLowerCase());
    const refLower = referrer.toLowerCase();
    return patterns.some((pattern) => refLower.includes(pattern));
  }

  private matchUserAgent(targetValue: string, userAgent?: string): boolean {
    if (!userAgent) return false;
    try {
      const regex = new RegExp(targetValue, 'i');
      return regex.test(userAgent);
    } catch {
      return userAgent.toLowerCase().includes(targetValue.toLowerCase());
    }
  }

  private matchTime(targetValue: string, timestamp: Date): boolean {
    const [start, end] = targetValue.split('-').map(Number);
    const hour = timestamp.getHours();
    return hour >= (start ?? 0) && hour < (end ?? 24);
  }

  private matchCustomConditions(
    conditions: PreviewConfig['conditions'],
    context: VisitorContext,
  ): boolean {
    if (!conditions || !conditions.rules) return true;

    const results = conditions.rules.map((rule) => {
      const contextValue = (context as any)[rule.field];
      if (!contextValue) return false;

      switch (rule.operator) {
        case 'equals':
          return contextValue === rule.value;
        case 'contains':
          return contextValue.includes(rule.value);
        case 'startsWith':
          return contextValue.startsWith(rule.value);
        case 'endsWith':
          return contextValue.endsWith(rule.value);
        case 'regex':
          try {
            return new RegExp(rule.value).test(contextValue);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });

    return conditions.operator === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  private buildPreviewMeta(
    link: Link,
    config: PreviewConfig | null,
    context: VisitorContext,
  ): PersonalizedPreviewMeta {
    const baseMeta: PersonalizedPreviewMeta = {
      ogTitle: link.title || link.originalUrl,
      ogDescription: link.description || '',
      ogImage: (link as any).ogImage || '',
      ogType: 'website',
      ogUrl: `${process.env.SHORT_URL_BASE || 'https://lnk.day'}/${link.shortCode}`,
      twitterCard: 'summary_large_image',
      twitterTitle: link.title || link.originalUrl,
      twitterDescription: link.description || '',
      twitterImage: (link as any).ogImage || '',
    };

    if (!config) {
      return baseMeta;
    }

    const preview: PersonalizedPreviewMeta = {
      ogTitle: this.processTemplate(config.ogTitle || baseMeta.ogTitle, context),
      ogDescription: this.processTemplate(
        config.ogDescription || baseMeta.ogDescription,
        context,
      ),
      ogImage: config.ogImage || baseMeta.ogImage,
      ogImageWidth: config.ogImageWidth,
      ogImageHeight: config.ogImageHeight,
      ogType: config.ogType || baseMeta.ogType,
      ogUrl: baseMeta.ogUrl,
      ogSiteName: config.ogSiteName,
      twitterCard: config.twitterCard || baseMeta.twitterCard,
      twitterTitle: this.processTemplate(
        config.twitterTitle || config.ogTitle || baseMeta.twitterTitle,
        context,
      ),
      twitterDescription: this.processTemplate(
        config.twitterDescription || config.ogDescription || baseMeta.twitterDescription,
        context,
      ),
      twitterImage: config.twitterImage || config.ogImage || baseMeta.twitterImage,
      twitterCreator: config.twitterCreator,
      customMeta: config.customMeta,
      appliedConfigId: config.id,
      abTestGroup: config.abTestGroup,
    };

    return preview;
  }

  private processTemplate(template: string, context: VisitorContext): string {
    if (!template) return template;

    let result = template;
    const variables: Record<string, string> = {
      '{country}': context.country || '',
      '{language}': context.language || '',
      '{device}': context.device || '',
      '{date}': new Date().toLocaleDateString(),
      '{time}': new Date().toLocaleTimeString(),
      '{year}': new Date().getFullYear().toString(),
      '{month}': (new Date().getMonth() + 1).toString(),
      '{day}': new Date().getDate().toString(),
    };

    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  private async recordAnalytics(
    linkId: string,
    configId: string | undefined,
    context: VisitorContext,
  ): Promise<void> {
    try {
      const analytics = this.previewAnalyticsRepo.create({
        linkId,
        previewConfigId: configId,
        platform: context.platform,
        userAgent: context.userAgent,
        country: context.country,
        device: context.device,
        isBot: this.isBot(context.userAgent),
        referrer: context.referrer,
      });

      await this.previewAnalyticsRepo.save(analytics);

      if (configId) {
        await this.previewConfigRepo.increment({ id: configId }, 'impressions', 1);
      }
    } catch (error) {
      this.logger.error('Failed to record preview analytics:', error);
    }
  }

  private isBot(userAgent?: string): boolean {
    if (!userAgent) return false;
    const botPatterns = [
      'facebookexternalhit',
      'Twitterbot',
      'LinkedInBot',
      'Slackbot',
      'TelegramBot',
      'WhatsApp',
      'Googlebot',
      'bingbot',
      'Discordbot',
      'Pinterest',
      'Embedly',
    ];
    return botPatterns.some((pattern) =>
      userAgent.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  // ==================== Preview HTML Generation ====================

  async generatePreviewHTML(linkId: string, context: VisitorContext): Promise<string> {
    const meta = await this.generatePersonalizedPreview(linkId, context);

    const tags: string[] = [
      `<meta property="og:title" content="${this.escapeHtml(meta.ogTitle)}" />`,
      `<meta property="og:description" content="${this.escapeHtml(meta.ogDescription)}" />`,
      `<meta property="og:image" content="${this.escapeHtml(meta.ogImage)}" />`,
      `<meta property="og:url" content="${this.escapeHtml(meta.ogUrl)}" />`,
      `<meta property="og:type" content="${this.escapeHtml(meta.ogType)}" />`,
    ];

    if (meta.ogImageWidth) {
      tags.push(`<meta property="og:image:width" content="${meta.ogImageWidth}" />`);
    }
    if (meta.ogImageHeight) {
      tags.push(`<meta property="og:image:height" content="${meta.ogImageHeight}" />`);
    }
    if (meta.ogSiteName) {
      tags.push(`<meta property="og:site_name" content="${this.escapeHtml(meta.ogSiteName)}" />`);
    }

    tags.push(
      `<meta name="twitter:card" content="${this.escapeHtml(meta.twitterCard)}" />`,
      `<meta name="twitter:title" content="${this.escapeHtml(meta.twitterTitle)}" />`,
      `<meta name="twitter:description" content="${this.escapeHtml(meta.twitterDescription)}" />`,
      `<meta name="twitter:image" content="${this.escapeHtml(meta.twitterImage)}" />`,
    );

    if (meta.twitterCreator) {
      tags.push(`<meta name="twitter:creator" content="${this.escapeHtml(meta.twitterCreator)}" />`);
    }

    if (meta.customMeta) {
      for (const [name, content] of Object.entries(meta.customMeta)) {
        tags.push(`<meta name="${this.escapeHtml(name)}" content="${this.escapeHtml(content)}" />`);
      }
    }

    return tags.join('\n');
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==================== Analytics ====================

  async getPreviewAnalytics(
    linkId: string,
    teamId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalImpressions: number;
    byPlatform: Record<string, number>;
    byDevice: Record<string, number>;
    byCountry: Record<string, number>;
    byConfig: Array<{ configId: string; name: string; impressions: number }>;
  }> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId, teamId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const queryBuilder = this.previewAnalyticsRepo
      .createQueryBuilder('pa')
      .where('pa.linkId = :linkId', { linkId });

    if (startDate) {
      queryBuilder.andWhere('pa.viewedAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('pa.viewedAt <= :endDate', { endDate });
    }

    const analytics = await queryBuilder.getMany();

    const byPlatform: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byConfigId: Record<string, number> = {};

    for (const item of analytics) {
      if (item.platform) {
        byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
      }
      if (item.device) {
        byDevice[item.device] = (byDevice[item.device] || 0) + 1;
      }
      if (item.country) {
        byCountry[item.country] = (byCountry[item.country] || 0) + 1;
      }
      if (item.previewConfigId) {
        byConfigId[item.previewConfigId] = (byConfigId[item.previewConfigId] || 0) + 1;
      }
    }

    const configIds = Object.keys(byConfigId);
    const configs = configIds.length
      ? await this.previewConfigRepo.find({
          where: { id: In(configIds) },
          select: ['id', 'name'],
        })
      : [];

    const configMap = new Map(configs.map((c) => [c.id, c.name]));

    return {
      totalImpressions: analytics.length,
      byPlatform,
      byDevice,
      byCountry,
      byConfig: Object.entries(byConfigId).map(([configId, impressions]) => ({
        configId,
        name: configMap.get(configId) || 'Unknown',
        impressions,
      })),
    };
  }

  // ==================== Bulk Operations ====================

  async applyTemplateToLinks(
    templateId: string,
    linkIds: string[],
    teamId: string,
  ): Promise<{ success: number; failed: number }> {
    const template = await this.previewTemplateRepo.findOne({
      where: { id: templateId, teamId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    let success = 0;
    let failed = 0;

    for (const linkId of linkIds) {
      try {
        const link = await this.linkRepo.findOne({
          where: { id: linkId, teamId },
        });

        if (!link) {
          failed++;
          continue;
        }

        await this.previewConfigRepo.save({
          linkId,
          name: `Template: ${template.name}`,
          targetType: PreviewTargetType.DEVICE,
          targetValue: DeviceType.ALL,
          ogTitle: template.ogTitleTemplate,
          ogDescription: template.ogDescriptionTemplate,
          ogImage: template.ogImageTemplate,
          ogType: template.ogType,
          twitterCard: template.twitterCard,
          isActive: true,
          priority: 0,
        });

        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  async duplicateConfig(
    configId: string,
    targetLinkId: string,
    teamId: string,
  ): Promise<PreviewConfig> {
    const config = await this.previewConfigRepo.findOne({
      where: { id: configId },
      relations: ['link'],
    });

    if (!config || config.link?.teamId !== teamId) {
      throw new NotFoundException('Config not found');
    }

    const targetLink = await this.linkRepo.findOne({
      where: { id: targetLinkId, teamId },
    });

    if (!targetLink) {
      throw new NotFoundException('Target link not found');
    }

    const newConfig = this.previewConfigRepo.create({
      ...config,
      id: undefined,
      linkId: targetLinkId,
      name: `${config.name} (Copy)`,
      impressions: 0,
      clicks: 0,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return this.previewConfigRepo.save(newConfig);
  }

  // ==================== Preview Simulation ====================

  async simulatePreview(
    linkId: string,
    context: VisitorContext,
    teamId: string,
  ): Promise<{
    preview: PersonalizedPreviewMeta;
    matchedConfig: PreviewConfig | null;
    allConfigs: PreviewConfig[];
    matchDetails: {
      configId: string;
      name: string;
      matched: boolean;
      reason?: string;
    }[];
  }> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId, teamId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const configs = await this.previewConfigRepo.find({
      where: { linkId, isActive: true },
      order: { priority: 'DESC' },
    });

    const matchDetails = configs.map((config) => {
      const matched = this.configMatches(config, context);
      return {
        configId: config.id,
        name: config.name,
        matched,
        reason: matched
          ? `Matched ${config.targetType}: ${config.targetValue}`
          : `No match for ${config.targetType}`,
      };
    });

    const matchedConfig = configs.find((c) => this.configMatches(c, context)) || null;
    const preview = this.buildPreviewMeta(link, matchedConfig, context);

    return {
      preview,
      matchedConfig,
      allConfigs: configs,
      matchDetails,
    };
  }

  // ==================== Supported Target Types ====================

  getSupportedTargetTypes(): {
    type: PreviewTargetType;
    name: string;
    description: string;
    exampleValues: string[];
  }[] {
    return [
      {
        type: PreviewTargetType.DEVICE,
        name: '设备类型',
        description: '根据访问设备类型展示不同预览',
        exampleValues: ['mobile', 'desktop', 'tablet', 'all'],
      },
      {
        type: PreviewTargetType.COUNTRY,
        name: '国家/地区',
        description: '根据访问者所在国家展示不同预览',
        exampleValues: ['CN', 'US', 'JP', 'CN,HK,TW'],
      },
      {
        type: PreviewTargetType.LANGUAGE,
        name: '语言',
        description: '根据访问者语言偏好展示不同预览',
        exampleValues: ['zh', 'en', 'ja', 'zh,zh-TW'],
      },
      {
        type: PreviewTargetType.TIME,
        name: '时间段',
        description: '根据访问时间展示不同预览（24小时制）',
        exampleValues: ['9-18', '18-24', '0-6'],
      },
      {
        type: PreviewTargetType.REFERRER,
        name: '来源',
        description: '根据访问来源展示不同预览',
        exampleValues: ['facebook.com', 'twitter.com', 'linkedin.com'],
      },
      {
        type: PreviewTargetType.USER_AGENT,
        name: 'User Agent',
        description: '根据 User Agent 正则匹配展示不同预览',
        exampleValues: ['iPhone', 'Android', 'Windows'],
      },
      {
        type: PreviewTargetType.CUSTOM,
        name: '自定义规则',
        description: '使用自定义条件组合匹配',
        exampleValues: ['{ operator: "and", rules: [...] }'],
      },
    ];
  }

  // ==================== Template Variables ====================

  getSupportedTemplateVariables(): {
    variable: string;
    name: string;
    description: string;
  }[] {
    return [
      { variable: '{country}', name: '国家', description: '访问者所在国家' },
      { variable: '{language}', name: '语言', description: '访问者语言' },
      { variable: '{device}', name: '设备', description: '访问设备类型' },
      { variable: '{date}', name: '日期', description: '当前日期' },
      { variable: '{time}', name: '时间', description: '当前时间' },
      { variable: '{year}', name: '年份', description: '当前年份' },
      { variable: '{month}', name: '月份', description: '当前月份' },
      { variable: '{day}', name: '日', description: '当前日期' },
    ];
  }
}
