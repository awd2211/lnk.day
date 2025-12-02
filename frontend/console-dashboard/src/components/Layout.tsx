import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { SHORT_LINK_DOMAIN } from '@/lib/config';
import {
  LayoutDashboard,
  Users,
  Building2,
  Link2,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Server,
  Shield,
  CreditCard,
  FileText,
  Bell,
  ShieldAlert,
  Globe,
  QrCode,
  Smartphone,
  Layout as LayoutIcon,
  Receipt,
  Key,
  Webhook,
  Download,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Code2,
  ShieldCheck,
  Cog,
  Plug,
  Mail,
  Gauge,
  Building,
  Database,
  AlertTriangle,
  Workflow,
  Palette,
  FileType,
  Tag,
  Layers,
  UserSquare,
  KeyRound,
  ScanLine,
  FlaskConical,
  Target,
  GitBranch,
  Activity,
  MessageSquare,
  Search,
  Lock,
  Crown,
  UserCog,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    name: '概览',
    icon: LayoutDashboard,
    items: [
      { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    name: '用户与团队',
    icon: Users,
    items: [
      { name: '用户管理', href: '/users', icon: Users },
      { name: '团队管理', href: '/teams', icon: Building2 },
      { name: '租户管理', href: '/tenants', icon: Building },
      { name: '角色权限', href: '/roles', icon: Shield },
    ],
  },
  {
    name: '内容管理',
    icon: FolderOpen,
    items: [
      { name: '链接管理', href: '/links', icon: Link2 },
      { name: '活动管理', href: '/campaigns', icon: Megaphone },
      { name: '二维码', href: '/qr-codes', icon: QrCode },
      { name: '深度链接', href: '/deep-links', icon: Smartphone },
      { name: '落地页', href: '/pages', icon: LayoutIcon },
      { name: '评论管理', href: '/comments', icon: MessageSquare },
      { name: 'SEO 管理', href: '/seo-manager', icon: Search },
      { name: '域名管理', href: '/domains', icon: Globe },
      { name: '重定向规则', href: '/redirect-rules', icon: GitBranch },
      { name: '标签管理', href: '/tags', icon: Tag },
      { name: '文件夹', href: '/folders', icon: Layers },
    ],
  },
  {
    name: '数据与分析',
    icon: BarChart3,
    items: [
      { name: '数据分析', href: '/analytics', icon: BarChart3 },
      { name: '实时数据', href: '/realtime', icon: Activity },
      { name: 'A/B 测试', href: '/ab-tests', icon: FlaskConical },
      { name: '目标转化', href: '/goals', icon: Target },
      { name: '数据导出', href: '/export', icon: Download },
    ],
  },
  {
    name: '订阅与计费',
    icon: CreditCard,
    items: [
      { name: '套餐管理', href: '/plans', icon: Crown },
      { name: '订阅管理', href: '/subscriptions', icon: CreditCard },
      { name: '计费发票', href: '/billing', icon: Receipt },
      { name: '配额管理', href: '/quotas', icon: Database },
    ],
  },
  {
    name: '开发者工具',
    icon: Code2,
    items: [
      { name: 'API 密钥', href: '/api-keys', icon: Key },
      { name: 'Webhooks', href: '/webhooks', icon: Webhook },
      { name: '第三方集成', href: '/integrations', icon: Plug },
    ],
  },
  {
    name: '安全与审计',
    icon: ShieldCheck,
    items: [
      { name: '安全中心', href: '/security', icon: Lock },
      { name: '内容审核', href: '/moderation', icon: ShieldAlert },
      { name: '审计日志', href: '/audit-logs', icon: FileText },
      { name: '告警管理', href: '/alerts', icon: Bell },
      { name: '告警规则', href: '/alert-rules', icon: AlertTriangle },
      { name: 'SSO 配置', href: '/sso-config', icon: KeyRound },
      { name: '安全扫描', href: '/security-scan', icon: ScanLine },
    ],
  },
  {
    name: '模板预设',
    icon: FileType,
    items: [
      { name: '链接模板', href: '/templates/links', icon: Link2 },
      { name: 'UTM 模板', href: '/templates/utm', icon: Tag },
      { name: '活动模板', href: '/templates/campaigns', icon: Megaphone },
      { name: 'Bio Link 模板', href: '/templates/bio-links', icon: UserSquare },
      { name: 'QR 码样式', href: '/templates/qr-styles', icon: Palette },
    ],
  },
  {
    name: '系统',
    icon: Cog,
    items: [
      { name: '系统监控', href: '/system', icon: Server },
      { name: '性能指标', href: '/metrics', icon: Gauge },
      { name: '自动化规则', href: '/automation', icon: Workflow },
      { name: '管理员', href: '/admins', icon: UserCog },
      { name: '管理员角色', href: '/admin-roles', icon: ShieldCheck },
      { name: '通知管理', href: '/notifications', icon: Mail },
      { name: '系统设置', href: '/settings', icon: Settings },
    ],
  },
];

// Flatten for page title lookup
const allNavItems = [
  ...navigationGroups.flatMap(g => g.items),
  { name: '个人中心', href: '/profile', icon: Shield },
];

function NavGroupComponent({ group, isExpanded, onToggle, location }: {
  group: NavGroup;
  isExpanded: boolean;
  onToggle: () => void;
  location: ReturnType<typeof useLocation>;
}) {
  const hasActiveItem = group.items.some(item => location.pathname === item.href);

  // For single-item groups like "概览", render directly without collapsible
  if (group.items.length === 1) {
    const item = group.items[0]!;
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-gray-600 hover:bg-gray-100'
        )}
      >
        <Icon className="h-5 w-5" />
        {item.name}
      </Link>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActiveItem ? 'text-primary' : 'text-gray-600 hover:bg-gray-100'
        )}
      >
        <GroupIcon className="h-5 w-5" />
        <span className="flex-1 text-left">{group.name}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isExpanded && (
        <div className="ml-4 space-y-1 border-l pl-3">
          {group.items.map((item) => {
            const isActive = location.pathname === item.href;
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <ItemIcon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, isAuthenticated, isLoading, logout } = useAuth();

  // Initialize expanded groups based on current path
  const getInitialExpandedGroups = () => {
    const expanded: Record<string, boolean> = {};
    navigationGroups.forEach(group => {
      expanded[group.name] = group.items.some(item => location.pathname === item.href);
    });
    return expanded;
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(getInitialExpandedGroups);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-white flex flex-col">
        <div className="flex h-16 items-center border-b px-6 shrink-0">
          <span className="text-xl font-bold text-primary">{SHORT_LINK_DOMAIN} Console</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationGroups.map((group) => (
            <NavGroupComponent
              key={group.name}
              group={group}
              isExpanded={expandedGroups[group.name] || false}
              onToggle={() => toggleGroup(group.name)}
              location={location}
            />
          ))}
        </nav>

        <div className="shrink-0 border-t p-4">
          <Link
            to="/profile"
            className="mb-3 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{admin?.name}</p>
              <p className="truncate text-xs text-gray-500">{admin?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 bg-gray-50">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-8">
          <h1 className="text-lg font-semibold">
            {allNavItems.find((n) => n.href === location.pathname)?.name || '控制台'}
          </h1>
          <div className="text-sm text-gray-500">
            管理员：{admin?.email}
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
