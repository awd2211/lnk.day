import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';

// 权限定义
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
}

// 预设角色模板
export const PRESET_ROLE_PERMISSIONS: Record<string, Permission[]> = {
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
  ],

  VIEWER: [
    Permission.LINKS_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.QR_VIEW,
    Permission.PAGES_VIEW,
    Permission.CAMPAIGNS_VIEW,
    Permission.DOMAINS_VIEW,
    Permission.TEAM_VIEW,
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
};

@Entity('custom_roles')
@Index(['teamId', 'name'], { unique: true })
export class CustomRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ length: 20, nullable: true })
  color?: string;

  @Column('simple-array')
  permissions: Permission[];

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  canBeDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
