/**
 * 系统权限定义
 * 采用 resource:action 格式
 */
export enum Permission {
  // ========== 链接管理 ==========
  LINKS_VIEW = 'links:view',
  LINKS_CREATE = 'links:create',
  LINKS_EDIT = 'links:edit',
  LINKS_DELETE = 'links:delete',
  LINKS_BULK_EDIT = 'links:bulk_edit',

  // ========== 数据分析 ==========
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADVANCED = 'analytics:advanced',

  // ========== QR 码 ==========
  QR_VIEW = 'qr:view',
  QR_CREATE = 'qr:create',
  QR_EDIT = 'qr:edit',
  QR_DELETE = 'qr:delete',
  QR_BATCH = 'qr:batch',

  // ========== Bio 页面 ==========
  PAGES_VIEW = 'pages:view',
  PAGES_CREATE = 'pages:create',
  PAGES_EDIT = 'pages:edit',
  PAGES_DELETE = 'pages:delete',
  PAGES_PUBLISH = 'pages:publish',

  // ========== 营销活动 ==========
  CAMPAIGNS_VIEW = 'campaigns:view',
  CAMPAIGNS_CREATE = 'campaigns:create',
  CAMPAIGNS_EDIT = 'campaigns:edit',
  CAMPAIGNS_DELETE = 'campaigns:delete',

  // ========== 深度链接 ==========
  DEEPLINKS_VIEW = 'deeplinks:view',
  DEEPLINKS_CREATE = 'deeplinks:create',
  DEEPLINKS_EDIT = 'deeplinks:edit',
  DEEPLINKS_DELETE = 'deeplinks:delete',

  // ========== 自定义域名 ==========
  DOMAINS_VIEW = 'domains:view',
  DOMAINS_ADD = 'domains:add',
  DOMAINS_REMOVE = 'domains:remove',
  DOMAINS_CONFIGURE = 'domains:configure',

  // ========== 集成与 API ==========
  INTEGRATIONS_VIEW = 'integrations:view',
  INTEGRATIONS_MANAGE = 'integrations:manage',
  API_KEYS_VIEW = 'api_keys:view',
  API_KEYS_MANAGE = 'api_keys:manage',
  WEBHOOKS_VIEW = 'webhooks:view',
  WEBHOOKS_MANAGE = 'webhooks:manage',

  // ========== 团队管理 ==========
  TEAM_VIEW = 'team:view',
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  TEAM_ROLES_MANAGE = 'team:roles_manage',

  // ========== 账单 ==========
  BILLING_VIEW = 'billing:view',
  BILLING_MANAGE = 'billing:manage',

  // ========== 设置 ==========
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',
}

/**
 * 预设角色权限模板
 */
export const PRESET_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: Object.values(Permission), // 所有权限

  ADMIN: [
    Permission.LINKS_VIEW, Permission.LINKS_CREATE, Permission.LINKS_EDIT, Permission.LINKS_DELETE, Permission.LINKS_BULK_EDIT,
    Permission.ANALYTICS_VIEW, Permission.ANALYTICS_EXPORT, Permission.ANALYTICS_ADVANCED,
    Permission.QR_VIEW, Permission.QR_CREATE, Permission.QR_EDIT, Permission.QR_DELETE, Permission.QR_BATCH,
    Permission.PAGES_VIEW, Permission.PAGES_CREATE, Permission.PAGES_EDIT, Permission.PAGES_DELETE, Permission.PAGES_PUBLISH,
    Permission.CAMPAIGNS_VIEW, Permission.CAMPAIGNS_CREATE, Permission.CAMPAIGNS_EDIT, Permission.CAMPAIGNS_DELETE,
    Permission.DEEPLINKS_VIEW, Permission.DEEPLINKS_CREATE, Permission.DEEPLINKS_EDIT, Permission.DEEPLINKS_DELETE,
    Permission.DOMAINS_VIEW, Permission.DOMAINS_ADD, Permission.DOMAINS_CONFIGURE,
    Permission.INTEGRATIONS_VIEW, Permission.INTEGRATIONS_MANAGE, Permission.API_KEYS_VIEW, Permission.WEBHOOKS_VIEW, Permission.WEBHOOKS_MANAGE,
    Permission.TEAM_VIEW, Permission.TEAM_INVITE,
    Permission.BILLING_VIEW,
    Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT,
  ],

  MEMBER: [
    Permission.LINKS_VIEW, Permission.LINKS_CREATE, Permission.LINKS_EDIT,
    Permission.ANALYTICS_VIEW,
    Permission.QR_VIEW, Permission.QR_CREATE, Permission.QR_EDIT,
    Permission.PAGES_VIEW, Permission.PAGES_CREATE, Permission.PAGES_EDIT,
    Permission.CAMPAIGNS_VIEW, Permission.CAMPAIGNS_CREATE,
    Permission.DEEPLINKS_VIEW, Permission.DEEPLINKS_CREATE, Permission.DEEPLINKS_EDIT,
    Permission.DOMAINS_VIEW,
    Permission.INTEGRATIONS_VIEW,
    Permission.TEAM_VIEW,
    Permission.SETTINGS_VIEW,
  ],

  VIEWER: [
    Permission.LINKS_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.QR_VIEW,
    Permission.PAGES_VIEW,
    Permission.CAMPAIGNS_VIEW,
    Permission.DEEPLINKS_VIEW,
    Permission.DOMAINS_VIEW,
    Permission.TEAM_VIEW,
  ],
};

/**
 * 权限分组（用于 UI 显示）
 */
export const PERMISSION_GROUPS = {
  links: {
    name: '链接管理',
    icon: 'link',
    permissions: [
      { key: Permission.LINKS_VIEW, name: '查看链接', description: '查看短链接列表和详情' },
      { key: Permission.LINKS_CREATE, name: '创建链接', description: '创建新的短链接' },
      { key: Permission.LINKS_EDIT, name: '编辑链接', description: '编辑现有链接设置' },
      { key: Permission.LINKS_DELETE, name: '删除链接', description: '删除短链接' },
      { key: Permission.LINKS_BULK_EDIT, name: '批量操作', description: '批量编辑或删除链接' },
    ],
  },
  analytics: {
    name: '数据分析',
    icon: 'chart',
    permissions: [
      { key: Permission.ANALYTICS_VIEW, name: '查看分析', description: '查看点击统计和报表' },
      { key: Permission.ANALYTICS_EXPORT, name: '导出数据', description: '导出分析数据为 CSV/Excel' },
      { key: Permission.ANALYTICS_ADVANCED, name: '高级分析', description: '访问高级分析功能' },
    ],
  },
  qr: {
    name: 'QR 码',
    icon: 'qrcode',
    permissions: [
      { key: Permission.QR_VIEW, name: '查看 QR 码', description: '查看 QR 码列表' },
      { key: Permission.QR_CREATE, name: '创建 QR 码', description: '创建新的 QR 码' },
      { key: Permission.QR_EDIT, name: '编辑 QR 码', description: '编辑 QR 码样式' },
      { key: Permission.QR_DELETE, name: '删除 QR 码', description: '删除 QR 码' },
      { key: Permission.QR_BATCH, name: '批量生成', description: '批量生成 QR 码' },
    ],
  },
  pages: {
    name: 'Bio 页面',
    icon: 'file',
    permissions: [
      { key: Permission.PAGES_VIEW, name: '查看页面', description: '查看 Bio 页面列表' },
      { key: Permission.PAGES_CREATE, name: '创建页面', description: '创建新的 Bio 页面' },
      { key: Permission.PAGES_EDIT, name: '编辑页面', description: '编辑页面内容和样式' },
      { key: Permission.PAGES_DELETE, name: '删除页面', description: '删除 Bio 页面' },
      { key: Permission.PAGES_PUBLISH, name: '发布页面', description: '发布或取消发布页面' },
    ],
  },
  campaigns: {
    name: '营销活动',
    icon: 'megaphone',
    permissions: [
      { key: Permission.CAMPAIGNS_VIEW, name: '查看活动', description: '查看营销活动列表' },
      { key: Permission.CAMPAIGNS_CREATE, name: '创建活动', description: '创建新的营销活动' },
      { key: Permission.CAMPAIGNS_EDIT, name: '编辑活动', description: '编辑活动设置和目标' },
      { key: Permission.CAMPAIGNS_DELETE, name: '删除活动', description: '删除营销活动' },
    ],
  },
  deeplinks: {
    name: '深度链接',
    icon: 'smartphone',
    permissions: [
      { key: Permission.DEEPLINKS_VIEW, name: '查看深度链接', description: '查看深度链接配置' },
      { key: Permission.DEEPLINKS_CREATE, name: '创建深度链接', description: '创建新的深度链接' },
      { key: Permission.DEEPLINKS_EDIT, name: '编辑深度链接', description: '编辑深度链接设置' },
      { key: Permission.DEEPLINKS_DELETE, name: '删除深度链接', description: '删除深度链接' },
    ],
  },
  domains: {
    name: '自定义域名',
    icon: 'globe',
    permissions: [
      { key: Permission.DOMAINS_VIEW, name: '查看域名', description: '查看已添加的域名' },
      { key: Permission.DOMAINS_ADD, name: '添加域名', description: '添加新的自定义域名' },
      { key: Permission.DOMAINS_REMOVE, name: '移除域名', description: '移除已添加的域名' },
      { key: Permission.DOMAINS_CONFIGURE, name: '配置域名', description: '配置域名 DNS 和 SSL' },
    ],
  },
  integrations: {
    name: '集成与 API',
    icon: 'plug',
    permissions: [
      { key: Permission.INTEGRATIONS_VIEW, name: '查看集成', description: '查看已连接的集成' },
      { key: Permission.INTEGRATIONS_MANAGE, name: '管理集成', description: '连接或断开第三方集成' },
      { key: Permission.API_KEYS_VIEW, name: '查看 API 密钥', description: '查看 API 密钥列表' },
      { key: Permission.API_KEYS_MANAGE, name: '管理 API 密钥', description: '创建或撤销 API 密钥' },
      { key: Permission.WEBHOOKS_VIEW, name: '查看 Webhooks', description: '查看 Webhook 配置' },
      { key: Permission.WEBHOOKS_MANAGE, name: '管理 Webhooks', description: '配置 Webhook 端点' },
    ],
  },
  team: {
    name: '团队管理',
    icon: 'users',
    permissions: [
      { key: Permission.TEAM_VIEW, name: '查看团队', description: '查看团队成员列表' },
      { key: Permission.TEAM_INVITE, name: '邀请成员', description: '邀请新成员加入团队' },
      { key: Permission.TEAM_REMOVE, name: '移除成员', description: '从团队中移除成员' },
      { key: Permission.TEAM_ROLES_MANAGE, name: '管理角色', description: '创建和管理自定义角色' },
    ],
  },
  billing: {
    name: '账单',
    icon: 'credit-card',
    permissions: [
      { key: Permission.BILLING_VIEW, name: '查看账单', description: '查看账单和发票' },
      { key: Permission.BILLING_MANAGE, name: '管理账单', description: '管理订阅和支付方式' },
    ],
  },
  settings: {
    name: '设置',
    icon: 'settings',
    permissions: [
      { key: Permission.SETTINGS_VIEW, name: '查看设置', description: '查看团队设置' },
      { key: Permission.SETTINGS_EDIT, name: '编辑设置', description: '修改团队设置' },
    ],
  },
};

/**
 * 检查用户是否拥有指定权限
 */
export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  return userPermissions.includes(required);
}

/**
 * 检查用户是否拥有任意一个权限
 */
export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  return required.some(p => userPermissions.includes(p));
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  return required.every(p => userPermissions.includes(p));
}
