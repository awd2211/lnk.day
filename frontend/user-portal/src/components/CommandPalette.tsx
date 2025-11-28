import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Link2,
  BarChart3,
  QrCode,
  FileText,
  Settings,
  Users,
  Globe,
  Shield,
  Webhook,
  Megaphone,
  Plus,
  Search,
  LogOut,
  User,
  HelpCircle,
  Keyboard,
  Moon,
  Sun,
  CreditCard,
  TestTube2,
  GitBranch,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLinks } from '@/hooks/useLinks';
import { useDebounce } from '@/hooks/useDebounce';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  // Search links when user types (only when search has 2+ chars)
  const shouldSearch = debouncedSearch.length >= 2;
  const { data: linksData } = useLinks(
    shouldSearch ? { search: debouncedSearch, limit: 5 } : undefined
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSearch('');
  }, [onOpenChange]);

  const runCommand = useCallback(
    (action: () => void) => {
      handleClose();
      action();
    },
    [handleClose]
  );

  // Navigation commands
  const navigationCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: '仪表盘',
        icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
        action: () => navigate('/dashboard'),
        keywords: ['home', '首页', '概览'],
        group: 'navigation',
      },
      {
        id: 'links',
        label: '链接管理',
        icon: <Link2 className="mr-2 h-4 w-4" />,
        action: () => navigate('/links'),
        keywords: ['短链', 'url', '短链接'],
        group: 'navigation',
      },
      {
        id: 'analytics',
        label: '数据分析',
        icon: <BarChart3 className="mr-2 h-4 w-4" />,
        action: () => navigate('/analytics'),
        keywords: ['统计', '报表', 'charts'],
        group: 'navigation',
      },
      {
        id: 'qr',
        label: '二维码',
        icon: <QrCode className="mr-2 h-4 w-4" />,
        action: () => navigate('/qr'),
        keywords: ['qrcode', '扫码'],
        group: 'navigation',
      },
      {
        id: 'bio-links',
        label: 'Bio Links',
        icon: <FileText className="mr-2 h-4 w-4" />,
        action: () => navigate('/bio-links'),
        keywords: ['个人主页', 'bio', 'linktree'],
        group: 'navigation',
      },
      {
        id: 'templates',
        label: '链接模板',
        icon: <FileText className="mr-2 h-4 w-4" />,
        action: () => navigate('/templates'),
        keywords: ['template', '模版'],
        group: 'navigation',
      },
      {
        id: 'campaigns',
        label: '营销活动',
        icon: <Megaphone className="mr-2 h-4 w-4" />,
        action: () => navigate('/campaigns'),
        keywords: ['campaign', '推广', 'utm'],
        group: 'navigation',
      },
      {
        id: 'ab-tests',
        label: 'A/B 测试',
        icon: <TestTube2 className="mr-2 h-4 w-4" />,
        action: () => navigate('/ab-tests'),
        keywords: ['test', '测试', 'experiment', 'split'],
        group: 'navigation',
      },
      {
        id: 'redirect-rules',
        label: '重定向规则',
        icon: <GitBranch className="mr-2 h-4 w-4" />,
        action: () => navigate('/redirect-rules'),
        keywords: ['redirect', '跳转', '智能', '条件'],
        group: 'navigation',
      },
      {
        id: 'deep-links',
        label: '深度链接',
        icon: <Smartphone className="mr-2 h-4 w-4" />,
        action: () => navigate('/deep-links'),
        keywords: ['deeplink', 'app', 'ios', 'android', '移动'],
        group: 'navigation',
      },
      {
        id: 'team',
        label: '团队管理',
        icon: <Users className="mr-2 h-4 w-4" />,
        action: () => navigate('/team'),
        keywords: ['成员', 'members'],
        group: 'navigation',
      },
      {
        id: 'domains',
        label: '自定义域名',
        icon: <Globe className="mr-2 h-4 w-4" />,
        action: () => navigate('/domains'),
        keywords: ['domain', '域名'],
        group: 'navigation',
      },
      {
        id: 'sso',
        label: 'SSO 配置',
        icon: <Shield className="mr-2 h-4 w-4" />,
        action: () => navigate('/sso'),
        keywords: ['saml', 'oidc', '单点登录'],
        group: 'navigation',
      },
      {
        id: 'webhooks',
        label: 'Webhooks',
        icon: <Webhook className="mr-2 h-4 w-4" />,
        action: () => navigate('/webhooks'),
        keywords: ['webhook', '回调', 'api'],
        group: 'navigation',
      },
      {
        id: 'billing',
        label: '订阅计费',
        icon: <CreditCard className="mr-2 h-4 w-4" />,
        action: () => navigate('/billing'),
        keywords: ['payment', '支付', '套餐', 'subscription'],
        group: 'navigation',
      },
      {
        id: 'settings',
        label: '设置',
        icon: <Settings className="mr-2 h-4 w-4" />,
        action: () => navigate('/settings'),
        keywords: ['config', '配置', '偏好'],
        group: 'navigation',
      },
    ],
    [navigate]
  );

  // Action commands
  const actionCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'new-link',
        label: '创建短链接',
        icon: <Plus className="mr-2 h-4 w-4" />,
        action: () => navigate('/links'),
        keywords: ['create', 'add', '新建'],
        group: 'actions',
      },
      {
        id: 'search-links',
        label: '搜索链接',
        icon: <Search className="mr-2 h-4 w-4" />,
        action: () => navigate('/links'),
        keywords: ['find', '查找'],
        group: 'actions',
      },
    ],
    [navigate]
  );

  // Account commands
  const accountCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'profile',
        label: '个人资料',
        icon: <User className="mr-2 h-4 w-4" />,
        action: () => navigate('/settings'),
        keywords: ['profile', 'account'],
        group: 'account',
      },
      {
        id: 'logout',
        label: '退出登录',
        icon: <LogOut className="mr-2 h-4 w-4" />,
        action: () => logout(),
        keywords: ['signout', 'exit'],
        group: 'account',
      },
    ],
    [navigate, logout]
  );

  // Help commands
  const helpCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'shortcuts',
        label: '键盘快捷键',
        icon: <Keyboard className="mr-2 h-4 w-4" />,
        action: () => {
          // Could open a shortcuts modal
          alert('快捷键:\n\nCtrl+K - 打开命令面板\nCtrl+N - 新建链接\nEsc - 关闭');
        },
        keywords: ['keyboard', 'hotkeys'],
        group: 'help',
      },
      {
        id: 'help',
        label: '帮助文档',
        icon: <HelpCircle className="mr-2 h-4 w-4" />,
        action: () => window.open('https://docs.lnk.day', '_blank'),
        keywords: ['docs', 'documentation'],
        group: 'help',
      },
    ],
    []
  );

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const links = shouldSearch ? (linksData?.items || []) : [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="搜索页面、链接或执行操作..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>

        {/* Quick Links from search */}
        {links.length > 0 && (
          <CommandGroup heading="链接">
            {links.map((link) => (
              <CommandItem
                key={link.id}
                value={`link-${link.id}`}
                onSelect={() => runCommand(() => navigate(`/links/${link.id}`))}
              >
                <Link2 className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{link.title || link.shortCode}</span>
                  <span className="text-xs text-muted-foreground">
                    /{link.shortCode}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Actions */}
        <CommandGroup heading="操作">
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.id}
              onSelect={() => runCommand(cmd.action)}
              keywords={cmd.keywords}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="导航">
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.id}
              onSelect={() => runCommand(cmd.action)}
              keywords={cmd.keywords}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Account */}
        <CommandGroup heading="账户">
          {accountCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.id}
              onSelect={() => runCommand(cmd.action)}
              keywords={cmd.keywords}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="帮助">
          {helpCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.id}
              onSelect={() => runCommand(cmd.action)}
              keywords={cmd.keywords}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook to use the command palette
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  return {
    open,
    setOpen,
    toggle: () => setOpen((prev) => !prev),
  };
}
