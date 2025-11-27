import { Mail, RefreshCw, X, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamInvitation } from '@/hooks/useTeam';

interface PendingInvitationsProps {
  invitations: TeamInvitation[];
  isLoading?: boolean;
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
  isResending?: boolean;
  isCancelling?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  editor: '编辑',
  viewer: '查看',
};

export function PendingInvitations({
  invitations,
  isLoading,
  onResend,
  onCancel,
  isResending,
  isCancelling,
}: PendingInvitationsProps) {
  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4" />
        待处理邀请 ({pendingInvitations.length})
      </h3>

      <div className="space-y-2">
        {pendingInvitations.map((invitation) => {
          const isExpired = new Date(invitation.expiresAt) < new Date();

          return (
            <div
              key={invitation.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{invitation.email}</span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[invitation.role]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isExpired ? (
                    <span className="text-destructive">已过期</span>
                  ) : (
                    <>
                      邀请于{' '}
                      {formatDistanceToNow(new Date(invitation.invitedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResend(invitation.id)}
                  disabled={isResending}
                  title="重新发送"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(invitation.id)}
                  disabled={isCancelling}
                  title="取消邀请"
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
