import { Menu, Moon, Sun, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { navigationGroups } from '../navigation-config';

interface TopBarProps {
  onSearchOpen: () => void;
  onCreateLink?: () => void;
}

export function TopBar({ onSearchOpen, onCreateLink }: TopBarProps) {
  const { isCollapsed, isMobile, setMobileOpen } = useSidebar();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();

  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    for (const group of navigationGroups) {
      const item = group.items.find(
        (item) =>
          location.pathname === item.href ||
          location.pathname.startsWith(`${item.href}/`)
      );
      if (item) {
        return item.title;
      }
    }
    return '仪表盘';
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6'
      )}
    >
      {/* 移动端菜单按钮 */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">打开菜单</span>
        </Button>
      )}

      {/* 页面标题 - 移动端显示 */}
      {isMobile && (
        <h1 className="text-lg font-semibold truncate">{getCurrentPageTitle()}</h1>
      )}

      {/* 搜索 */}
      <div className="flex-1 flex items-center">
        {!isMobile && <GlobalSearch onOpen={onSearchOpen} />}
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-2">
        {/* 快速创建按钮 */}
        {onCreateLink && (
          <Button size="sm" onClick={onCreateLink} className="hidden sm:flex">
            <Plus className="mr-1 h-4 w-4" />
            新建链接
          </Button>
        )}

        {/* 移动端搜索按钮 */}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onSearchOpen}>
            <span className="sr-only">搜索</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Button>
        )}

        {/* 通知中心 */}
        <NotificationCenter />

        {/* 主题切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">切换主题</span>
        </Button>
      </div>
    </header>
  );
}
