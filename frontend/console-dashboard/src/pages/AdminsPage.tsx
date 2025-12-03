import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Clock,
  Mail,
  User,
  CheckCircle,
  XCircle,
  Eye,
  History,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Lock,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminAuthService, api } from '@/lib/api';

interface AdminRole {
  id: string;
  name: string;
  color?: string;
  permissions: string[];
  isSystem: boolean;
  priority: number;
}

interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'SYSTEM_ADMIN' | 'OPERATION_MANAGER' | 'CONTENT_OPERATOR' | 'CUSTOMER_SUPPORT' | 'FINANCE' | 'DATA_ANALYST' | 'AUDITOR';
  roleId?: string;
  roleEntity?: AdminRole;
  status: 'pending' | 'active' | 'suspended';
  lastLoginAt?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoginHistory {
  id: string;
  ip: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}

export default function AdminsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteAdmin, setDeleteAdmin] = useState<Admin | null>(null);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<Admin | null>(null);
  const [toggleStatusAdmin, setToggleStatusAdmin] = useState<Admin | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    roleId: '',
  });

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

  // Fetch admins
  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['admins', { search, page, statusFilter, roleFilter, sortBy, sortOrder }],
    queryFn: async () => {
      const response = await adminAuthService.getAdmins();
      let admins = response.data || [];

      // Client-side filtering
      if (statusFilter !== 'all') {
        admins = admins.filter((a: Admin) => a.status === statusFilter);
      }
      if (roleFilter !== 'all') {
        admins = admins.filter((a: Admin) => a.roleId === roleFilter || a.role === roleFilter);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        admins = admins.filter(
          (a: Admin) =>
            a.name.toLowerCase().includes(searchLower) ||
            a.email.toLowerCase().includes(searchLower)
        );
      }

      // Client-side sorting
      admins.sort((a: Admin, b: Admin) => {
        let aVal: any = a[sortBy as keyof Admin];
        let bVal: any = b[sortBy as keyof Admin];
        if (sortBy === 'role') {
          aVal = a.roleEntity?.name || a.role;
          bVal = b.roleEntity?.name || b.role;
        }
        if (aVal < bVal) return sortOrder === 'ASC' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'ASC' ? 1 : -1;
        return 0;
      });

      const total = admins.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const items = admins.slice(start, start + limit);

      return { items, total, page, totalPages };
    },
  });

  // Fetch roles for dropdown
  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/system/roles').then((res) => res.data),
  });

  // Fetch login history for selected admin
  const { data: loginHistory } = useQuery({
    queryKey: ['admin-login-history', selectedAdmin?.id],
    queryFn: async () => {
      if (!selectedAdmin) return [];
      // This API might not exist yet, return empty array
      try {
        const response = await api.get(`/admin/${selectedAdmin.id}/login-history`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedAdmin,
  });

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/admin', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setIsCreating(false);
      resetForm();
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/${id}/resend-invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      adminAuthService.updateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setIsEditing(false);
      setSelectedAdmin(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAuthService.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setDeleteAdmin(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      adminAuthService.updateAdmin(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setToggleStatusAdmin(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      // Send password reset email
      const admin = adminsData?.items.find((a: Admin) => a.id === id);
      if (admin) {
        await api.post('/admin/forgot-password', { email: admin.email });
      }
    },
    onSuccess: () => {
      setResetPasswordAdmin(null);
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      roleId: '',
    });
  };

  const openEdit = (admin: Admin) => {
    setFormData({
      email: admin.email,
      name: admin.name,
      roleId: admin.roleId || '',
    });
    setSelectedAdmin(admin);
    setIsEditing(true);
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

  const ROLE_DISPLAY_NAMES: Record<string, string> = {
    SUPER_ADMIN: '超级管理员',
    SYSTEM_ADMIN: '系统管理员',
    OPERATION_MANAGER: '运营主管',
    CONTENT_OPERATOR: '内容运营',
    CUSTOMER_SUPPORT: '客服专员',
    FINANCE: '财务人员',
    DATA_ANALYST: '数据分析师',
    AUDITOR: '审计员',
  };

  const getRoleName = (admin: Admin) => {
    // 优先使用 roleEntity 的 name 进行映射
    const roleName = admin.roleEntity?.name || admin.role;
    return ROLE_DISPLAY_NAMES[roleName] || roleName;
  };

  const getRoleColor = (admin: Admin) => {
    if (admin.roleEntity?.color) {
      return admin.roleEntity.color;
    }
    const roleColors: Record<string, string> = {
      SUPER_ADMIN: '#EF4444',
      SYSTEM_ADMIN: '#6366F1',
      OPERATION_MANAGER: '#F59E0B',
      CONTENT_OPERATOR: '#10B981',
      CUSTOMER_SUPPORT: '#3B82F6',
      FINANCE: '#EC4899',
      DATA_ANALYST: '#8B5CF6',
      AUDITOR: '#64748B',
    };
    return roleColors[admin.role] || '#6B7280';
  };

  // Handle different response formats for roles
  // Fallback should not be used - roles should always come from API
  const FALLBACK_ROLES: AdminRole[] = [];
  const apiRoles = Array.isArray(rolesData)
    ? rolesData
    : (rolesData?.data || rolesData?.roles || []);
  const roles: AdminRole[] = apiRoles.length > 0 ? apiRoles : FALLBACK_ROLES;

  // Helper to get display name for role in dropdowns
  const getRoleDisplayName = (role: AdminRole) => {
    return ROLE_DISPLAY_NAMES[role.name] || role.name;
  };
  const admins = adminsData?.items || [];
  const totalPages = adminsData?.totalPages || 1;
  const total = adminsData?.total || 0;

  // Stats
  const activeCount = admins.filter((a: Admin) => a.status === 'active').length;
  const pendingCount = admins.filter((a: Admin) => a.status === 'pending').length;
  const suspendedCount = admins.filter((a: Admin) => a.status === 'suspended').length;
  const twoFactorCount = admins.filter((a: Admin) => a.twoFactorEnabled).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">管理员总数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-100 p-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">活跃账号</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-yellow-100 p-3">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">待激活</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-100 p-3">
                <Lock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{twoFactorCount}</p>
                <p className="text-sm text-muted-foreground">已启用 2FA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索管理员..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="pending">待激活</SelectItem>
              <SelectItem value="suspended">已停用</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              {roles.map((role: AdminRole) => (
                <SelectItem key={role.id} value={role.id}>
                  {getRoleDisplayName(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setIsCreating(true); }}>
          <Mail className="mr-2 h-4 w-4" />
          邀请管理员
        </Button>
      </div>

      {/* Admins Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    管理员
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('email')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    邮箱
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    角色
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">安全</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('lastLoginAt')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    最后登录
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无管理员
                  </td>
                </tr>
              ) : (
                admins.map((admin: Admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-white font-medium"
                          style={{ backgroundColor: getRoleColor(admin) }}
                        >
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-xs text-gray-500">ID: {admin.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{admin.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        style={{
                          backgroundColor: `${getRoleColor(admin)}20`,
                          color: getRoleColor(admin),
                          borderColor: getRoleColor(admin),
                        }}
                        variant="outline"
                      >
                        {getRoleName(admin)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {admin.status === 'active' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          活跃
                        </Badge>
                      )}
                      {admin.status === 'pending' && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Clock className="mr-1 h-3 w-3" />
                          待激活
                        </Badge>
                      )}
                      {admin.status === 'suspended' && (
                        <Badge className="bg-gray-100 text-gray-700">
                          <XCircle className="mr-1 h-3 w-3" />
                          已停用
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {admin.twoFactorEnabled ? (
                        <Badge className="bg-purple-100 text-purple-700">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          2FA 已启用
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">未启用 2FA</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {admin.lastLoginAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(admin.lastLoginAt)}
                        </div>
                      ) : (
                        <span className="text-gray-400">从未登录</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedAdmin(admin); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(admin)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          {admin.status === 'pending' ? (
                            <DropdownMenuItem
                              onClick={() => resendInviteMutation.mutate(admin.id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              重发邀请
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setResetPasswordAdmin(admin)}>
                              <Key className="mr-2 h-4 w-4" />
                              重置密码
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {admin.status !== 'pending' && (
                            <DropdownMenuItem
                              onClick={() => setToggleStatusAdmin(admin)}
                            >
                              {admin.status === 'active' ? (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  停用账号
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  启用账号
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteAdmin(admin)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
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
                    onClick={() => setPage(pageNum)}
                    className="w-8 px-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || isEditing} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setIsEditing(false);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreating ? '邀请管理员' : '编辑管理员'}</DialogTitle>
            <DialogDescription>
              {isCreating ? '发送邀请邮件，对方设置密码后激活账号' : '修改管理员信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                placeholder="请输入姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isEditing}
              />
              {isCreating && (
                <p className="text-xs text-muted-foreground">
                  邀请链接将发送至该邮箱，有效期 7 天
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>角色 *</Label>
              <Select
                value={formData.roleId}
                onValueChange={(v) => setFormData({ ...formData, roleId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: AdminRole) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: role.color || '#6B7280' }}
                        />
                        {getRoleDisplayName(role)}
                        {role.isSystem && <Lock className="h-3 w-3 text-gray-400" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (isCreating) {
                  inviteMutation.mutate(formData);
                } else if (selectedAdmin) {
                  const updateData: any = {
                    name: formData.name,
                    roleId: formData.roleId,
                  };
                  updateMutation.mutate({ id: selectedAdmin.id, data: updateData });
                }
              }}
              disabled={
                !formData.name ||
                !formData.email ||
                !formData.roleId ||
                inviteMutation.isPending ||
                updateMutation.isPending
              }
            >
              {inviteMutation.isPending || updateMutation.isPending
                ? '处理中...'
                : isCreating
                ? '发送邀请'
                : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAdmin} onOpenChange={() => setDeleteAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除管理员 "{deleteAdmin?.name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteAdmin && deleteMutation.mutate(deleteAdmin.id)}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={!!resetPasswordAdmin} onOpenChange={() => setResetPasswordAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重置密码</AlertDialogTitle>
            <AlertDialogDescription>
              确定要为管理员 "{resetPasswordAdmin?.name}" 发送密码重置邮件吗？
              <br />
              重置链接将发送至：{resetPasswordAdmin?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetPasswordAdmin && resetPasswordMutation.mutate(resetPasswordAdmin.id)}
            >
              {resetPasswordMutation.isPending ? '发送中...' : '发送重置邮件'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirmation */}
      <AlertDialog open={!!toggleStatusAdmin} onOpenChange={() => setToggleStatusAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleStatusAdmin?.status === 'active' ? '停用管理员账号' : '启用管理员账号'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleStatusAdmin?.status === 'active' ? (
                <>
                  确定要停用管理员 <strong>{toggleStatusAdmin?.name}</strong> 的账号吗？
                  停用后该管理员将无法登录系统。
                </>
              ) : (
                <>
                  确定要启用管理员 <strong>{toggleStatusAdmin?.name}</strong> 的账号吗？
                  启用后该管理员可以正常登录系统。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={toggleStatusAdmin?.status === 'active' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              onClick={() => {
                if (toggleStatusAdmin) {
                  toggleStatusMutation.mutate({
                    id: toggleStatusAdmin.id,
                    status: toggleStatusAdmin.status === 'active' ? 'suspended' : 'active',
                  });
                }
              }}
            >
              {toggleStatusMutation.isPending
                ? '处理中...'
                : toggleStatusAdmin?.status === 'active'
                ? '确认停用'
                : '确认启用'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Detail Sheet */}
      <Sheet open={!!selectedAdmin && !isEditing} onOpenChange={() => setSelectedAdmin(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>管理员详情</SheetTitle>
          </SheetHeader>
          {selectedAdmin && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">基本信息</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">登录历史</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-white text-2xl font-bold"
                    style={{ backgroundColor: getRoleColor(selectedAdmin) }}
                  >
                    {selectedAdmin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedAdmin.name}</h3>
                    <p className="text-gray-500">{selectedAdmin.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-sm text-gray-500">角色</p>
                    <Badge
                      style={{
                        backgroundColor: `${getRoleColor(selectedAdmin)}20`,
                        color: getRoleColor(selectedAdmin),
                      }}
                      variant="outline"
                      className="mt-1"
                    >
                      {getRoleName(selectedAdmin)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">状态</p>
                    {selectedAdmin.status === 'active' && (
                      <Badge className="bg-green-100 text-green-700 mt-1">活跃</Badge>
                    )}
                    {selectedAdmin.status === 'pending' && (
                      <Badge className="bg-yellow-100 text-yellow-700 mt-1">待激活</Badge>
                    )}
                    {selectedAdmin.status === 'suspended' && (
                      <Badge className="bg-gray-100 text-gray-700 mt-1">已停用</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">双因素认证</p>
                    {selectedAdmin.twoFactorEnabled ? (
                      <Badge className="bg-purple-100 text-purple-700 mt-1">已启用</Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">未启用</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">最后登录</p>
                    <p className="font-medium mt-1">
                      {selectedAdmin.lastLoginAt
                        ? formatDate(selectedAdmin.lastLoginAt)
                        : '从未登录'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">创建时间</p>
                    <p className="font-medium mt-1">{formatDate(selectedAdmin.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">更新时间</p>
                    <p className="font-medium mt-1">{formatDate(selectedAdmin.updatedAt)}</p>
                  </div>
                </div>

                {selectedAdmin.roleEntity && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">权限列表</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedAdmin.roleEntity.permissions.slice(0, 10).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm.replace('admin:', '')}
                        </Badge>
                      ))}
                      {selectedAdmin.roleEntity.permissions.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedAdmin.roleEntity.permissions.length - 10} 更多
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(selectedAdmin)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setResetPasswordAdmin(selectedAdmin)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    重置密码
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-3">
                {loginHistory && loginHistory.length > 0 ? (
                  loginHistory.map((log: LoginHistory) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {log.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {log.success ? '登录成功' : '登录失败'}
                          </p>
                          <p className="text-xs text-gray-500">{log.ip}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(log.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无登录记录</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
