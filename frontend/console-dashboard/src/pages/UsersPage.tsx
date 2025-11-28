import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Trash2,
  Edit,
  Ban,
  CheckCircle,
  MoreHorizontal,
  LogOut,
  Key,
  Filter,
  Download,
  Users,
  Clock,
  Activity,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';
import { exportConfigs } from '@/lib/export';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'disabled';
  plan?: string;
  linkCount?: number;
  createdAt: string;
  lastLoginAt?: string;
}

interface LoginHistory {
  id: string;
  ip: string;
  userAgent: string;
  location?: string;
  createdAt: string;
  success: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const queryClient = useQueryClient();

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    status: 'active' as 'active' | 'disabled',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, statusFilter, planFilter, page }],
    queryFn: () =>
      proxyService
        .getUsers({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          plan: planFilter !== 'all' ? planFilter : undefined,
          page,
          limit: 20,
        })
        .then((res) => res.data),
  });

  // User login history
  const { data: loginHistory } = useQuery({
    queryKey: ['userLoginHistory', viewingUser?.id],
    queryFn: () =>
      viewingUser
        ? proxyService.getUserLoginHistory(viewingUser.id).then((res) => res.data)
        : null,
    enabled: !!viewingUser,
  });

  // User activity
  const { data: userActivity } = useQuery({
    queryKey: ['userActivity', viewingUser?.id],
    queryFn: () =>
      viewingUser
        ? proxyService.getUserActivity(viewingUser.id).then((res) => res.data)
        : null,
    enabled: !!viewingUser,
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => proxyService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      proxyService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      proxyService.toggleUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => proxyService.bulkDeleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers([]);
    },
  });

  const bulkToggleStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: 'active' | 'disabled' }) =>
      proxyService.bulkToggleStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers([]);
    },
  });

  const forceLogout = useMutation({
    mutationFn: (id: string) => proxyService.forceLogout(id),
    onSuccess: () => {
      alert('已强制用户登出');
    },
  });

  const resetPassword = useMutation({
    mutationFn: (id: string) => proxyService.resetUserPassword(id),
    onSuccess: () => {
      alert('密码重置邮件已发送');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此用户吗？此操作不可恢复。')) {
      deleteUser.mutate(id);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      status: user.status,
    });
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      updateUser.mutate({ id: editingUser.id, data: editForm });
    }
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    toggleStatus.mutate({ id: user.id, status: newStatus });
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedUsers(data.items.map((u: User) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？`)) {
      bulkDelete.mutate(selectedUsers);
    }
  };

  const handleBulkDisable = () => {
    if (confirm(`确定要禁用选中的 ${selectedUsers.length} 个用户吗？`)) {
      bulkToggleStatus.mutate({ ids: selectedUsers, status: 'disabled' });
    }
  };

  const handleBulkEnable = () => {
    bulkToggleStatus.mutate({ ids: selectedUsers, status: 'active' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAllSelected =
    data?.items?.length > 0 && selectedUsers.length === data.items.length;

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索用户名或邮箱..."
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
              <SelectItem value="disabled">已禁用</SelectItem>
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
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个用户</span>
          <ExportButton
            data={data?.items || []}
            columns={exportConfigs.users}
            filename="users_export"
            title="导出用户数据"
            description="选择要导出的用户字段和格式"
            size="sm"
          />
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <span className="text-sm text-blue-700">
            已选择 {selectedUsers.length} 个用户
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkEnable}>
              <CheckCircle className="mr-2 h-4 w-4" />
              批量启用
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDisable}>
              <Ban className="mr-2 h-4 w-4" />
              批量禁用
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              批量删除
            </Button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  用户
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  邮箱
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  套餐
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  链接数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  最后登录
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) =>
                          handleSelectUser(user.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        className="flex items-center gap-3 text-left hover:underline"
                        onClick={() => setViewingUser(user)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">
                            ID: {user.id.slice(0, 8)}...
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm">{user.email}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleToggleStatus(user)}>
                        {user.status === 'active' ? (
                          <Badge variant="success" className="cursor-pointer">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            活跃
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="cursor-pointer">
                            <Ban className="mr-1 h-3 w-3" />
                            已禁用
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Badge variant="outline">{user.plan || 'Free'}</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">{user.linkCount || 0}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          title="编辑用户"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => forceLogout.mutate(user.id)}
                          title="强制登出"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetPassword.mutate(user.id)}
                          title="重置密码"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          title="删除用户"
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
                      ? '没有找到匹配的用户'
                      : '暂无用户数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-gray-500">
              第 {page} 页，共 {Math.ceil(data.total / 20)} 页
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(data.total / 20)}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">用户名</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: 'active' | 'disabled') =>
                  setEditForm({ ...editForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateUser.isPending}>
              {updateUser.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Sheet */}
      <Sheet open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>用户详情</SheetTitle>
            <SheetDescription>查看用户的详细信息和活动记录</SheetDescription>
          </SheetHeader>

          {viewingUser && (
            <div className="mt-6 space-y-6">
              {/* User info */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {viewingUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewingUser.name}</h3>
                  <p className="text-sm text-gray-500">{viewingUser.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {viewingUser.status === 'active' ? (
                      <Badge variant="success">活跃</Badge>
                    ) : (
                      <Badge variant="secondary">已禁用</Badge>
                    )}
                    <Badge variant="outline">{viewingUser.plan || 'Free'}</Badge>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-bold">{viewingUser.linkCount || 0}</p>
                  <p className="text-sm text-gray-500">链接数</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-gray-500">总点击</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-gray-500">二维码</p>
                </div>
              </div>

              {/* Tabs for history */}
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="login" className="flex-1">
                    <Clock className="mr-2 h-4 w-4" />
                    登录历史
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1">
                    <Activity className="mr-2 h-4 w-4" />
                    操作记录
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <div className="space-y-3">
                    {loginHistory?.items?.length ? (
                      loginHistory.items.map((log: LoginHistory) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {log.success ? '登录成功' : '登录失败'}
                            </p>
                            <p className="text-xs text-gray-500">
                              IP: {log.ip} {log.location && `(${log.location})`}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-gray-500">
                        暂无登录记录
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <div className="space-y-3">
                    {userActivity?.items?.length ? (
                      userActivity.items.map((log: ActivityLog) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-gray-500">{log.resource}</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-gray-500">
                        暂无操作记录
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
                    handleEdit(viewingUser);
                    setViewingUser(null);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => forceLogout.mutate(viewingUser.id)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  强制登出
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    handleDelete(viewingUser.id);
                    setViewingUser(null);
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
    </div>
  );
}
