import { Link2 } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SidebarFooter } from './SidebarFooter';
import { NavGroup } from './NavGroup';
import { navigationGroups } from '../navigation-config';

export function MobileSidebar() {
  const { isMobile, isMobileOpen, setMobileOpen } = useSidebar();

  if (!isMobile) {
    return null;
  }

  const handleItemClick = () => {
    setMobileOpen(false);
  };

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="h-14 flex flex-row items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Link2 className="h-4 w-4" />
          </div>
          <SheetTitle className="text-lg font-semibold">lnk.day</SheetTitle>
        </SheetHeader>

        <TooltipProvider>
          <nav className="flex-1 overflow-y-auto space-y-2 p-2">
            {navigationGroups.map((group) => (
              <NavGroup
                key={group.id}
                group={group}
                onItemClick={handleItemClick}
              />
            ))}
          </nav>

          <SidebarFooter />
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}
