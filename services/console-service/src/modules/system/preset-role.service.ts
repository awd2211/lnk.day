import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

// 权限枚举（与 user-service 保持一致）
export enum Permission {
  // 链接权限
  LINKS_VIEW = 'links:view',
  LINKS_CREATE = 'links:create',
  LINKS_EDIT = 'links:edit',
  LINKS_DELETE = 'links:delete',
  LINKS_BULK_EDIT = 'links:bulk_edit',

  // 分析权限
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADVANCED = 'analytics:advanced',

  // QR 码权限
  QR_VIEW = 'qr:view',
  QR_CREATE = 'qr:create',
  QR_EDIT = 'qr:edit',
  QR_DELETE = 'qr:delete',
  QR_BATCH = 'qr:batch',

  // Bio Link 权限
  PAGES_VIEW = 'pages:view',
  PAGES_CREATE = 'pages:create',
  PAGES_EDIT = 'pages:edit',
  PAGES_DELETE = 'pages:delete',
  PAGES_PUBLISH = 'pages:publish',

  // 活动权限
  CAMPAIGNS_VIEW = 'campaigns:view',
  CAMPAIGNS_CREATE = 'campaigns:create',
  CAMPAIGNS_EDIT = 'campaigns:edit',
  CAMPAIGNS_DELETE = 'campaigns:delete',

  // 域名权限
  DOMAINS_VIEW = 'domains:view',
  DOMAINS_ADD = 'domains:add',
  DOMAINS_REMOVE = 'domains:remove',
  DOMAINS_CONFIGURE = 'domains:configure',

  // 集成权限
  INTEGRATIONS_VIEW = 'integrations:view',
  INTEGRATIONS_MANAGE = 'integrations:manage',
  API_KEYS_VIEW = 'api_keys:view',
  API_KEYS_MANAGE = 'api_keys:manage',
  WEBHOOKS_MANAGE = 'webhooks:manage',

  // 团队管理权限
  TEAM_VIEW = 'team:view',
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  TEAM_ROLES_MANAGE = 'team:roles_manage',

  // 账单权限
  BILLING_VIEW = 'billing:view',
  BILLING_MANAGE = 'billing:manage',

  // 设置权限
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',

  // 深度链接权限
  DEEPLINKS_VIEW = 'deeplinks:view',
  DEEPLINKS_CREATE = 'deeplinks:create',
  DEEPLINKS_EDIT = 'deeplinks:edit',
}

// 系统默认预设角色权限
export const DEFAULT_PRESET_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: Object.values(Permission), // 所有权限

  ADMIN: [
    Permission.LINKS_VIEW, Permission.LINKS_CREATE, Permission.LINKS_EDIT, Permission.LINKS_DELETE, Permission.LINKS_BULK_EDIT,
    Permission.ANALYTICS_VIEW, Permission.ANALYTICS_EXPORT, Permission.ANALYTICS_ADVANCED,
    Permission.QR_VIEW, Permission.QR_CREATE, Permission.QR_EDIT, Permission.QR_DELETE, Permission.QR_BATCH,
    Permission.PAGES_VIEW, Permission.PAGES_CREATE, Permission.PAGES_EDIT, Permission.PAGES_DELETE, Permission.PAGES_PUBLISH,
    Permission.CAMPAIGNS_VIEW, Permission.CAMPAIGNS_CREATE, Permission.CAMPAIGNS_EDIT, Permission.CAMPAIGNS_DELETE,
    Permission.DOMAINS_VIEW, Permission.DOMAINS_ADD, Permission.DOMAINS_CONFIGURE,
    Permission.INTEGRATIONS_VIEW, Permission.INTEGRATIONS_MANAGE, Permission.API_KEYS_VIEW, Permission.WEBHOOKS_MANAGE,
    Permission.TEAM_VIEW, Permission.TEAM_INVITE,
    Permission.BILLING_VIEW,
    Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT,
    Permission.DEEPLINKS_VIEW, Permission.DEEPLINKS_CREATE, Permission.DEEPLINKS_EDIT,
  ],

  MEMBER: [
    Permission.LINKS_VIEW, Permission.LINKS_CREATE, Permission.LINKS_EDIT,
    Permission.ANALYTICS_VIEW,
    Permission.QR_VIEW, Permission.QR_CREATE, Permission.QR_EDIT,
    Permission.PAGES_VIEW, Permission.PAGES_CREATE, Permission.PAGES_EDIT,
    Permission.CAMPAIGNS_VIEW, Permission.CAMPAIGNS_CREATE,
    Permission.DOMAINS_VIEW,
    Permission.INTEGRATIONS_VIEW,
    Permission.TEAM_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.DEEPLINKS_VIEW, Permission.DEEPLINKS_CREATE,
  ],

  VIEWER: [
    Permission.LINKS_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.QR_VIEW,
    Permission.PAGES_VIEW,
    Permission.CAMPAIGNS_VIEW,
    Permission.DOMAINS_VIEW,
    Permission.TEAM_VIEW,
    Permission.DEEPLINKS_VIEW,
  ],
};

// 权限分组（用于 UI 显示）
export const PERMISSION_GROUPS = {
  links: {
    name: '链接管理',
    permissions: [
      Permission.LINKS_VIEW,
      Permission.LINKS_CREATE,
      Permission.LINKS_EDIT,
      Permission.LINKS_DELETE,
      Permission.LINKS_BULK_EDIT,
    ],
  },
  analytics: {
    name: '数据分析',
    permissions: [
      Permission.ANALYTICS_VIEW,
      Permission.ANALYTICS_EXPORT,
      Permission.ANALYTICS_ADVANCED,
    ],
  },
  qr: {
    name: 'QR 码',
    permissions: [
      Permission.QR_VIEW,
      Permission.QR_CREATE,
      Permission.QR_EDIT,
      Permission.QR_DELETE,
      Permission.QR_BATCH,
    ],
  },
  pages: {
    name: 'Bio 页面',
    permissions: [
      Permission.PAGES_VIEW,
      Permission.PAGES_CREATE,
      Permission.PAGES_EDIT,
      Permission.PAGES_DELETE,
      Permission.PAGES_PUBLISH,
    ],
  },
  campaigns: {
    name: '营销活动',
    permissions: [
      Permission.CAMPAIGNS_VIEW,
      Permission.CAMPAIGNS_CREATE,
      Permission.CAMPAIGNS_EDIT,
      Permission.CAMPAIGNS_DELETE,
    ],
  },
  domains: {
    name: '自定义域名',
    permissions: [
      Permission.DOMAINS_VIEW,
      Permission.DOMAINS_ADD,
      Permission.DOMAINS_REMOVE,
      Permission.DOMAINS_CONFIGURE,
    ],
  },
  integrations: {
    name: '集成与 API',
    permissions: [
      Permission.INTEGRATIONS_VIEW,
      Permission.INTEGRATIONS_MANAGE,
      Permission.API_KEYS_VIEW,
      Permission.API_KEYS_MANAGE,
      Permission.WEBHOOKS_MANAGE,
    ],
  },
  team: {
    name: '团队管理',
    permissions: [
      Permission.TEAM_VIEW,
      Permission.TEAM_INVITE,
      Permission.TEAM_REMOVE,
      Permission.TEAM_ROLES_MANAGE,
    ],
  },
  billing: {
    name: '账单',
    permissions: [
      Permission.BILLING_VIEW,
      Permission.BILLING_MANAGE,
    ],
  },
  settings: {
    name: '设置',
    permissions: [
      Permission.SETTINGS_VIEW,
      Permission.SETTINGS_EDIT,
    ],
  },
  deeplinks: {
    name: '深度链接',
    permissions: [
      Permission.DEEPLINKS_VIEW,
      Permission.DEEPLINKS_CREATE,
      Permission.DEEPLINKS_EDIT,
    ],
  },
};

export interface UpdatePresetRoleDto {
  permissions: string[];
}

export interface PresetRole {
  name: string;
  permissions: string[];
  isDefault: boolean;
}

const CONFIG_KEY_PREFIX = 'preset_role_';

@Injectable()
export class PresetRoleService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  /**
   * 获取所有预设角色权限
   */
  async findAll(): Promise<PresetRole[]> {
    const roles: PresetRole[] = [];

    for (const roleName of ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']) {
      const permissions = await this.getRolePermissions(roleName);
      const isDefault = await this.isUsingDefault(roleName);
      roles.push({
        name: roleName,
        permissions,
        isDefault,
      });
    }

    return roles;
  }

  /**
   * 获取单个预设角色
   */
  async findOne(role: string): Promise<PresetRole> {
    const roleName = role.toUpperCase();
    if (!['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(roleName)) {
      throw new NotFoundException(`角色 ${role} 不存在`);
    }

    const permissions = await this.getRolePermissions(roleName);
    const isDefault = await this.isUsingDefault(roleName);

    return {
      name: roleName,
      permissions,
      isDefault,
    };
  }

  /**
   * 更新预设角色权限
   */
  async update(role: string, dto: UpdatePresetRoleDto): Promise<PresetRole> {
    const roleName = role.toUpperCase();

    // OWNER 角色不能修改
    if (roleName === 'OWNER') {
      throw new BadRequestException('OWNER 角色的权限不可修改');
    }

    if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(roleName)) {
      throw new NotFoundException(`角色 ${role} 不存在`);
    }

    // 验证权限
    const validPermissions = Object.values(Permission);
    const invalidPermissions = dto.permissions.filter(p => !validPermissions.includes(p as Permission));
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(`无效的权限: ${invalidPermissions.join(', ')}`);
    }

    // 保存到配置
    const configKey = `${CONFIG_KEY_PREFIX}${roleName.toLowerCase()}`;
    let config = await this.configRepository.findOne({ where: { key: configKey } });

    if (config) {
      config.value = { permissions: dto.permissions };
      config.updatedAt = new Date();
    } else {
      config = this.configRepository.create({
        key: configKey,
        value: { permissions: dto.permissions },
        description: `${roleName} 角色的自定义权限配置`,
      });
    }

    await this.configRepository.save(config);

    return {
      name: roleName,
      permissions: dto.permissions,
      isDefault: false,
    };
  }

  /**
   * 重置预设角色到默认权限
   */
  async reset(role: string): Promise<PresetRole> {
    const roleName = role.toUpperCase();

    // OWNER 角色本身就是默认，无需重置
    if (roleName === 'OWNER') {
      throw new BadRequestException('OWNER 角色无需重置');
    }

    if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(roleName)) {
      throw new NotFoundException(`角色 ${role} 不存在`);
    }

    // 删除自定义配置
    const configKey = `${CONFIG_KEY_PREFIX}${roleName.toLowerCase()}`;
    await this.configRepository.delete({ key: configKey });

    return {
      name: roleName,
      permissions: DEFAULT_PRESET_ROLE_PERMISSIONS[roleName] || [],
      isDefault: true,
    };
  }

  /**
   * 获取所有可用权限
   */
  getAvailablePermissions() {
    return {
      permissions: Object.values(Permission),
      groups: PERMISSION_GROUPS,
    };
  }

  /**
   * 获取角色权限（优先使用自定义配置，否则使用默认）
   */
  private async getRolePermissions(roleName: string): Promise<string[]> {
    const configKey = `${CONFIG_KEY_PREFIX}${roleName.toLowerCase()}`;
    const config = await this.configRepository.findOne({ where: { key: configKey } });

    if (config && config.value && Array.isArray(config.value.permissions)) {
      return config.value.permissions;
    }

    return DEFAULT_PRESET_ROLE_PERMISSIONS[roleName] || [];
  }

  /**
   * 检查角色是否使用默认配置
   */
  private async isUsingDefault(roleName: string): Promise<boolean> {
    if (roleName === 'OWNER') {
      return true; // OWNER 始终使用默认
    }

    const configKey = `${CONFIG_KEY_PREFIX}${roleName.toLowerCase()}`;
    const config = await this.configRepository.findOne({ where: { key: configKey } });
    return !config;
  }
}
