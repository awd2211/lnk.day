import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Link2,
  BarChart3,
  QrCode,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  FileText,
  FileBarChart,
  Palette,
  Globe,
  Shield,
  Webhook,
  Megaphone,
  Search,
  CreditCard,
  TestTube2,
  GitBranch,
  Smartphone,
  Folder,
  Bookmark,
  Target,
  Plug,
  Lock,
  ClipboardList,
  Database,
  Zap,
  LayoutTemplate,
} from 'lucide-react';
import { useState } from 'react';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/links', label: '链接管理', icon: Link2 },
  { path: '/folders', label: '文件夹', icon: Folder },
  { path: '/saved-searches', label: '保存的搜索', icon: Bookmark },
  { path: '/templates', label: '模板', icon: FileText },
  { path: '/bio-links', label: 'Bio Link', icon: Palette },
  { path: '/analytics', label: '数据分析', icon: BarChart3 },
  { path: '/reports', label: '报告', icon: FileBarChart },
  { path: '/campaigns', label: '活动', icon: Megaphone },
  { path: '/campaign-templates', label: '活动模板', icon: LayoutTemplate },
  { path: '/goals', label: '目标', icon: Target },
  { path: '/automation', label: '自动化', icon: Zap },
  { path: '/ab-tests', label: 'A/B测试', icon: TestTube2 },
  { path: '/redirect-rules', label: '重定向', icon: GitBranch },
  { path: '/deep-links', label: '深度链接', icon: Smartphone },
  { path: '/qr', label: '二维码', icon: QrCode },
  { path: '/domains', label: '域名', icon: Globe },
  { path: '/integrations', label: '集成', icon: Plug },
  { path: '/sso', label: 'SSO', icon: Shield },
  { path: '/webhooks', label: 'Webhooks', icon: Webhook },
  { path: '/team', label: '团队', icon: Users },
  { path: '/billing', label: '计费', icon: CreditCard },
  { path: '/privacy', label: '隐私', icon: Lock },
  { path: '/audit-logs', label: '审计日志', icon: ClipboardList },
  { path: '/data-streams', label: '数据流', icon: Database },
  { path: '/settings', label: '设置', icon: Settings },
];

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="text-xl font-bold text-primary">
            lnk.day
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="hidden items-center gap-4 md:flex">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-48 justify-start text-muted-foreground"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>搜索...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name || user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <hr className="my-2" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}

export { Layout };
export default Layout;
