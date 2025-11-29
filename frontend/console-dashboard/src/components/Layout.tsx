import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
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
      { name: '域名管理', href: '/domains', icon: Globe },
    ],
  },
  {
    name: '数据与分析',
    icon: BarChart3,
    items: [
      { name: '数据分析', href: '/analytics', icon: BarChart3 },
      { name: '数据导出', href: '/export', icon: Download },
    ],
  },
  {
    name: '订阅与计费',
    icon: CreditCard,
    items: [
      { name: '订阅管理', href: '/subscriptions', icon: CreditCard },
      { name: '计费发票', href: '/billing', icon: Receipt },
    ],
  },
  {
    name: '开发者工具',
    icon: Code2,
    items: [
      { name: 'API 密钥', href: '/api-keys', icon: Key },
      { name: 'Webhooks', href: '/webhooks', icon: Webhook },
    ],
  },
  {
    name: '安全与审计',
    icon: ShieldCheck,
    items: [
      { name: '内容审核', href: '/moderation', icon: ShieldAlert },
      { name: '审计日志', href: '/audit-logs', icon: FileText },
      { name: '告警管理', href: '/alerts', icon: Bell },
    ],
  },
  {
    name: '系统',
    icon: Cog,
    items: [
      { name: '系统监控', href: '/system', icon: Server },
      { name: '系统设置', href: '/settings', icon: Settings },
    ],
  },
];

// Flatten for page title lookup
const allNavItems = navigationGroups.flatMap(g => g.items);

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
          <span className="text-xl font-bold text-primary">lnk.day Console</span>
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
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{admin?.name}</p>
              <p className="truncate text-xs text-gray-500">{admin?.role}</p>
            </div>
          </div>
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
