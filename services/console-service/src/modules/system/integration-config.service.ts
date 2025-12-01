import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationType } from './entities/integration-config.entity';

@Injectable()
export class IntegrationConfigService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationConfigService.name);

  constructor(
    @InjectRepository(IntegrationConfig)
    private readonly configRepo: Repository<IntegrationConfig>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultConfigs();
  }

  private async seedDefaultConfigs() {
    const count = await this.configRepo.count();
    if (count > 0) {
      return;
    }

    this.logger.log('Seeding default integration configs...');

    const defaults: Partial<IntegrationConfig>[] = [
      {
        type: IntegrationType.ZAPIER,
        name: 'Zapier',
        description: '连接 5000+ 应用的自动化平台，让用户通过 Zaps 自动化工作流程',
        enabled: false,
        scopes: ['link.created', 'link.clicked', 'link.updated', 'link.deleted'],
        settings: {
          maxSubscriptionsPerTeam: 10,
          retryAttempts: 3,
        },
      },
      {
        type: IntegrationType.HUBSPOT,
        name: 'HubSpot',
        description: 'CRM 和营销自动化平台，同步联系人和追踪链接活动',
        enabled: false,
        scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read'],
        settings: {
          syncContacts: true,
          syncDeals: true,
          logActivities: true,
        },
      },
      {
        type: IntegrationType.SALESFORCE,
        name: 'Salesforce',
        description: '企业级 CRM 解决方案，同步销售线索和追踪转化',
        enabled: false,
        scopes: ['api', 'refresh_token', 'offline_access'],
        settings: {
          syncLeads: true,
          syncContacts: true,
          syncOpportunities: true,
        },
      },
      {
        type: IntegrationType.SHOPIFY,
        name: 'Shopify',
        description: '电商平台集成，为产品自动生成短链接并追踪销售转化',
        enabled: false,
        scopes: ['read_products', 'write_products', 'read_orders'],
        settings: {
          autoCreateProductLinks: true,
          trackOrders: true,
          syncDiscounts: false,
        },
      },
    ];

    for (const config of defaults) {
      await this.configRepo.save(this.configRepo.create(config));
    }

    this.logger.log(`Seeded ${defaults.length} integration configs`);
  }

  async findAll(): Promise<IntegrationConfig[]> {
    return this.configRepo.find({
      order: { type: 'ASC' },
    });
  }

  async findOne(type: IntegrationType): Promise<IntegrationConfig | null> {
    return this.configRepo.findOne({ where: { type } });
  }

  async findById(id: string): Promise<IntegrationConfig | null> {
    return this.configRepo.findOne({ where: { id } });
  }

  async update(
    id: string,
    data: Partial<IntegrationConfig>,
    adminId?: string,
  ): Promise<IntegrationConfig> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) {
      throw new Error(`Integration config with ID ${id} not found`);
    }

    // 不允许更新 type
    delete (data as any).type;
    delete (data as any).id;

    Object.assign(config, data);
    if (adminId) {
      config.updatedBy = adminId;
    }

    return this.configRepo.save(config);
  }

  async toggle(id: string, enabled: boolean, adminId?: string): Promise<IntegrationConfig> {
    return this.update(id, { enabled }, adminId);
  }

  async getStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<string, { enabled: boolean; userConnections: number }>;
  }> {
    const configs = await this.configRepo.find();

    const enabled = configs.filter(c => c.enabled).length;
    const byType: Record<string, { enabled: boolean; userConnections: number }> = {};

    for (const config of configs) {
      byType[config.type] = {
        enabled: config.enabled,
        userConnections: 0, // 后续从 integration-service 获取
      };
    }

    return {
      total: configs.length,
      enabled,
      disabled: configs.length - enabled,
      byType,
    };
  }

  // 检查某个集成是否已启用（供其他服务调用）
  async isEnabled(type: IntegrationType): Promise<boolean> {
    const config = await this.configRepo.findOne({ where: { type } });
    return config?.enabled ?? false;
  }

  // 获取集成的 OAuth 配置（供其他服务调用）
  async getOAuthConfig(type: IntegrationType): Promise<{
    clientId: string;
    clientSecret: string;
    scopes: string[];
    callbackUrl: string;
  } | null> {
    const config = await this.configRepo.findOne({ where: { type } });
    if (!config || !config.enabled) {
      return null;
    }

    return {
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      scopes: config.scopes || [],
      callbackUrl: config.callbackUrl || '',
    };
  }
}
