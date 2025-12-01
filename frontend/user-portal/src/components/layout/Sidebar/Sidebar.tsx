import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { NavGroup } from './NavGroup';
import { navigationGroups } from '../navigation-config';

export function Sidebar() {
  const { isCollapsed, isMobile } = useSidebar();

  // 移动端不显示固定侧边栏
  if (isMobile) {
    return null;
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-background transition-all duration-300',
          isCollapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        <SidebarHeader />

        <nav className="flex-1 overflow-y-auto space-y-2 p-2">
          {navigationGroups.map((group) => (
            <NavGroup key={group.id} group={group} />
          ))}
        </nav>

        <SidebarFooter />
      </aside>
    </TooltipProvider>
  );
}
