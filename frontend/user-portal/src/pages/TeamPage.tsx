import { useState } from 'react';
import { Users, UserPlus, Settings, CreditCard, Building } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamMemberList, InviteMemberDialog, PendingInvitations } from '@/components/team';
import { useToast } from '@/hooks/use-toast';
import {
  useCurrentTeam,
  useTeamMembers,
  useTeamInvitations,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useCancelInvitation,
  useResendInvitation,
  useUpdateTeam,
} from '@/hooks/useTeam';

const PLAN_LABELS: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  enterprise: '企业版',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export default function TeamPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const { toast } = useToast();

  // Queries
  const { data: team, isLoading: isLoadingTeam } = useCurrentTeam();
  const { data: members, isLoading: isLoadingMembers } = useTeamMembers(team?.id);
  const { data: invitations, isLoading: isLoadingInvitations } = useTeamInvitations(team?.id);

  // Mutations
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const updateTeam = useUpdateTeam();

  // Current user check (simplified - in real app, get from auth context)
  const currentUserId = 'current-user-id'; // TODO: Get from auth context
  const isAdmin = true; // TODO: Check user role

  // Handlers
  const handleInvite = async (email: string, role: string) => {
    if (!team) return;
    try {
      await inviteMember.mutateAsync({ teamId: team.id, email, role });
      setShowInviteDialog(false);
      toast({ title: '邀请已发送', description: `已向 ${email} 发送邀请` });
    } catch (error: any) {
      toast({
        title: '邀请失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!team) return;
    try {
      await updateRole.mutateAsync({ teamId: team.id, memberId, role });
      toast({ title: '角色已更新' });
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    if (!confirm('确定要移除该成员吗？')) return;
    try {
      await removeMember.mutateAsync({ teamId: team.id, memberId });
      toast({ title: '成员已移除' });
    } catch {
      toast({ title: '移除失败', variant: 'destructive' });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!team) return;
    try {
      await cancelInvitation.mutateAsync({ teamId: team.id, invitationId });
      toast({ title: '邀请已取消' });
    } catch {
      toast({ title: '取消失败', variant: 'destructive' });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!team) return;
    try {
      await resendInvitation.mutateAsync({ teamId: team.id, invitationId });
      toast({ title: '邀请已重新发送' });
    } catch {
      toast({ title: '发送失败', variant: 'destructive' });
    }
  };

  const handleSaveSettings = async () => {
    if (!team || !teamName.trim()) return;
    setIsSavingSettings(true);
    try {
      await updateTeam.mutateAsync({ teamId: team.id, data: { name: teamName } });
      toast({ title: '设置已保存' });
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">团队管理</h1>
          <p className="text-muted-foreground">管理您的团队成员和设置</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            邀请成员
          </Button>
        )}
      </div>

      {/* Team Overview Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {isLoadingTeam ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : team ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{team.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {team.memberCount} 位成员 · 创建于{' '}
                    {new Date(team.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              <Badge className={PLAN_COLORS[team.plan]}>{PLAN_LABELS[team.plan]}</Badge>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">无法加载团队信息</div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            成员
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            设置
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            计费
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Pending Invitations */}
          <PendingInvitations
            invitations={invitations || []}
            isLoading={isLoadingInvitations}
            onResend={handleResendInvitation}
            onCancel={handleCancelInvitation}
            isResending={resendInvitation.isPending}
            isCancelling={cancelInvitation.isPending}
          />

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">团队成员</CardTitle>
              <CardDescription>管理您团队中的成员及其权限</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMemberList
                members={members || []}
                isLoading={isLoadingMembers}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onUpdateRole={handleUpdateRole}
                onRemove={handleRemoveMember}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">团队设置</CardTitle>
              <CardDescription>更新您的团队信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-4">
                <div>
                  <Label htmlFor="teamName">团队名称</Label>
                  <Input
                    id="teamName"
                    value={teamName || team?.name || ''}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="输入团队名称"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings || !teamName.trim()}
                >
                  {isSavingSettings ? '保存中...' : '保存更改'}
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium text-destructive">危险区域</h3>
                <p className="text-sm text-muted-foreground">
                  删除团队后，所有团队数据将被永久删除且无法恢复。
                </p>
                <Button variant="destructive" disabled>
                  删除团队
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">计费与订阅</CardTitle>
              <CardDescription>管理您的订阅计划和付款方式</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">当前计划</p>
                      <p className="text-2xl font-bold">
                        {team ? PLAN_LABELS[team.plan] : '---'}
                      </p>
                    </div>
                    <Button variant="outline">升级计划</Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-4 font-medium">计划功能</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      无限短链接
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      基础数据分析
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      最多 5 位团队成员
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span>✗</span>
                      自定义域名
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <span>✗</span>
                      API 访问
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={handleInvite}
        inviting={inviteMember.isPending}
      />
    </Layout>
  );
}
