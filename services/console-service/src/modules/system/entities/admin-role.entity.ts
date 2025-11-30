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
  // 用户管理
  USERS_VIEW = 'admin:users:view',
  USERS_MANAGE = 'admin:users:manage',
  USERS_DELETE = 'admin:users:delete',

  // 团队管理
  TEAMS_VIEW = 'admin:teams:view',
  TEAMS_MANAGE = 'admin:teams:manage',
  TEAMS_DELETE = 'admin:teams:delete',

  // 链接管理
  LINKS_VIEW = 'admin:links:view',
  LINKS_MANAGE = 'admin:links:manage',
  LINKS_DELETE = 'admin:links:delete',

  // QR码管理
  QR_VIEW = 'admin:qr:view',
  QR_MANAGE = 'admin:qr:manage',

  // 页面管理
  PAGES_VIEW = 'admin:pages:view',
  PAGES_MANAGE = 'admin:pages:manage',

  // 活动管理
  CAMPAIGNS_VIEW = 'admin:campaigns:view',
  CAMPAIGNS_MANAGE = 'admin:campaigns:manage',

  // 域名管理
  DOMAINS_VIEW = 'admin:domains:view',
  DOMAINS_MANAGE = 'admin:domains:manage',

  // 订阅/计费管理
  BILLING_VIEW = 'admin:billing:view',
  BILLING_MANAGE = 'admin:billing:manage',

  // 系统配置
  SYSTEM_VIEW = 'admin:system:view',
  SYSTEM_CONFIG = 'admin:system:config',
  SYSTEM_LOGS = 'admin:system:logs',
  SYSTEM_SERVICES = 'admin:system:services',
  SYSTEM_CACHE = 'admin:system:cache',
  SYSTEM_BACKUP = 'admin:system:backup',
  SYSTEM_MAINTENANCE = 'admin:system:maintenance',

  // 管理员管理
  ADMINS_VIEW = 'admin:admins:view',
  ADMINS_MANAGE = 'admin:admins:manage',
  ADMINS_DELETE = 'admin:admins:delete',

  // 角色管理
  ROLES_VIEW = 'admin:roles:view',
  ROLES_MANAGE = 'admin:roles:manage',

  // 审计日志
  AUDIT_VIEW = 'admin:audit:view',
  AUDIT_EXPORT = 'admin:audit:export',

  // 告警管理
  ALERTS_VIEW = 'admin:alerts:view',
  ALERTS_MANAGE = 'admin:alerts:manage',

  // 数据分析
  ANALYTICS_VIEW = 'admin:analytics:view',
  ANALYTICS_EXPORT = 'admin:analytics:export',

  // 集成管理
  INTEGRATIONS_VIEW = 'admin:integrations:view',
  INTEGRATIONS_MANAGE = 'admin:integrations:manage',

  // Webhook管理
  WEBHOOKS_VIEW = 'admin:webhooks:view',
  WEBHOOKS_MANAGE = 'admin:webhooks:manage',
}

/**
 * 权限分组（用于前端展示）
 */
export const ADMIN_PERMISSION_GROUPS = {
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
  content: {
    name: '内容管理',
    permissions: [
      AdminPermission.LINKS_VIEW,
      AdminPermission.LINKS_MANAGE,
      AdminPermission.LINKS_DELETE,
      AdminPermission.QR_VIEW,
      AdminPermission.QR_MANAGE,
      AdminPermission.PAGES_VIEW,
      AdminPermission.PAGES_MANAGE,
      AdminPermission.CAMPAIGNS_VIEW,
      AdminPermission.CAMPAIGNS_MANAGE,
    ],
  },
  domains: {
    name: '域名管理',
    permissions: [
      AdminPermission.DOMAINS_VIEW,
      AdminPermission.DOMAINS_MANAGE,
    ],
  },
  billing: {
    name: '计费管理',
    permissions: [
      AdminPermission.BILLING_VIEW,
      AdminPermission.BILLING_MANAGE,
    ],
  },
  system: {
    name: '系统管理',
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
  admins: {
    name: '管理员管理',
    permissions: [
      AdminPermission.ADMINS_VIEW,
      AdminPermission.ADMINS_MANAGE,
      AdminPermission.ADMINS_DELETE,
      AdminPermission.ROLES_VIEW,
      AdminPermission.ROLES_MANAGE,
    ],
  },
  audit: {
    name: '审计与监控',
    permissions: [
      AdminPermission.AUDIT_VIEW,
      AdminPermission.AUDIT_EXPORT,
      AdminPermission.ALERTS_VIEW,
      AdminPermission.ALERTS_MANAGE,
    ],
  },
  analytics: {
    name: '数据分析',
    permissions: [
      AdminPermission.ANALYTICS_VIEW,
      AdminPermission.ANALYTICS_EXPORT,
    ],
  },
  integrations: {
    name: '集成与Webhook',
    permissions: [
      AdminPermission.INTEGRATIONS_VIEW,
      AdminPermission.INTEGRATIONS_MANAGE,
      AdminPermission.WEBHOOKS_VIEW,
      AdminPermission.WEBHOOKS_MANAGE,
    ],
  },
};

/**
 * 默认角色权限模板
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(AdminPermission), // 所有权限
  ADMIN: [
    // 用户和团队
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_MANAGE,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.TEAMS_MANAGE,
    // 内容
    AdminPermission.LINKS_VIEW,
    AdminPermission.LINKS_MANAGE,
    AdminPermission.QR_VIEW,
    AdminPermission.QR_MANAGE,
    AdminPermission.PAGES_VIEW,
    AdminPermission.PAGES_MANAGE,
    AdminPermission.CAMPAIGNS_VIEW,
    AdminPermission.CAMPAIGNS_MANAGE,
    // 域名
    AdminPermission.DOMAINS_VIEW,
    AdminPermission.DOMAINS_MANAGE,
    // 计费
    AdminPermission.BILLING_VIEW,
    AdminPermission.BILLING_MANAGE,
    // 系统（只读）
    AdminPermission.SYSTEM_VIEW,
    AdminPermission.SYSTEM_LOGS,
    // 管理员（只读）
    AdminPermission.ADMINS_VIEW,
    AdminPermission.ROLES_VIEW,
    // 审计
    AdminPermission.AUDIT_VIEW,
    // 分析
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.ANALYTICS_EXPORT,
    // 集成
    AdminPermission.INTEGRATIONS_VIEW,
    AdminPermission.WEBHOOKS_VIEW,
  ],
  OPERATOR: [
    // 只读权限
    AdminPermission.USERS_VIEW,
    AdminPermission.TEAMS_VIEW,
    AdminPermission.LINKS_VIEW,
    AdminPermission.QR_VIEW,
    AdminPermission.PAGES_VIEW,
    AdminPermission.CAMPAIGNS_VIEW,
    AdminPermission.DOMAINS_VIEW,
    AdminPermission.BILLING_VIEW,
    AdminPermission.SYSTEM_VIEW,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.INTEGRATIONS_VIEW,
    AdminPermission.WEBHOOKS_VIEW,
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
