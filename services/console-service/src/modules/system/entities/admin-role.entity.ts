import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 管理员权限枚举
 */
export enum AdminPermission {
  // ============ 用户与团队 ============
  // 用户管理
  USERS_VIEW = 'admin:users:view',
  USERS_MANAGE = 'admin:users:manage',
  USERS_DELETE = 'admin:users:delete',

  // 团队管理
  TEAMS_VIEW = 'admin:teams:view',
  TEAMS_MANAGE = 'admin:teams:manage',
  TEAMS_DELETE = 'admin:teams:delete',

  // 租户管理
  TENANTS_VIEW = 'admin:tenants:view',
  TENANTS_MANAGE = 'admin:tenants:manage',
  TENANTS_DELETE = 'admin:tenants:delete',

  // 用户角色权限
  USER_ROLES_VIEW = 'admin:user-roles:view',
  USER_ROLES_MANAGE = 'admin:user-roles:manage',

  // ============ 内容管理 ============
  // 链接管理
  LINKS_VIEW = 'admin:links:view',
  LINKS_MANAGE = 'admin:links:manage',
  LINKS_DELETE = 'admin:links:delete',

  // 活动管理
  CAMPAIGNS_VIEW = 'admin:campaigns:view',
  CAMPAIGNS_MANAGE = 'admin:campaigns:manage',
  CAMPAIGNS_DELETE = 'admin:campaigns:delete',

  // QR码管理
  QR_VIEW = 'admin:qr:view',
  QR_MANAGE = 'admin:qr:manage',
  QR_DELETE = 'admin:qr:delete',

  // 深度链接
  DEEPLINKS_VIEW = 'admin:deeplinks:view',
  DEEPLINKS_MANAGE = 'admin:deeplinks:manage',
  DEEPLINKS_DELETE = 'admin:deeplinks:delete',

  // 页面/落地页管理
  PAGES_VIEW = 'admin:pages:view',
  PAGES_MANAGE = 'admin:pages:manage',
  PAGES_DELETE = 'admin:pages:delete',

  // 评论管理
  COMMENTS_VIEW = 'admin:comments:view',
  COMMENTS_MANAGE = 'admin:comments:manage',
  COMMENTS_DELETE = 'admin:comments:delete',

  // SEO 管理
  SEO_VIEW = 'admin:seo:view',
  SEO_MANAGE = 'admin:seo:manage',

  // 域名管理
  DOMAINS_VIEW = 'admin:domains:view',
  DOMAINS_MANAGE = 'admin:domains:manage',
  DOMAINS_DELETE = 'admin:domains:delete',

  // 重定向规则
  REDIRECTS_VIEW = 'admin:redirects:view',
  REDIRECTS_MANAGE = 'admin:redirects:manage',

  // 标签管理
  TAGS_VIEW = 'admin:tags:view',
  TAGS_MANAGE = 'admin:tags:manage',

  // 文件夹管理
  FOLDERS_VIEW = 'admin:folders:view',
  FOLDERS_MANAGE = 'admin:folders:manage',

  // ============ 数据与分析 ============
  // 数据分析
  ANALYTICS_VIEW = 'admin:analytics:view',
  ANALYTICS_EXPORT = 'admin:analytics:export',

  // 实时数据
  REALTIME_VIEW = 'admin:realtime:view',

  // A/B 测试
  ABTESTS_VIEW = 'admin:abtests:view',
  ABTESTS_MANAGE = 'admin:abtests:manage',

  // 目标转化
  GOALS_VIEW = 'admin:goals:view',
  GOALS_MANAGE = 'admin:goals:manage',

  // ============ 订阅与计费 ============
  // 套餐管理
  PLANS_VIEW = 'admin:plans:view',
  PLANS_MANAGE = 'admin:plans:manage',

  // 订阅管理
  SUBSCRIPTIONS_VIEW = 'admin:subscriptions:view',
  SUBSCRIPTIONS_MANAGE = 'admin:subscriptions:manage',

  // 计费/发票
  BILLING_VIEW = 'admin:billing:view',
  BILLING_MANAGE = 'admin:billing:manage',

  // 配额管理
  QUOTAS_VIEW = 'admin:quotas:view',
  QUOTAS_MANAGE = 'admin:quotas:manage',

  // ============ 开发者工具 ============
  // API 密钥
  APIKEYS_VIEW = 'admin:apikeys:view',
  APIKEYS_MANAGE = 'admin:apikeys:manage',
  APIKEYS_REVOKE = 'admin:apikeys:revoke',

  // Webhook管理
  WEBHOOKS_VIEW = 'admin:webhooks:view',
  WEBHOOKS_MANAGE = 'admin:webhooks:manage',

  // 集成管理
  INTEGRATIONS_VIEW = 'admin:integrations:view',
  INTEGRATIONS_MANAGE = 'admin:integrations:manage',

  // ============ 安全与审计 ============
  // 安全中心
  SECURITY_VIEW = 'admin:security:view',
  SECURITY_MANAGE = 'admin:security:manage',

  // 内容审核
  MODERATION_VIEW = 'admin:moderation:view',
  MODERATION_MANAGE = 'admin:moderation:manage',

  // 审计日志
  AUDIT_VIEW = 'admin:audit:view',
  AUDIT_EXPORT = 'admin:audit:export',

  // 告警管理
  ALERTS_VIEW = 'admin:alerts:view',
  ALERTS_MANAGE = 'admin:alerts:manage',

  // SSO 配置
  SSO_VIEW = 'admin:sso:view',
  SSO_MANAGE = 'admin:sso:manage',

  // 安全扫描
  SECURITY_SCAN_VIEW = 'admin:security-scan:view',
  SECURITY_SCAN_MANAGE = 'admin:security-scan:manage',

  // ============ 模板预设 ============
  // 模板管理（统一权限）
  TEMPLATES_VIEW = 'admin:templates:view',
  TEMPLATES_MANAGE = 'admin:templates:manage',

  // ============ 系统管理 ============
  // 系统配置
  SYSTEM_VIEW = 'admin:system:view',
  SYSTEM_CONFIG = 'admin:system:config',
  SYSTEM_LOGS = 'admin:system:logs',
  SYSTEM_SERVICES = 'admin:system:services',
  SYSTEM_CACHE = 'admin:system:cache',
  SYSTEM_BACKUP = 'admin:system:backup',
  SYSTEM_MAINTENANCE = 'admin:system:maintenance',

  // 自动化规则
  AUTOMATION_VIEW = 'admin:automation:view',
  AUTOMATION_MANAGE = 'admin:automation:manage',

  // 管理员管理
  ADMINS_VIEW = 'admin:admins:view',
  ADMINS_MANAGE = 'admin:admins:manage',
  ADMINS_DELETE = 'admin:admins:delete',

  // 管理员角色管理
  ROLES_VIEW = 'admin:roles:view',
  ROLES_MANAGE = 'admin:roles:manage',

  // 通知管理
  NOTIFICATIONS_VIEW = 'admin:notifications:view',
  NOTIFICATIONS_MANAGE = 'admin:notifications:manage',
}

/**
 * 权限分组（用于前端展示）
 */
export const ADMIN_PERMISSION_GROUPS = {
  // ============ 用户与团队 ============
  users: {
    name: '用户管理',
    permissions: [
      AdminPermission.USERS_VIEW,
      AdminPermission.USERS_MANAGE,
      AdminPermission.USERS_DELETE,
    ],
  },
  teams: {
    name: '团队管理',
    permissions: [
      AdminPermission.TEAMS_VIEW,
      AdminPermission.TEAMS_MANAGE,
      AdminPermission.TEAMS_DELETE,
    ],
  },
  tenants: {
    name: '租户管理',
    permissions: [
      AdminPermission.TENANTS_VIEW,
      AdminPermission.TENANTS_MANAGE,
      AdminPermission.TENANTS_DELETE,
    ],
  },
  userRoles: {
    name: '用户角色权限',
    permissions: [
      AdminPermission.USER_ROLES_VIEW,
      AdminPermission.USER_ROLES_MANAGE,
    ],
  },

  // ============ 内容管理 ============
  links: {
    name: '链接管理',
    permissions: [
      AdminPermission.LINKS_VIEW,
      AdminPermission.LINKS_MANAGE,
      AdminPermission.LINKS_DELETE,
    ],
  },
  campaigns: {
    name: '活动管理',
    permissions: [
      AdminPermission.CAMPAIGNS_VIEW,
      AdminPermission.CAMPAIGNS_MANAGE,
      AdminPermission.CAMPAIGNS_DELETE,
    ],
  },
  qr: {
    name: '二维码管理',
    permissions: [
      AdminPermission.QR_VIEW,
      AdminPermission.QR_MANAGE,
      AdminPermission.QR_DELETE,
    ],
  },
  deeplinks: {
    name: '深度链接',
    permissions: [
      AdminPermission.DEEPLINKS_VIEW,
      AdminPermission.DEEPLINKS_MANAGE,
      AdminPermission.DEEPLINKS_DELETE,
    ],
  },
  pages: {
    name: '落地页管理',
    permissions: [
      AdminPermission.PAGES_VIEW,
      AdminPermission.PAGES_MANAGE,
      AdminPermission.PAGES_DELETE,
    ],
  },
  comments: {
    name: '评论管理',
    permissions: [
      AdminPermission.COMMENTS_VIEW,
      AdminPermission.COMMENTS_MANAGE,
      AdminPermission.COMMENTS_DELETE,
    ],
  },
  seo: {
    name: 'SEO 管理',
    permissions: [
      AdminPermission.SEO_VIEW,
      AdminPermission.SEO_MANAGE,
    ],
  },
  domains: {
    name: '域名管理',
    permissions: [
      AdminPermission.DOMAINS_VIEW,
      AdminPermission.DOMAINS_MANAGE,
      AdminPermission.DOMAINS_DELETE,
    ],
  },
  redirects: {
    name: '重定向规则',
    permissions: [
      AdminPermission.REDIRECTS_VIEW,
      AdminPermission.REDIRECTS_MANAGE,
    ],
  },
  tags: {
    name: '标签管理',
    permissions: [
      AdminPermission.TAGS_VIEW,
      AdminPermission.TAGS_MANAGE,
    ],
  },
  folders: {
    name: '文件夹管理',
    permissions: [
      AdminPermission.FOLDERS_VIEW,
      AdminPermission.FOLDERS_MANAGE,
    ],
  },

  // ============ 数据与分析 ============
  analytics: {
    name: '数据分析',
    permissions: [
      AdminPermission.ANALYTICS_VIEW,
      AdminPermission.ANALYTICS_EXPORT,
      AdminPermission.REALTIME_VIEW,
    ],
  },
  abtests: {
    name: 'A/B 测试',
    permissions: [
      AdminPermission.ABTESTS_VIEW,
      AdminPermission.ABTESTS_MANAGE,
    ],
  },
  goals: {
    name: '目标转化',
    permissions: [
      AdminPermission.GOALS_VIEW,
      AdminPermission.GOALS_MANAGE,
    ],
  },

  // ============ 订阅与计费 ============
  plans: {
    name: '套餐管理',
    permissions: [
      AdminPermission.PLANS_VIEW,
      AdminPermission.PLANS_MANAGE,
    ],
  },
  subscriptions: {
    name: '订阅管理',
    permissions: [
      AdminPermission.SUBSCRIPTIONS_VIEW,
      AdminPermission.SUBSCRIPTIONS_MANAGE,
    ],
  },
  billing: {
    name: '计费与发票',
    permissions: [
      AdminPermission.BILLING_VIEW,
      AdminPermission.BILLING_MANAGE,
    ],
  },
  quotas: {
    name: '配额管理',
    permissions: [
      AdminPermission.QUOTAS_VIEW,
      AdminPermission.QUOTAS_MANAGE,
    ],
  },

  // ============ 开发者工具 ============
  apikeys: {
    name: 'API 密钥',
    permissions: [
      AdminPermission.APIKEYS_VIEW,
      AdminPermission.APIKEYS_MANAGE,
      AdminPermission.APIKEYS_REVOKE,
    ],
  },
  webhooks: {
    name: 'Webhook 管理',
    permissions: [
      AdminPermission.WEBHOOKS_VIEW,
      AdminPermission.WEBHOOKS_MANAGE,
    ],
  },
  integrations: {
    name: '第三方集成',
    permissions: [
      AdminPermission.INTEGRATIONS_VIEW,
      AdminPermission.INTEGRATIONS_MANAGE,
    ],
  },

  // ============ 安全与审计 ============
  security: {
    name: '安全中心',
    permissions: [
      AdminPermission.SECURITY_VIEW,
      AdminPermission.SECURITY_MANAGE,
    ],
  },
  moderation: {
    name: '内容审核',
    permissions: [
      AdminPermission.MODERATION_VIEW,
      AdminPermission.MODERATION_MANAGE,
    ],
  },
  audit: {
    name: '审计日志',
    permissions: [
      AdminPermission.AUDIT_VIEW,
      AdminPermission.AUDIT_EXPORT,
    ],
  },
  alerts: {
    name: '告警管理',
    permissions: [
      AdminPermission.ALERTS_VIEW,
      AdminPermission.ALERTS_MANAGE,
    ],
  },
  sso: {
    name: 'SSO 配置',
    permissions: [
      AdminPermission.SSO_VIEW,
      AdminPermission.SSO_MANAGE,
    ],
  },
  securityScan: {
    name: '安全扫描',
    permissions: [
      AdminPermission.SECURITY_SCAN_VIEW,
      AdminPermission.SECURITY_SCAN_MANAGE,
    ],
  },

  // ============ 模板预设 ============
  templates: {
    name: '模板管理',
    permissions: [
      AdminPermission.TEMPLATES_VIEW,
      AdminPermission.TEMPLATES_MANAGE,
    ],
  },

  // ============ 系统管理 ============
  system: {
    name: '系统配置',
    permissions: [
      AdminPermission.SYSTEM_VIEW,
      AdminPermission.SYSTEM_CONFIG,
      AdminPermission.SYSTEM_LOGS,
      AdminPermission.SYSTEM_SERVICES,
      AdminPermission.SYSTEM_CACHE,
      AdminPermission.SYSTEM_BACKUP,
      AdminPermission.SYSTEM_MAINTENANCE,
    ],
  },
  automation: {
    name: '自动化规则',
    permissions: [
      AdminPermission.AUTOMATION_VIEW,
      AdminPermission.AUTOMATION_MANAGE,
    ],
  },
  admins: {
    name: '管理员管理',
    permissions: [
      AdminPermission.ADMINS_VIEW,
      AdminPermission.ADMINS_MANAGE,
      AdminPermission.ADMINS_DELETE,
    ],
  },
  roles: {
    name: '管理员角色',
    permissions: [
      AdminPermission.ROLES_VIEW,
      AdminPermission.ROLES_MANAGE,
    ],
  },
  notifications: {
    name: '通知管理',
    permissions: [
      AdminPermission.NOTIFICATIONS_VIEW,
      AdminPermission.NOTIFICATIONS_MANAGE,
    ],
  },
};

/**
 * 默认角色权限模板
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  // 超级管理员 - 拥有所有权限
  SUPER_ADMIN: Object.values(AdminPermission),

  // 系统管理员 - 负责技术运维，系统配置、服务管理、备份等
  SYSTEM_ADMIN: [
    // 系统管理（全部）
    AdminPermission.SYSTEM_VIEW,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.SYSTEM_LOGS,
    AdminPermission.SYSTEM_SERVICES,
    AdminPermission.SYSTEM_CACHE,
    AdminPermission.SYSTEM_BACKUP,
    AdminPermission.SYSTEM_MAINTENANCE,
    // 自动化规则
    AdminPermission.AUTOMATION_VIEW,
    AdminPermission.AUTOMATION_MANAGE,
    // 管理员管理
    AdminPermission.ADMINS_VIEW,
    AdminPermission.ADMINS_MANAGE,
    AdminPermission.ADMINS_DELETE,
    AdminPermission.ROLES_VIEW,
    AdminPermission.ROLES_MANAGE,
    // 审计日志
    AdminPermission.AUDIT_VIEW,
    AdminPermission.AUDIT_EXPORT,
    // 告警管理
    AdminPermission.ALERTS_VIEW,
    AdminPermission.ALERTS_MANAGE,
    // 安全中心
    AdminPermission.SECURITY_VIEW,
    AdminPermission.SECURITY_MANAGE,
    AdminPermission.SSO_VIEW,
    AdminPermission.SSO_MANAGE,
    AdminPermission.SECURITY_SCAN_VIEW,
    AdminPermission.SECURITY_SCAN_MANAGE,
    // 集成配置
    AdminPermission.INTEGRATIONS_VIEW,
    AdminPermission.INTEGRATIONS_MANAGE,
    AdminPermission.WEBHOOKS_VIEW,
    AdminPermission.WEBHOOKS_MANAGE,
    AdminPermission.APIKEYS_VIEW,
    AdminPermission.APIKEYS_MANAGE,
    AdminPermission.APIKEYS_REVOKE,
    // 通知管理
    AdminPermission.NOTIFICATIONS_VIEW,
    AdminPermission.NOTIFICATIONS_MANAGE,
    // 只读权限
    AdminPermission.USERS_VIEW,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.TENANTS_VIEW,
    AdminPermission.DOMAINS_VIEW,
    AdminPermission.ANALYTICS_VIEW,
  ],

  // 运营主管 - 运营团队负责人，内容管理、用户管理、数据分析、审核决策
  OPERATION_MANAGER: [
    // 用户和团队管理
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_MANAGE,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.TEAMS_MANAGE,
    AdminPermission.TENANTS_VIEW,
    AdminPermission.USER_ROLES_VIEW,
    AdminPermission.USER_ROLES_MANAGE,
    // 内容管理（全部）
    AdminPermission.LINKS_VIEW,
    AdminPermission.LINKS_MANAGE,
    AdminPermission.LINKS_DELETE,
    AdminPermission.QR_VIEW,
    AdminPermission.QR_MANAGE,
    AdminPermission.QR_DELETE,
    AdminPermission.PAGES_VIEW,
    AdminPermission.PAGES_MANAGE,
    AdminPermission.PAGES_DELETE,
    AdminPermission.CAMPAIGNS_VIEW,
    AdminPermission.CAMPAIGNS_MANAGE,
    AdminPermission.CAMPAIGNS_DELETE,
    AdminPermission.DEEPLINKS_VIEW,
    AdminPermission.DEEPLINKS_MANAGE,
    AdminPermission.DEEPLINKS_DELETE,
    // 评论与审核
    AdminPermission.COMMENTS_VIEW,
    AdminPermission.COMMENTS_MANAGE,
    AdminPermission.COMMENTS_DELETE,
    AdminPermission.MODERATION_VIEW,
    AdminPermission.MODERATION_MANAGE,
    // SEO 管理
    AdminPermission.SEO_VIEW,
    AdminPermission.SEO_MANAGE,
    // 域名管理
    AdminPermission.DOMAINS_VIEW,
    AdminPermission.DOMAINS_MANAGE,
    AdminPermission.REDIRECTS_VIEW,
    AdminPermission.REDIRECTS_MANAGE,
    // 标签与文件夹
    AdminPermission.TAGS_VIEW,
    AdminPermission.TAGS_MANAGE,
    AdminPermission.FOLDERS_VIEW,
    AdminPermission.FOLDERS_MANAGE,
    // 数据分析
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.ANALYTICS_EXPORT,
    AdminPermission.REALTIME_VIEW,
    AdminPermission.ABTESTS_VIEW,
    AdminPermission.ABTESTS_MANAGE,
    AdminPermission.GOALS_VIEW,
    AdminPermission.GOALS_MANAGE,
    // 模板管理
    AdminPermission.TEMPLATES_VIEW,
    AdminPermission.TEMPLATES_MANAGE,
    // 告警
    AdminPermission.ALERTS_VIEW,
    AdminPermission.ALERTS_MANAGE,
    // 审计（只读）
    AdminPermission.AUDIT_VIEW,
    // 计费（只读）
    AdminPermission.BILLING_VIEW,
    AdminPermission.PLANS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.QUOTAS_VIEW,
    // 系统（只读）
    AdminPermission.SYSTEM_VIEW,
    // 集成（只读）
    AdminPermission.INTEGRATIONS_VIEW,
    AdminPermission.WEBHOOKS_VIEW,
    AdminPermission.APIKEYS_VIEW,
  ],

  // 内容运营 - 日常内容管理，链接、活动、页面、二维码、评论审核
  CONTENT_OPERATOR: [
    // 用户和团队（只读）
    AdminPermission.USERS_VIEW,
    AdminPermission.TEAMS_VIEW,
    // 内容管理
    AdminPermission.LINKS_VIEW,
    AdminPermission.LINKS_MANAGE,
    AdminPermission.QR_VIEW,
    AdminPermission.QR_MANAGE,
    AdminPermission.PAGES_VIEW,
    AdminPermission.PAGES_MANAGE,
    AdminPermission.CAMPAIGNS_VIEW,
    AdminPermission.CAMPAIGNS_MANAGE,
    AdminPermission.DEEPLINKS_VIEW,
    AdminPermission.DEEPLINKS_MANAGE,
    // 评论管理
    AdminPermission.COMMENTS_VIEW,
    AdminPermission.COMMENTS_MANAGE,
    AdminPermission.MODERATION_VIEW,
    AdminPermission.MODERATION_MANAGE,
    // SEO 管理
    AdminPermission.SEO_VIEW,
    AdminPermission.SEO_MANAGE,
    // 标签与文件夹
    AdminPermission.TAGS_VIEW,
    AdminPermission.TAGS_MANAGE,
    AdminPermission.FOLDERS_VIEW,
    AdminPermission.FOLDERS_MANAGE,
    // 域名（只读）
    AdminPermission.DOMAINS_VIEW,
    AdminPermission.REDIRECTS_VIEW,
    // 模板（只读）
    AdminPermission.TEMPLATES_VIEW,
    // 数据分析（只读）
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.REALTIME_VIEW,
    AdminPermission.ABTESTS_VIEW,
    AdminPermission.GOALS_VIEW,
    // 告警（只读）
    AdminPermission.ALERTS_VIEW,
  ],

  // 客服专员 - 用户支持，查看用户/团队，处理用户问题
  CUSTOMER_SUPPORT: [
    // 用户和团队（查看+有限管理）
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_MANAGE,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.TENANTS_VIEW,
    // 内容（只读）
    AdminPermission.LINKS_VIEW,
    AdminPermission.QR_VIEW,
    AdminPermission.PAGES_VIEW,
    AdminPermission.CAMPAIGNS_VIEW,
    AdminPermission.DEEPLINKS_VIEW,
    AdminPermission.COMMENTS_VIEW,
    // 域名（只读）
    AdminPermission.DOMAINS_VIEW,
    // 计费（只读，方便处理账单问题）
    AdminPermission.BILLING_VIEW,
    AdminPermission.PLANS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.QUOTAS_VIEW,
    // 审计（只读，排查问题）
    AdminPermission.AUDIT_VIEW,
    // 通知（只读）
    AdminPermission.NOTIFICATIONS_VIEW,
  ],

  // 财务人员 - 订阅、计费、发票、套餐管理
  FINANCE: [
    // 计费管理（全部）
    AdminPermission.BILLING_VIEW,
    AdminPermission.BILLING_MANAGE,
    AdminPermission.PLANS_VIEW,
    AdminPermission.PLANS_MANAGE,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.SUBSCRIPTIONS_MANAGE,
    AdminPermission.QUOTAS_VIEW,
    AdminPermission.QUOTAS_MANAGE,
    // 用户和团队（只读，查看订阅信息）
    AdminPermission.USERS_VIEW,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.TENANTS_VIEW,
    // 审计（只读）
    AdminPermission.AUDIT_VIEW,
    // 数据导出
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.ANALYTICS_EXPORT,
  ],

  // 数据分析师 - 数据分析、报表导出
  DATA_ANALYST: [
    // 数据分析（全部）
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.ANALYTICS_EXPORT,
    AdminPermission.REALTIME_VIEW,
    AdminPermission.ABTESTS_VIEW,
    AdminPermission.ABTESTS_MANAGE,
    AdminPermission.GOALS_VIEW,
    AdminPermission.GOALS_MANAGE,
    // 用户和团队（只读）
    AdminPermission.USERS_VIEW,
    AdminPermission.TEAMS_VIEW,
    // 内容（只读）
    AdminPermission.LINKS_VIEW,
    AdminPermission.QR_VIEW,
    AdminPermission.PAGES_VIEW,
    AdminPermission.CAMPAIGNS_VIEW,
    AdminPermission.DEEPLINKS_VIEW,
    // 域名（只读）
    AdminPermission.DOMAINS_VIEW,
    // 计费（只读）
    AdminPermission.BILLING_VIEW,
    AdminPermission.PLANS_VIEW,
    AdminPermission.SUBSCRIPTIONS_VIEW,
    AdminPermission.QUOTAS_VIEW,
  ],

  // 审计员 - 合规审计，审计日志、告警查看
  AUDITOR: [
    // 审计日志（全部）
    AdminPermission.AUDIT_VIEW,
    AdminPermission.AUDIT_EXPORT,
    // 告警（只读）
    AdminPermission.ALERTS_VIEW,
    // 安全（只读）
    AdminPermission.SECURITY_VIEW,
    AdminPermission.SECURITY_SCAN_VIEW,
    AdminPermission.MODERATION_VIEW,
    // 用户和团队（只读）
    AdminPermission.USERS_VIEW,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.TENANTS_VIEW,
    // 系统（只读）
    AdminPermission.SYSTEM_VIEW,
    AdminPermission.SYSTEM_LOGS,
  ],

};

/**
 * 管理员角色实体
 */
@Entity('admin_roles')
@Index(['isSystem'])
export class AdminRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'simple-array' })
  permissions: string[];

  @Column({ default: false })
  isSystem: boolean; // 系统内置角色不可删除

  @Column({ default: 0 })
  priority: number; // 优先级，数字越大权限越高

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
