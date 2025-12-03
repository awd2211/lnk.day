import {
  LayoutDashboard,
  Link2,
  FolderOpen,
  Globe,
  BarChart3,
  Activity,
  FileText,
  Target,
  QrCode,
  FileImage,
  Smartphone,
  Webhook,
  Plug,
  Key,
  FileCode,
  Users,
  CreditCard,
  Bell,
  User,
  Tags,
  Gauge,
  BookOpen,
  ShieldCheck,
  Search,
  GitBranch,
  Route,
  Flag,
  Zap,
  Bookmark,
  Database,
  ScrollText,
  KeyRound,
  Settings,
  Crown,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  /** 需要的最低套餐等级: 'pro' | 'enterprise' */
  requiredPlan?: 'pro' | 'enterprise';
  /** 需要的团队角色: 'owner' | 'admin' */
  requiredRole?: 'owner' | 'admin';
}

export interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    id: 'core',
    title: '核心功能',
    icon: LayoutDashboard,
    items: [
      { title: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
      { title: '链接管理', href: '/links', icon: Link2 },
      { title: '文件夹', href: '/folders', icon: FolderOpen },
      { title: '标签管理', href: '/tags', icon: Tags },
      { title: '保存的搜索', href: '/saved-searches', icon: Bookmark },
    ],
  },
  {
    id: 'analytics',
    title: '数据分析',
    icon: BarChart3,
    items: [
      { title: '数据概览', href: '/analytics', icon: BarChart3 },
      { title: '实时数据', href: '/analytics/realtime', icon: Activity },
      { title: '目标追踪', href: '/goals', icon: Flag },
      { title: '报告管理', href: '/reports', icon: FileText },
    ],
  },
  {
    id: 'marketing',
    title: '营销工具',
    icon: Target,
    items: [
      { title: '活动管理', href: '/campaigns', icon: Target },
      { title: 'A/B 测试', href: '/ab-tests', icon: GitBranch },
      { title: '重定向规则', href: '/redirect-rules', icon: Route },
      { title: 'QR 码', href: '/qr-codes', icon: QrCode },
      { title: '落地页', href: '/pages', icon: FileImage },
      { title: '深度链接', href: '/deeplinks', icon: Smartphone },
      { title: 'SEO 优化', href: '/seo', icon: Search },
    ],
  },
  {
    id: 'advanced',
    title: '高级功能',
    icon: Plug,
    items: [
      { title: '自动化', href: '/automation', icon: Zap, requiredPlan: 'pro' },
      { title: 'Webhook', href: '/webhooks', icon: Webhook, requiredPlan: 'pro' },
      { title: '集成', href: '/integrations', icon: Plug, requiredPlan: 'pro' },
      { title: '数据流', href: '/data-streams', icon: Database, requiredPlan: 'enterprise' },
      { title: '模板中心', href: '/templates', icon: FileCode },
    ],
  },
  {
    id: 'developer',
    title: '开发者',
    icon: Key,
    items: [
      { title: 'API 密钥', href: '/api-keys', icon: KeyRound },
      { title: 'API 文档', href: '/api-docs', icon: BookOpen },
    ],
  },
  {
    id: 'settings',
    title: '设置',
    icon: Settings,
    items: [
      { title: '个人资料', href: '/profile', icon: User },
      { title: '安全设置', href: '/security-settings', icon: ShieldCheck },
      { title: '通知中心', href: '/notifications', icon: Bell },
      { title: '域名管理', href: '/domains', icon: Globe, requiredPlan: 'pro' },
      { title: 'SSO 配置', href: '/sso', icon: KeyRound, requiredPlan: 'enterprise', requiredRole: 'owner' },
    ],
  },
  {
    id: 'team',
    title: '团队',
    icon: Users,
    items: [
      { title: '成员管理', href: '/team', icon: Users },
      { title: '配额用量', href: '/quota', icon: Gauge },
      { title: '审计日志', href: '/audit-logs', icon: ScrollText, requiredPlan: 'enterprise', requiredRole: 'admin' },
      { title: '套餐订阅', href: '/billing', icon: CreditCard, requiredRole: 'owner' },
    ],
  },
];

// 快捷搜索用的扁平化导航项
export const flatNavItems = navigationGroups.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    groupId: group.id,
    groupTitle: group.title,
  }))
);
