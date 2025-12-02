// ============================================================================
// 资源权限（用户门户使用）
// ============================================================================

/**
 * 资源权限定义
 * 采用 resource:action 格式
 * 用于用户门户的团队内权限控制
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

// ============================================================================
// 管理权限（管理后台使用）
// ============================================================================

/**
 * 管理员权限定义
 * 采用 admin:resource:action 格式
 * 用于平台管理后台的权限控制
 */
export enum AdminPermission {
  // ========== 用户管理 ==========
  ADMIN_USERS_VIEW = 'admin:users:view',
  ADMIN_USERS_EDIT = 'admin:users:edit',
  ADMIN_USERS_SUSPEND = 'admin:users:suspend',
  ADMIN_USERS_DELETE = 'admin:users:delete',

  // ========== 团队管理 ==========
  ADMIN_TEAMS_VIEW = 'admin:teams:view',
  ADMIN_TEAMS_EDIT = 'admin:teams:edit',
  ADMIN_TEAMS_DELETE = 'admin:teams:delete',

  // ========== 内容审核 ==========
  ADMIN_MODERATION_VIEW = 'admin:moderation:view',
  ADMIN_MODERATION_ACTION = 'admin:moderation:action',

  // ========== 全局资源访问（跨团队）==========
  ADMIN_RESOURCES_VIEW = 'admin:resources:view',
  ADMIN_RESOURCES_EDIT = 'admin:resources:edit',
  ADMIN_RESOURCES_DELETE = 'admin:resources:delete',

  // ========== 域名管理 ==========
  ADMIN_DOMAINS_VIEW = 'admin:domains:view',
  ADMIN_DOMAINS_APPROVE = 'admin:domains:approve',
  ADMIN_DOMAINS_REVOKE = 'admin:domains:revoke',

  // ========== 系统配置 ==========
  ADMIN_SYSTEM_CONFIG = 'admin:system:config',
  ADMIN_SYSTEM_METRICS = 'admin:system:metrics',
  ADMIN_SYSTEM_LOGS = 'admin:system:logs',

  // ========== 账单与订阅 ==========
  ADMIN_BILLING_VIEW = 'admin:billing:view',
  ADMIN_BILLING_MANAGE = 'admin:billing:manage',

  // ========== 管理员管理 ==========
  ADMIN_ADMINS_VIEW = 'admin:admins:view',
  ADMIN_ADMINS_MANAGE = 'admin:admins:manage',

  // ========== 安全管理 ==========
  ADMIN_SECURITY_VIEW = 'admin:security:view',
  ADMIN_SECURITY_MANAGE = 'admin:security:manage',
}

// ============================================================================
// 权限继承链（核心改进）
// ============================================================================

/**
 * 基础只读权限（VIEWER 角色）
 */
const VIEWER_PERMISSIONS: Permission[] = [
  Permission.LINKS_VIEW,
  Permission.ANALYTICS_VIEW,
  Permission.QR_VIEW,
  Permission.PAGES_VIEW,
  Permission.CAMPAIGNS_VIEW,
  Permission.DEEPLINKS_VIEW,
  Permission.DOMAINS_VIEW,
  Permission.TEAM_VIEW,
];

/**
 * MEMBER 新增权限（继承 VIEWER）
 */
const MEMBER_ADDITIONAL: Permission[] = [
  Permission.LINKS_CREATE,
  Permission.LINKS_EDIT,
  Permission.QR_CREATE,
  Permission.QR_EDIT,
  Permission.PAGES_CREATE,
  Permission.PAGES_EDIT,
  Permission.CAMPAIGNS_CREATE,
  Permission.DEEPLINKS_CREATE,
  Permission.DEEPLINKS_EDIT,
  Permission.INTEGRATIONS_VIEW,
  Permission.SETTINGS_VIEW,
];

/**
 * ADMIN 新增权限（继承 MEMBER）
 */
const ADMIN_ADDITIONAL: Permission[] = [
  Permission.LINKS_DELETE,
  Permission.LINKS_BULK_EDIT,
  Permission.ANALYTICS_EXPORT,
  Permission.ANALYTICS_ADVANCED,
  Permission.QR_DELETE,
  Permission.QR_BATCH,
  Permission.PAGES_DELETE,
  Permission.PAGES_PUBLISH,
  Permission.CAMPAIGNS_EDIT,
  Permission.CAMPAIGNS_DELETE,
  Permission.DEEPLINKS_DELETE,
  Permission.DOMAINS_ADD,
  Permission.DOMAINS_CONFIGURE,
  Permission.INTEGRATIONS_MANAGE,
  Permission.API_KEYS_VIEW,
  Permission.WEBHOOKS_VIEW,
  Permission.WEBHOOKS_MANAGE,
  Permission.TEAM_INVITE,
  Permission.BILLING_VIEW,
  Permission.SETTINGS_EDIT,
];

/**
 * OWNER 新增权限（继承 ADMIN）
 */
const OWNER_ADDITIONAL: Permission[] = [
  Permission.DOMAINS_REMOVE,
  Permission.API_KEYS_MANAGE,
  Permission.TEAM_REMOVE,
  Permission.TEAM_ROLES_MANAGE,
  Permission.BILLING_MANAGE,
];

/**
 * 构建继承链权限
 */
function buildInheritedPermissions(): Record<string, Permission[]> {
  const viewer = [...VIEWER_PERMISSIONS];
  const member = [...viewer, ...MEMBER_ADDITIONAL];
  const admin = [...member, ...ADMIN_ADDITIONAL];
  const owner = [...admin, ...OWNER_ADDITIONAL];

  return {
    VIEWER: viewer,
    MEMBER: member,
    ADMIN: admin,
    OWNER: owner,
  };
}

/**
 * 团队角色权限模板（使用继承链）
 */
export const TEAM_ROLE_PERMISSIONS: Record<string, Permission[]> = buildInheritedPermissions();

/**
 * 管理员角色权限模板
 */
export const ADMIN_ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  SUPER_ADMIN: Object.values(AdminPermission), // 所有管理权限

  ADMIN: [
    AdminPermission.ADMIN_USERS_VIEW,
    AdminPermission.ADMIN_USERS_EDIT,
    AdminPermission.ADMIN_USERS_SUSPEND,
    AdminPermission.ADMIN_TEAMS_VIEW,
    AdminPermission.ADMIN_TEAMS_EDIT,
    AdminPermission.ADMIN_MODERATION_VIEW,
    AdminPermission.ADMIN_MODERATION_ACTION,
    AdminPermission.ADMIN_RESOURCES_VIEW,
    AdminPermission.ADMIN_RESOURCES_EDIT,
    AdminPermission.ADMIN_DOMAINS_VIEW,
    AdminPermission.ADMIN_DOMAINS_APPROVE,
    AdminPermission.ADMIN_SYSTEM_METRICS,
    AdminPermission.ADMIN_SYSTEM_LOGS,
    AdminPermission.ADMIN_BILLING_VIEW,
    AdminPermission.ADMIN_ADMINS_VIEW,
    AdminPermission.ADMIN_SECURITY_VIEW,
  ],

  OPERATOR: [
    AdminPermission.ADMIN_MODERATION_VIEW,
    AdminPermission.ADMIN_MODERATION_ACTION,
    AdminPermission.ADMIN_RESOURCES_VIEW,
    AdminPermission.ADMIN_SYSTEM_METRICS,
  ],
};

/**
 * @deprecated 使用 TEAM_ROLE_PERMISSIONS 替代
 */
export const PRESET_ROLE_PERMISSIONS = TEAM_ROLE_PERMISSIONS;

// ============================================================================
// 权限继承工具函数
// ============================================================================

/**
 * 获取角色的所有权限（包含继承）
 */
export function getRolePermissions(role: string): Permission[] {
  return TEAM_ROLE_PERMISSIONS[role] || [];
}

/**
 * 检查角色是否拥有指定权限
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * 获取角色继承链
 */
export function getRoleInheritanceChain(role: string): string[] {
  const chain: string[] = [];
  const roles = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];
  const index = roles.indexOf(role);

  if (index >= 0) {
    for (let i = 0; i <= index; i++) {
      chain.push(roles[i]);
    }
  }

  return chain;
}

/**
 * 获取角色相对于基础角色新增的权限
 */
export function getAdditionalPermissions(role: string): Permission[] {
  switch (role) {
    case 'VIEWER':
      return VIEWER_PERMISSIONS;
    case 'MEMBER':
      return MEMBER_ADDITIONAL;
    case 'ADMIN':
      return ADMIN_ADDITIONAL;
    case 'OWNER':
      return OWNER_ADDITIONAL;
    default:
      return [];
  }
}

// ============================================================================
// 权限分组（用于 UI 显示）
// ============================================================================

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
 * 管理权限分组（用于 UI 显示）
 */
export const ADMIN_PERMISSION_GROUPS = {
  users: {
    name: '用户管理',
    icon: 'users',
    permissions: [
      { key: AdminPermission.ADMIN_USERS_VIEW, name: '查看用户', description: '查看平台用户列表' },
      { key: AdminPermission.ADMIN_USERS_EDIT, name: '编辑用户', description: '编辑用户信息' },
      { key: AdminPermission.ADMIN_USERS_SUSPEND, name: '停用用户', description: '停用或恢复用户账号' },
      { key: AdminPermission.ADMIN_USERS_DELETE, name: '删除用户', description: '永久删除用户账号' },
    ],
  },
  teams: {
    name: '团队管理',
    icon: 'building',
    permissions: [
      { key: AdminPermission.ADMIN_TEAMS_VIEW, name: '查看团队', description: '查看所有团队' },
      { key: AdminPermission.ADMIN_TEAMS_EDIT, name: '编辑团队', description: '编辑团队设置' },
      { key: AdminPermission.ADMIN_TEAMS_DELETE, name: '删除团队', description: '删除团队' },
    ],
  },
  moderation: {
    name: '内容审核',
    icon: 'shield',
    permissions: [
      { key: AdminPermission.ADMIN_MODERATION_VIEW, name: '查看审核', description: '查看待审核内容' },
      { key: AdminPermission.ADMIN_MODERATION_ACTION, name: '审核操作', description: '批准或拒绝内容' },
    ],
  },
  resources: {
    name: '资源管理',
    icon: 'database',
    permissions: [
      { key: AdminPermission.ADMIN_RESOURCES_VIEW, name: '查看资源', description: '查看所有用户资源' },
      { key: AdminPermission.ADMIN_RESOURCES_EDIT, name: '编辑资源', description: '编辑任意资源' },
      { key: AdminPermission.ADMIN_RESOURCES_DELETE, name: '删除资源', description: '删除任意资源' },
    ],
  },
  domains: {
    name: '域名管理',
    icon: 'globe',
    permissions: [
      { key: AdminPermission.ADMIN_DOMAINS_VIEW, name: '查看域名', description: '查看所有自定义域名' },
      { key: AdminPermission.ADMIN_DOMAINS_APPROVE, name: '审批域名', description: '审批域名申请' },
      { key: AdminPermission.ADMIN_DOMAINS_REVOKE, name: '撤销域名', description: '撤销域名授权' },
    ],
  },
  system: {
    name: '系统管理',
    icon: 'settings',
    permissions: [
      { key: AdminPermission.ADMIN_SYSTEM_CONFIG, name: '系统配置', description: '修改系统配置' },
      { key: AdminPermission.ADMIN_SYSTEM_METRICS, name: '系统指标', description: '查看系统监控指标' },
      { key: AdminPermission.ADMIN_SYSTEM_LOGS, name: '系统日志', description: '查看系统日志' },
    ],
  },
  billing: {
    name: '账单管理',
    icon: 'credit-card',
    permissions: [
      { key: AdminPermission.ADMIN_BILLING_VIEW, name: '查看账单', description: '查看所有账单' },
      { key: AdminPermission.ADMIN_BILLING_MANAGE, name: '管理账单', description: '管理订阅和退款' },
    ],
  },
  admins: {
    name: '管理员管理',
    icon: 'user-cog',
    permissions: [
      { key: AdminPermission.ADMIN_ADMINS_VIEW, name: '查看管理员', description: '查看管理员列表' },
      { key: AdminPermission.ADMIN_ADMINS_MANAGE, name: '管理管理员', description: '创建和编辑管理员' },
    ],
  },
  security: {
    name: '安全管理',
    icon: 'shield-check',
    permissions: [
      { key: AdminPermission.ADMIN_SECURITY_VIEW, name: '查看安全设置', description: '查看平台安全配置、会话、事件' },
      { key: AdminPermission.ADMIN_SECURITY_MANAGE, name: '管理安全设置', description: '修改安全策略、封禁 IP、终止会话' },
    ],
  },
};

// ============================================================================
// 权限检查函数
// ============================================================================

/**
 * 检查是否拥有指定权限
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required);
}

/**
 * 检查是否拥有任意一个权限
 */
export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  return required.some(p => userPermissions.includes(p));
}

/**
 * 检查是否拥有所有指定权限
 */
export function hasAllPermissions(userPermissions: string[], required: string[]): boolean {
  return required.every(p => userPermissions.includes(p));
}

/**
 * 合并权限类型
 */
export type AnyPermission = Permission | AdminPermission;
