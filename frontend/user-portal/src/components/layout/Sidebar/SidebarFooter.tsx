import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SidebarFooter() {
  const { isCollapsed, isMobile } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = (user.name || '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || (user.email?.[0] || 'U').toUpperCase();

  const userButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full h-auto py-2',
            isCollapsed && !isMobile
              ? 'justify-center px-2'
              : 'justify-start gap-3 px-3'
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="text-sm font-medium truncate w-full">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full">
                {user.email}
              </span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isCollapsed && !isMobile ? 'center' : 'end'}
        side={isCollapsed && !isMobile ? 'right' : 'top'}
        className="w-56"
      >
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <User className="mr-2 h-4 w-4" />
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          设置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // 收起状态时用 Tooltip 包裹
  if (isCollapsed && !isMobile) {
    return (
      <div className="border-t p-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{userButton}</TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return <div className="border-t p-2">{userButton}</div>;
}
