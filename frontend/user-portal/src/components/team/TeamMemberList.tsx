import { MoreVertical, Shield, Edit2, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamMember } from '@/hooks/useTeam';

interface TeamMemberListProps {
  members: TeamMember[];
  isLoading?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onUpdateRole: (memberId: string, role: string) => void;
  onRemove: (memberId: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  editor: '编辑',
  viewer: '查看',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  editor: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TeamMemberList({
  members,
  isLoading,
  currentUserId,
  isAdmin,
  onUpdateRole,
  onRemove,
}: TeamMemberListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        暂无团队成员
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const isOwner = member.role === 'owner';
        const canManage = isAdmin && !isOwner && !isCurrentUser;

        return (
          <div
            key={member.id}
            className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.avatarUrl} alt={member.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{member.name}</span>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    你
                  </Badge>
                )}
                {isOwner && <Shield className="h-4 w-4 text-purple-500" />}
              </div>
              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
            </div>

            <div className="flex items-center gap-3">
              {canManage ? (
                <Select
                  value={member.role}
                  onValueChange={(value) => onUpdateRole(member.id, value)}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="editor">编辑</SelectItem>
                    <SelectItem value="viewer">查看</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className={ROLE_COLORS[member.role]}>
                  {ROLE_LABELS[member.role]}
                </Badge>
              )}

              <span className="hidden text-xs text-muted-foreground sm:block">
                {format(new Date(member.joinedAt), 'yyyy/MM/dd', { locale: zhCN })}
              </span>

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onRemove(member.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移除成员
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
