import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { NavItem as NavItemType } from '../navigation-config';

interface NavItemProps {
  item: NavItemType;
  onClick?: () => void;
}

export function NavItem({ item, onClick }: NavItemProps) {
  const location = useLocation();
  const { isCollapsed, isMobile } = useSidebar();
  const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  const linkContent = (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        'hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground',
        isCollapsed && !isMobile && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {(!isCollapsed || isMobile) && (
        <>
          <span className="truncate">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  // 收起状态时显示 Tooltip
  if (isCollapsed && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.title}
          {item.badge && (
            <Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
