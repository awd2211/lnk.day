import { Link2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SidebarHeader() {
  const { isCollapsed, toggleCollapsed, isMobile } = useSidebar();

  return (
    <div
      className={cn(
        'flex h-14 items-center border-b px-4',
        isCollapsed && !isMobile ? 'justify-center' : 'justify-between'
      )}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Link2 className="h-4 w-4" />
        </div>
        {(!isCollapsed || isMobile) && (
          <span className="text-lg font-semibold">lnk.day</span>
        )}
      </a>

      {/* 折叠按钮 - 只在桌面端显示 */}
      {!isMobile && (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className={cn(
                'h-8 w-8 shrink-0',
                isCollapsed && 'absolute right-2 top-3'
              )}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isCollapsed ? '展开侧边栏' : '收起侧边栏'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isCollapsed ? 'right' : 'bottom'}>
            {isCollapsed ? '展开侧边栏' : '收起侧边栏'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
