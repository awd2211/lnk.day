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
      { title: '模板', href: '/templates', icon: FileCode },
    ],
  },
  {
    id: 'account',
    title: '账户',
    icon: Users,
    items: [
      { title: '团队', href: '/team', icon: Users },
      { title: '设置', href: '/settings', icon: Settings },
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
