import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Not, IsNull } from 'typeorm';
import { HubSpotConnection } from '../hubspot/entities/hubspot-connection.entity';
import { SalesforceConnection } from '../salesforce/entities/salesforce-connection.entity';
import { ShopifyConnection } from '../shopify/entities/shopify-connection.entity';
import { ZapierSubscription } from '../zapier/entities/zapier-subscription.entity';

export interface UnifiedIntegration {
  id: string;
  type: 'zapier' | 'hubspot' | 'salesforce' | 'shopify' | 'slack' | 'teams' | 'google_analytics' | 'facebook_pixel';
  name: string;
  teamId: string;
  teamName?: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  config: Record<string, any>;
  lastSyncAt?: Date;
  syncEnabled: boolean;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(HubSpotConnection)
    private readonly hubspotRepo: Repository<HubSpotConnection>,
    @InjectRepository(SalesforceConnection)
    private readonly salesforceRepo: Repository<SalesforceConnection>,
    @InjectRepository(ShopifyConnection)
    private readonly shopifyRepo: Repository<ShopifyConnection>,
    @InjectRepository(ZapierSubscription)
    private readonly zapierRepo: Repository<ZapierSubscription>,
  ) {}

  async getStats(): Promise<{
    total: number;
    connected: number;
    disconnected: number;
    error: number;
    byType: Record<string, number>;
  }> {
    const [hubspotCount, salesforceCount, shopifyCount, zapierCount] = await Promise.all([
      this.hubspotRepo.count({ where: { isActive: true } }),
      this.salesforceRepo.count({ where: { isActive: true } }),
      this.shopifyRepo.count({ where: { isActive: true } }),
      this.zapierRepo.count({ where: { enabled: true } }),
    ]);

    // Count connections with errors (those with lastError set)
    const [hubspotError, salesforceError] = await Promise.all([
      this.hubspotRepo.count({ where: { isActive: true, lastError: Not(IsNull()) } }),
      this.salesforceRepo.count({ where: { isActive: true, lastError: Not(IsNull()) } }),
    ]);

    const total = hubspotCount + salesforceCount + shopifyCount + zapierCount;
    const errorCount = hubspotError + salesforceError;

    return {
      total,
      connected: total - errorCount,
      disconnected: 0,
      error: errorCount,
      byType: {
        hubspot: hubspotCount,
        salesforce: salesforceCount,
        shopify: shopifyCount,
        zapier: zapierCount,
      },
    };
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: UnifiedIntegration[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20, type, status, search } = params;

    const allIntegrations: UnifiedIntegration[] = [];

    // Get all integrations from each source
    if (!type || type === 'hubspot') {
      const hubspots = await this.hubspotRepo.find({ where: { isActive: true } });
      for (const h of hubspots) {
        allIntegrations.push({
          id: h.id,
          type: 'hubspot',
          name: `HubSpot - ${h.hubspotPortalId || 'Unknown'}`,
          teamId: h.teamId,
          status: h.lastError ? 'error' : h.accessToken ? 'connected' : 'disconnected',
          config: { portalId: h.hubspotPortalId, scopes: h.scopes },
          lastSyncAt: h.lastSyncAt,
          syncEnabled: h.settings?.syncContacts !== false,
          errorMessage: h.lastError,
          createdAt: h.connectedAt,
          updatedAt: h.updatedAt,
        });
      }
    }

    if (!type || type === 'salesforce') {
      const salesforces = await this.salesforceRepo.find({ where: { isActive: true } });
      for (const s of salesforces) {
        allIntegrations.push({
          id: s.id,
          type: 'salesforce',
          name: `Salesforce - ${s.orgId || 'Unknown'}`,
          teamId: s.teamId,
          status: s.lastError ? 'error' : s.accessToken ? 'connected' : 'disconnected',
          config: { organizationId: s.orgId, instanceUrl: s.instanceUrl },
          lastSyncAt: s.lastSyncAt,
          syncEnabled: s.settings?.syncContacts !== false,
          errorMessage: s.lastError,
          createdAt: s.connectedAt,
          updatedAt: s.updatedAt,
        });
      }
    }

    if (!type || type === 'shopify') {
      const shopifys = await this.shopifyRepo.find({ where: { isActive: true } });
      for (const sh of shopifys) {
        allIntegrations.push({
          id: sh.id,
          type: 'shopify',
          name: `Shopify - ${sh.shopDomain || 'Unknown'}`,
          teamId: sh.teamId,
          status: sh.accessToken ? 'connected' : 'disconnected',
          config: { shopDomain: sh.shopDomain, scopes: sh.scopes, shopName: sh.shopName },
          lastSyncAt: sh.lastSyncAt,
          syncEnabled: sh.settings?.autoCreateProductLinks !== false,
          createdAt: sh.installedAt,
          updatedAt: sh.updatedAt,
        });
      }
    }

    if (!type || type === 'zapier') {
      const zapiers = await this.zapierRepo.find({ where: { enabled: true } });
      for (const z of zapiers) {
        allIntegrations.push({
          id: z.id,
          type: 'zapier',
          name: `Zapier - ${z.event}`,
          teamId: z.teamId,
          status: z.failureCount > 3 ? 'error' : 'connected',
          config: { event: z.event, webhookUrl: z.webhookUrl },
          syncEnabled: z.enabled,
          errorMessage: z.failureCount > 0 ? `Failed ${z.failureCount} times` : undefined,
          createdAt: z.createdAt,
          updatedAt: z.updatedAt,
        });
      }
    }

    // Filter by status
    let filtered = allIntegrations;
    if (status) {
      filtered = filtered.filter(i => i.status === status);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(searchLower) ||
        i.teamId.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt desc
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UnifiedIntegration | null> {
    // Try to find in each repository
    const hubspot = await this.hubspotRepo.findOne({ where: { id } });
    if (hubspot) {
      return {
        id: hubspot.id,
        type: 'hubspot',
        name: `HubSpot - ${hubspot.hubspotPortalId || 'Unknown'}`,
        teamId: hubspot.teamId,
        status: hubspot.lastError ? 'error' : hubspot.accessToken ? 'connected' : 'disconnected',
        config: { portalId: hubspot.hubspotPortalId, scopes: hubspot.scopes },
        lastSyncAt: hubspot.lastSyncAt,
        syncEnabled: hubspot.settings?.syncContacts !== false,
        errorMessage: hubspot.lastError,
        createdAt: hubspot.connectedAt,
        updatedAt: hubspot.updatedAt,
      };
    }

    const salesforce = await this.salesforceRepo.findOne({ where: { id } });
    if (salesforce) {
      return {
        id: salesforce.id,
        type: 'salesforce',
        name: `Salesforce - ${salesforce.orgId || 'Unknown'}`,
        teamId: salesforce.teamId,
        status: salesforce.lastError ? 'error' : salesforce.accessToken ? 'connected' : 'disconnected',
        config: { organizationId: salesforce.orgId, instanceUrl: salesforce.instanceUrl },
        lastSyncAt: salesforce.lastSyncAt,
        syncEnabled: salesforce.settings?.syncContacts !== false,
        errorMessage: salesforce.lastError,
        createdAt: salesforce.connectedAt,
        updatedAt: salesforce.updatedAt,
      };
    }

    const shopify = await this.shopifyRepo.findOne({ where: { id } });
    if (shopify) {
      return {
        id: shopify.id,
        type: 'shopify',
        name: `Shopify - ${shopify.shopDomain || 'Unknown'}`,
        teamId: shopify.teamId,
        status: shopify.accessToken ? 'connected' : 'disconnected',
        config: { shopDomain: shopify.shopDomain, scopes: shopify.scopes, shopName: shopify.shopName },
        lastSyncAt: shopify.lastSyncAt,
        syncEnabled: shopify.settings?.autoCreateProductLinks !== false,
        createdAt: shopify.installedAt,
        updatedAt: shopify.updatedAt,
      };
    }

    const zapier = await this.zapierRepo.findOne({ where: { id } });
    if (zapier) {
      // 根据 event 字段判断真正的集成类型
      const eventToType: Record<string, UnifiedIntegration['type']> = {
        'slack.notification': 'slack' as any,
        'teams.notification': 'teams' as any,
        'google_analytics.track': 'google_analytics' as any,
        'facebook_pixel.track': 'facebook_pixel' as any,
      };
      const actualType = eventToType[zapier.event] || 'zapier';
      const typeNames: Record<string, string> = {
        zapier: 'Zapier',
        slack: 'Slack',
        teams: 'Microsoft Teams',
        google_analytics: 'Google Analytics',
        facebook_pixel: 'Facebook Pixel',
      };

      return {
        id: zapier.id,
        type: actualType,
        name: `${typeNames[actualType] || actualType} - ${zapier.event}`,
        teamId: zapier.teamId,
        status: zapier.failureCount > 3 ? 'error' : 'connected',
        config: { event: zapier.event, webhookUrl: zapier.webhookUrl },
        syncEnabled: zapier.enabled,
        errorMessage: zapier.failureCount > 0 ? `Failed ${zapier.failureCount} times` : undefined,
        createdAt: zapier.createdAt,
        updatedAt: zapier.updatedAt,
      };
    }

    return null;
  }

  async getSyncLogs(integrationId: string): Promise<any[]> {
    // 目前返回模拟数据，后续可以从实际日志表读取
    return [
      {
        id: '1',
        integrationId,
        action: 'sync_contacts',
        status: 'success',
        recordsProcessed: 150,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: '2',
        integrationId,
        action: 'sync_deals',
        status: 'success',
        recordsProcessed: 45,
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7100000).toISOString(),
      },
    ];
  }

  async toggleSync(id: string, enabled: boolean): Promise<UnifiedIntegration | null> {
    // Try to find and update in each repository
    const hubspot = await this.hubspotRepo.findOne({ where: { id } });
    if (hubspot) {
      hubspot.settings = { ...hubspot.settings, syncContacts: enabled, syncDeals: enabled };
      await this.hubspotRepo.save(hubspot);
      return this.findOne(id);
    }

    const salesforce = await this.salesforceRepo.findOne({ where: { id } });
    if (salesforce) {
      salesforce.settings = { ...salesforce.settings, syncContacts: enabled, syncLeads: enabled };
      await this.salesforceRepo.save(salesforce);
      return this.findOne(id);
    }

    const shopify = await this.shopifyRepo.findOne({ where: { id } });
    if (shopify) {
      shopify.settings = { ...shopify.settings, autoCreateProductLinks: enabled };
      await this.shopifyRepo.save(shopify);
      return this.findOne(id);
    }

    const zapier = await this.zapierRepo.findOne({ where: { id } });
    if (zapier) {
      zapier.enabled = enabled;
      await this.zapierRepo.save(zapier);
      return this.findOne(id);
    }

    return null;
  }

  async disconnect(id: string): Promise<boolean> {
    // Try to find and deactivate in each repository
    const hubspot = await this.hubspotRepo.findOne({ where: { id } });
    if (hubspot) {
      hubspot.isActive = false;
      await this.hubspotRepo.save(hubspot);
      return true;
    }

    const salesforce = await this.salesforceRepo.findOne({ where: { id } });
    if (salesforce) {
      salesforce.isActive = false;
      await this.salesforceRepo.save(salesforce);
      return true;
    }

    const shopify = await this.shopifyRepo.findOne({ where: { id } });
    if (shopify) {
      shopify.isActive = false;
      await this.shopifyRepo.save(shopify);
      return true;
    }

    const zapier = await this.zapierRepo.findOne({ where: { id } });
    if (zapier) {
      zapier.enabled = false;
      await this.zapierRepo.save(zapier);
      return true;
    }

    return false;
  }

  async updateConfig(id: string, config: Record<string, any>): Promise<UnifiedIntegration | null> {
    // 目前只返回更新后的集成，实际配置更新需要根据具体字段处理
    return this.findOne(id);
  }

  async triggerSync(id: string): Promise<{ success: boolean; message: string }> {
    // 触发同步的逻辑，目前返回模拟结果
    return {
      success: true,
      message: 'Sync triggered successfully',
    };
  }

  async connect(platform: string, teamId: string, data: Record<string, any>): Promise<{ success: boolean; message: string; integration?: UnifiedIntegration }> {
    const platformLower = platform.toLowerCase();
    this.logger.log(`Connecting ${platform} for team ${teamId} with config: ${JSON.stringify(data)}`);

    try {
      switch (platformLower) {
        case 'zapier': {
          if (!data.webhookUrl) {
            return { success: false, message: '请提供 Zapier Webhook URL' };
          }
          const zapier = this.zapierRepo.create({
            teamId,
            event: 'link.clicked',  // Default event
            webhookUrl: data.webhookUrl,
            enabled: true,
            failureCount: 0,
          });
          const saved = await this.zapierRepo.save(zapier);
          const integration = await this.findOne(saved.id);
          return { success: true, message: 'Zapier 集成已连接', integration: integration || undefined };
        }

        case 'hubspot': {
          if (!data.apiKey) {
            return { success: false, message: '请提供 HubSpot API Key' };
          }
          const hubspot = this.hubspotRepo.create({
            teamId,
            accessToken: data.apiKey,
            refreshToken: '',  // API Key 模式不需要 refresh token
            hubspotPortalId: data.portalId || 'api-key-auth',
            scopes: ['contacts', 'deals'],
            isActive: true,
            connectedAt: new Date(),
            settings: { syncContacts: true, syncDeals: true },
          });
          const saved = await this.hubspotRepo.save(hubspot);
          const integration = await this.findOne(saved.id);
          return { success: true, message: 'HubSpot 集成已连接', integration: integration || undefined };
        }

        case 'salesforce': {
          if (!data.clientId || !data.clientSecret) {
            return { success: false, message: '请提供 Salesforce Client ID 和 Client Secret' };
          }
          const salesforce = this.salesforceRepo.create({
            teamId,
            accessToken: `pending_${data.clientId}`,  // 标记为待 OAuth 授权
            refreshToken: data.clientSecret,  // 临时存储 client secret
            instanceUrl: data.instanceUrl || 'https://login.salesforce.com',
            orgId: data.clientId.substring(0, 15),
            isActive: true,
            connectedAt: new Date(),
            settings: { syncContacts: true, syncLeads: true },
          });
          const saved = await this.salesforceRepo.save(salesforce);
          const integration = await this.findOne(saved.id);
          return { success: true, message: 'Salesforce 集成已保存，请完成 OAuth 授权', integration: integration || undefined };
        }

        case 'shopify': {
          if (!data.shopDomain || !data.accessToken) {
            return { success: false, message: '请提供 Shopify 店铺域名和 Access Token' };
          }
          const shopify = this.shopifyRepo.create({
            teamId,
            shopDomain: data.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
            accessToken: data.accessToken,
            scopes: ['read_products', 'read_orders'],
            isActive: true,
            installedAt: new Date(),
            settings: { autoCreateProductLinks: true },
          });
          const saved = await this.shopifyRepo.save(shopify);
          const integration = await this.findOne(saved.id);
          return { success: true, message: 'Shopify 集成已连接', integration: integration || undefined };
        }

        case 'slack':
        case 'teams': {
          if (!data.webhookUrl) {
            return { success: false, message: `请提供 ${platform} Webhook URL` };
          }
          // 使用 Zapier 表存储 Slack/Teams webhook (重用 webhook 功能)
          const webhook = this.zapierRepo.create({
            teamId,
            event: `${platformLower}.notification`,
            webhookUrl: data.webhookUrl,
            enabled: true,
            failureCount: 0,
          });
          const saved = await this.zapierRepo.save(webhook);
          const integration = await this.findOne(saved.id);
          return { success: true, message: `${platform} 集成已连接`, integration: integration || undefined };
        }

        case 'google_analytics': {
          if (!data.measurementId) {
            return { success: false, message: '请提供 Google Analytics Measurement ID' };
          }
          // 使用 Zapier 表存储 GA 配置
          const ga = this.zapierRepo.create({
            teamId,
            event: 'google_analytics.track',
            webhookUrl: `ga4://${data.measurementId}${data.apiSecret ? '?secret=' + data.apiSecret : ''}`,
            enabled: true,
            failureCount: 0,
          });
          const saved = await this.zapierRepo.save(ga);
          const integration = await this.findOne(saved.id);
          return { success: true, message: 'Google Analytics 集成已连接', integration: integration || undefined };
        }

        case 'facebook_pixel': {
          if (!data.pixelId) {
            return { success: false, message: '请提供 Facebook Pixel ID' };
          }
          // 使用 Zapier 表存储 FB Pixel 配置
          const fb = this.zapierRepo.create({
            teamId,
            event: 'facebook_pixel.track',
            webhookUrl: `fbpixel://${data.pixelId}${data.accessToken ? '?token=' + data.accessToken : ''}`,
            enabled: true,
            failureCount: 0,
          });
          const saved = await this.zapierRepo.save(fb);
          const integration = await this.findOne(saved.id);
          return { success: true, message: 'Facebook Pixel 集成已连接', integration: integration || undefined };
        }

        default:
          return { success: false, message: `不支持的平台: ${platform}` };
      }
    } catch (error: any) {
      this.logger.error(`Failed to connect ${platform}:`, error);
      return { success: false, message: error.message || '连接失败，请检查配置信息' };
    }
  }

  getAvailableIntegrations() {
    return [
      {
        type: 'zapier',
        name: 'Zapier',
        description: '连接 5000+ 应用程序，自动化工作流',
        icon: 'zapier',
        category: 'automation',
        features: ['自动触发', '多应用连接', '工作流自动化'],
        setupUrl: 'https://zapier.com',
      },
      {
        type: 'hubspot',
        name: 'HubSpot',
        description: '同步联系人和交易数据到 HubSpot CRM',
        icon: 'hubspot',
        category: 'crm',
        features: ['联系人同步', '交易追踪', '营销自动化'],
        setupUrl: 'https://hubspot.com',
      },
      {
        type: 'salesforce',
        name: 'Salesforce',
        description: '与 Salesforce CRM 深度集成',
        icon: 'salesforce',
        category: 'crm',
        features: ['Lead 管理', '机会追踪', '自定义对象'],
        setupUrl: 'https://salesforce.com',
      },
      {
        type: 'shopify',
        name: 'Shopify',
        description: '为 Shopify 商品自动创建短链接',
        icon: 'shopify',
        category: 'ecommerce',
        features: ['商品链接', '订单追踪', '优惠码追踪'],
        setupUrl: 'https://shopify.com',
      },
      {
        type: 'slack',
        name: 'Slack',
        description: '在 Slack 频道接收通知',
        icon: 'slack',
        category: 'communication',
        features: ['实时通知', '自定义频道', '互动消息'],
        setupUrl: 'https://slack.com',
      },
      {
        type: 'google_analytics',
        name: 'Google Analytics',
        description: '将点击数据发送到 Google Analytics',
        icon: 'google_analytics',
        category: 'analytics',
        features: ['事件追踪', 'UTM 参数', '转化追踪'],
        setupUrl: 'https://analytics.google.com',
      },
      {
        type: 'facebook_pixel',
        name: 'Facebook Pixel',
        description: '追踪 Facebook 广告转化',
        icon: 'facebook_pixel',
        category: 'analytics',
        features: ['像素追踪', '受众创建', '转化优化'],
        setupUrl: 'https://business.facebook.com',
      },
    ];
  }
}
