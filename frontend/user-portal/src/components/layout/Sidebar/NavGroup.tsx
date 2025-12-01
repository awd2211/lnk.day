import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NavItem } from './NavItem';
import type { NavGroup as NavGroupType } from '../navigation-config';

interface NavGroupProps {
  group: NavGroupType;
  onItemClick?: () => void;
}

export function NavGroup({ group, onItemClick }: NavGroupProps) {
  const { isCollapsed, isMobile, isGroupExpanded, toggleGroup } = useSidebar();
  const isExpanded = isGroupExpanded(group.id);
  const Icon = group.icon;

  // 收起状态时，只显示图标按钮
  if (isCollapsed && !isMobile) {
    return (
      <div className="space-y-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => toggleGroup(group.id)}
              className={cn(
                'flex w-full items-center justify-center rounded-lg px-2 py-2',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-medium">{group.title}</span>
            <div className="text-xs text-muted-foreground">
              {group.items.map((item) => item.title).join(' · ')}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* 收起但展开组时，显示子项的图标 */}
        {isExpanded && (
          <div className="space-y-1 pl-0">
            {group.items.map((item) => (
              <NavItem key={item.href} item={item} onClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left font-medium">{group.title}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pl-4 pt-1">
        {group.items.map((item) => (
          <NavItem key={item.href} item={item} onClick={onItemClick} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
