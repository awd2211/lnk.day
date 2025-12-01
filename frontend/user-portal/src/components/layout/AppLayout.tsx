import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar, SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar, MobileSidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from '@/components/CommandPalette';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { isCollapsed, isMobile } = useSidebar();
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateLink = () => {
    navigate('/links?action=create');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar />
      <MobileSidebar />

      {/* 主内容区 */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          isMobile ? 'ml-0' : isCollapsed ? 'ml-[60px]' : 'ml-[240px]'
        )}
      >
        {/* 顶栏 */}
        <TopBar
          onSearchOpen={() => setCommandOpen(true)}
          onCreateLink={handleCreateLink}
        />

        {/* 页面内容 */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* 命令面板 */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
