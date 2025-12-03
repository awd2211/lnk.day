import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Trash2,
  Edit,
  Users,
  Link2,
  Building2,
  Ban,
  CheckCircle,
  Settings,
  UserMinus,
  Download,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';
import { exportConfigs } from '@/lib/export';

interface Team {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended';
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  memberCount: number;
  linkCount: number;
  qrCount?: number;
  totalClicks?: number;
  createdAt: string;
  members?: TeamMember[];
  quota?: TeamQuota;
}

interface TeamMember {
  id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  user: {
    id: string;
    name: string;
    email: string;
  };
  joinedAt: string;
}

interface TeamQuota {
  maxLinks: number;
  maxQrCodes: number;
  maxMembers: number;
  maxDomains: number;
  usedLinks: number;
  usedQrCodes: number;
  usedDomains: number;
}

export default function TeamsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingQuota, setManagingQuota] = useState<Team | null>(null);
  // 确认对话框状态
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<Team | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<TeamMember | null>(null);
  const queryClient = useQueryClient();
  const limit = 20;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    plan: 'free',
  });

  // Quota form state
  const [quotaForm, setQuotaForm] = useState({
    maxLinks: 100,
    maxQrCodes: 50,
    maxMembers: 5,
    maxDomains: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['teams', { page, statusFilter, planFilter, sortBy, sortOrder }],
    queryFn: () =>
      proxyService
        .getTeams({
          page,
          limit,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          plan: planFilter !== 'all' ? planFilter : undefined,
          sortBy,
          sortOrder,
        })
        .then((res) => res.data),
  });

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const { data: teamDetail } = useQuery({
    queryKey: ['team', selectedTeam?.id],
    queryFn: () =>
      selectedTeam
        ? proxyService.getTeam(selectedTeam.id).then((res) => res.data)
        : null,
    enabled: !!selectedTeam,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers', selectedTeam?.id],
    queryFn: () =>
      selectedTeam
        ? proxyService.getTeamMembers(selectedTeam.id).then((res) => res.data)
        : null,
    enabled: !!selectedTeam,
  });

  const updateTeam = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      proxyService.updateTeam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setEditingTeam(null);
    },
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => proxyService.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSelectedTeam(null);
      setDeleteTarget(null);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      proxyService.toggleTeamStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setToggleStatusTarget(null);
    },
  });

  const updateQuota = useMutation({
    mutationFn: ({ id, quota }: { id: string; quota: any }) =>
      proxyService.updateTeamQuota(id, quota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setManagingQuota(null);
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: ({
      teamId,
      memberId,
      role,
    }: {
      teamId: string;
      memberId: string;
      role: string;
    }) => proxyService.updateTeamMember(teamId, memberId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      proxyService.removeTeamMember(teamId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setRemoveMemberTarget(null);
    },
  });

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setEditForm({
      name: team.name,
      slug: team.slug,
      plan: team.plan || 'free',
    });
  };

  const handleSaveEdit = () => {
    if (editingTeam) {
      updateTeam.mutate({ id: editingTeam.id, data: editForm });
    }
  };

  const handleDelete = (team: Team) => {
    setDeleteTarget(team);
  };

  const handleToggleStatus = (team: Team) => {
    setToggleStatusTarget(team);
  };

  const handleManageQuota = (team: Team) => {
    setManagingQuota(team);
    if (team.quota) {
      setQuotaForm({
        maxLinks: team.quota.maxLinks,
        maxQrCodes: team.quota.maxQrCodes,
        maxMembers: team.quota.maxMembers,
        maxDomains: team.quota.maxDomains,
      });
    }
  };

  const handleSaveQuota = () => {
    if (managingQuota) {
      updateQuota.mutate({ id: managingQuota.id, quota: quotaForm });
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    setRemoveMemberTarget(member);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getPlanBadge = (plan: string) => {
    const plans: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      free: { label: '免费版', variant: 'secondary' },
      core: { label: '核心版', variant: 'outline' },
      growth: { label: '成长版', variant: 'default' },
      premium: { label: '高级版', variant: 'default' },
      enterprise: { label: '企业版', variant: 'default' },
    };
    const config = plans[plan] ?? plans.free;
    return <Badge variant={config!.variant}>{config!.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      owner: { label: '所有者', variant: 'default' },
      admin: { label: '管理员', variant: 'secondary' },
      member: { label: '成员', variant: 'outline' },
      viewer: { label: '查看者', variant: 'outline' },
    };
    const config = roles[role] ?? roles.member;
    return <Badge variant={config!.variant}>{config!.label}</Badge>;
  };

  const filteredTeams = data?.items?.filter((team: Team) =>
    search ? team.name?.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索团队..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="suspended">已暂停</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="套餐" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部套餐</SelectItem>
              <SelectItem value="free">免费版</SelectItem>
              <SelectItem value="core">核心版</SelectItem>
              <SelectItem value="growth">成长版</SelectItem>
              <SelectItem value="premium">高级版</SelectItem>
              <SelectItem value="enterprise">企业版</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个团队</span>
          <ExportButton
            data={data?.items || []}
            columns={exportConfigs.teams}
            filename="teams_export"
            title="导出团队数据"
            description="选择要导出的团队字段和格式"
            size="sm"
          />
        </div>
      </div>

      {/* Teams Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    团队
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">所有者</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => handleSort('status')}
                  >
                    状态
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => handleSort('plan')}
                  >
                    套餐
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => handleSort('memberCount')}
                  >
                    成员
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => handleSort('linkCount')}
                  >
                    链接
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => handleSort('createdAt')}
                  >
                    创建时间
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : filteredTeams?.length ? (
                filteredTeams.map((team: Team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        className="flex items-center gap-3 text-left hover:underline"
                        onClick={() => setSelectedTeam(team)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-xs text-gray-500">@{team.slug}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {team.owner ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                            {team.owner.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{team.owner.name}</p>
                            <p className="text-xs text-gray-500">{team.owner.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleStatus(team)}>
                        {team.status === 'active' ? (
                          <Badge variant="success" className="cursor-pointer">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            活跃
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="cursor-pointer">
                            <Ban className="mr-1 h-3 w-3" />
                            已暂停
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">{getPlanBadge(team.plan)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-gray-400" />
                        {team.memberCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Link2 className="h-4 w-4 text-gray-400" />
                        {team.linkCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(team.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(team)}
                          title="编辑团队"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageQuota(team)}
                          title="配额管理"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(team)}
                          title="删除团队"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {search || statusFilter !== 'all' || planFilter !== 'all'
                      ? '没有找到匹配的团队'
                      : '暂无团队数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-gray-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑团队</DialogTitle>
            <DialogDescription>修改团队基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">团队名称</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">团队标识</Label>
              <Input
                id="slug"
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">套餐</Label>
              <Select
                value={editForm.plan}
                onValueChange={(value) => setEditForm({ ...editForm, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="core">核心版</SelectItem>
                  <SelectItem value="growth">成长版</SelectItem>
                  <SelectItem value="premium">高级版</SelectItem>
                  <SelectItem value="enterprise">企业版</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTeam(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateTeam.isPending}>
              {updateTeam.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Management Dialog */}
      <Dialog open={!!managingQuota} onOpenChange={() => setManagingQuota(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配额管理</DialogTitle>
            <DialogDescription>
              调整团队"{managingQuota?.name}"的资源配额
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxLinks">最大链接数</Label>
                <Input
                  id="maxLinks"
                  type="number"
                  value={quotaForm.maxLinks}
                  onChange={(e) =>
                    setQuotaForm({ ...quotaForm, maxLinks: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxQrCodes">最大二维码数</Label>
                <Input
                  id="maxQrCodes"
                  type="number"
                  value={quotaForm.maxQrCodes}
                  onChange={(e) =>
                    setQuotaForm({ ...quotaForm, maxQrCodes: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMembers">最大成员数</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  value={quotaForm.maxMembers}
                  onChange={(e) =>
                    setQuotaForm({ ...quotaForm, maxMembers: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDomains">最大域名数</Label>
                <Input
                  id="maxDomains"
                  type="number"
                  value={quotaForm.maxDomains}
                  onChange={(e) =>
                    setQuotaForm({ ...quotaForm, maxDomains: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingQuota(null)}>
              取消
            </Button>
            <Button onClick={handleSaveQuota} disabled={updateQuota.isPending}>
              {updateQuota.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Detail Sheet */}
      <Sheet open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>团队详情</SheetTitle>
            <SheetDescription>查看团队信息和成员管理</SheetDescription>
          </SheetHeader>

          {selectedTeam && teamDetail && (
            <div className="mt-6 space-y-6">
              {/* Team info */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{teamDetail.name}</h3>
                  <p className="text-sm text-gray-500">@{teamDetail.slug}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {teamDetail.status === 'active' ? (
                      <Badge variant="success">活跃</Badge>
                    ) : (
                      <Badge variant="secondary">已暂停</Badge>
                    )}
                    {getPlanBadge(teamDetail.plan)}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold">{teamDetail.memberCount || 0}</p>
                  <p className="text-xs text-gray-500">成员</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold">{teamDetail.linkCount || 0}</p>
                  <p className="text-xs text-gray-500">链接</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold">{teamDetail.qrCount || 0}</p>
                  <p className="text-xs text-gray-500">二维码</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold">
                    {teamDetail.totalClicks?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-gray-500">点击</p>
                </div>
              </div>

              {/* Quota usage */}
              {teamDetail.quota && (
                <div className="space-y-2 rounded-lg border p-4">
                  <h4 className="text-sm font-medium">配额使用</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">链接</span>
                      <span>
                        {teamDetail.quota.usedLinks} / {teamDetail.quota.maxLinks}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">二维码</span>
                      <span>
                        {teamDetail.quota.usedQrCodes} / {teamDetail.quota.maxQrCodes}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">域名</span>
                      <span>
                        {teamDetail.quota.usedDomains} / {teamDetail.quota.maxDomains}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Members */}
              <Tabs defaultValue="members" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="members" className="flex-1">
                    <Users className="mr-2 h-4 w-4" />
                    成员管理
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4">
                  <div className="space-y-3">
                    {teamMembers?.items?.length ? (
                      teamMembers.items.map((member: TeamMember) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm">
                              {member.user.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.user.name}</p>
                              <p className="text-xs text-gray-500">{member.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                updateMemberRole.mutate({
                                  teamId: selectedTeam.id,
                                  memberId: member.id,
                                  role: value,
                                })
                              }
                              disabled={member.role === 'owner'}
                            >
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner" disabled>
                                  所有者
                                </SelectItem>
                                <SelectItem value="admin">管理员</SelectItem>
                                <SelectItem value="member">成员</SelectItem>
                                <SelectItem value="viewer">查看者</SelectItem>
                              </SelectContent>
                            </Select>
                            {member.role !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member)}
                              >
                                <UserMinus className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-gray-500">
                        暂无成员数据
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleEdit(selectedTeam);
                    setSelectedTeam(null);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleManageQuota(selectedTeam);
                    setSelectedTeam(null);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  配额
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    handleDelete(selectedTeam);
                    setSelectedTeam(null);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 删除团队确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除团队</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除团队"{deleteTarget?.name}"吗？此操作将删除该团队的所有数据，包括链接、二维码、活动等，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteTeam.mutate(deleteTarget.id)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 暂停/恢复团队确认对话框 */}
      <AlertDialog open={!!toggleStatusTarget} onOpenChange={(open) => !open && setToggleStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleStatusTarget?.status === 'active' ? '确认暂停团队' : '确认恢复团队'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleStatusTarget?.status === 'active'
                ? `暂停团队"${toggleStatusTarget?.name}"后，该团队的所有成员将无法访问相关资源。`
                : `恢复团队"${toggleStatusTarget?.name}"后，该团队将恢复正常使用。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={toggleStatusTarget?.status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
              onClick={() => toggleStatusTarget && toggleStatus.mutate({
                id: toggleStatusTarget.id,
                status: toggleStatusTarget.status === 'active' ? 'suspended' : 'active',
              })}
            >
              {toggleStatusTarget?.status === 'active' ? '确认暂停' : '确认恢复'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 移除成员确认对话框 */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={(open) => !open && setRemoveMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除成员</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将成员"{removeMemberTarget?.user.name}"从团队中移除吗？
              移除后该成员将无法访问团队资源。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedTeam && removeMemberTarget && removeMember.mutate({
                teamId: selectedTeam.id,
                memberId: removeMemberTarget.id,
              })}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
