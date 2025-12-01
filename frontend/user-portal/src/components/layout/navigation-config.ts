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
  Settings,
  CreditCard,
  Bell,
  User,
  Tags,
  Gauge,
  Shield,
  LinkIcon,
  BookOpen,
  ShieldCheck,
  Building2,
  MessageSquare,
  Search,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
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
      { title: '域名管理', href: '/domains', icon: Globe },
    ],
  },
  {
    id: 'analytics',
    title: '数据分析',
    icon: BarChart3,
    items: [
      { title: '数据概览', href: '/analytics', icon: BarChart3 },
      { title: '实时数据', href: '/analytics/realtime', icon: Activity },
      { title: '报告导出', href: '/analytics/reports', icon: FileText },
    ],
  },
  {
    id: 'marketing',
    title: '营销工具',
    icon: Target,
    items: [
      { title: '活动管理', href: '/campaigns', icon: Target },
      { title: 'QR 码', href: '/qr-codes', icon: QrCode },
      { title: '落地页', href: '/pages', icon: FileImage },
      { title: '深度链接', href: '/deeplinks', icon: Smartphone },
      { title: '留言管理', href: '/comments', icon: MessageSquare },
      { title: 'SEO 优化', href: '/seo', icon: Search },
    ],
  },
  {
    id: 'advanced',
    title: '高级功能',
    icon: Plug,
    items: [
      { title: 'Webhook', href: '/webhooks', icon: Webhook },
      { title: '集成', href: '/integrations', icon: Plug },
      { title: 'API 密钥', href: '/api-keys', icon: Key },
      { title: 'API 文档', href: '/api-docs', icon: BookOpen },
      { title: '模板', href: '/templates', icon: FileCode },
      { title: 'UTM 模板', href: '/utm-templates', icon: LinkIcon },
      { title: '安全检查', href: '/security-scan', icon: Shield },
    ],
  },
  {
    id: 'organize',
    title: '组织管理',
    icon: Tags,
    items: [
      { title: '标签管理', href: '/tags', icon: Tags },
      { title: '租户设置', href: '/tenant-settings', icon: Building2 },
    ],
  },
  {
    id: 'account',
    title: '账户',
    icon: Users,
    items: [
      { title: '个人资料', href: '/profile', icon: User },
      { title: '通知中心', href: '/notifications', icon: Bell },
      { title: '配额管理', href: '/quota', icon: Gauge },
      { title: '安全设置', href: '/security-settings', icon: ShieldCheck },
      { title: '团队', href: '/team', icon: Users },
      { title: '套餐', href: '/billing', icon: CreditCard },
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
