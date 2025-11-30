import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface AdminRole {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: string[];
  isSystem: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface PermissionGroup {
  name: string;
  permissions: string[];
}

// Admin permission labels for display
const PERMISSION_LABELS: Record<string, string> = {
  'admin:users:view': '查看用户',
  'admin:users:manage': '管理用户',
  'admin:users:delete': '删除用户',
  'admin:teams:view': '查看团队',
  'admin:teams:manage': '管理团队',
  'admin:teams:delete': '删除团队',
  'admin:links:view': '查看链接',
  'admin:links:manage': '管理链接',
  'admin:links:delete': '删除链接',
  'admin:qr:view': '查看二维码',
  'admin:qr:manage': '管理二维码',
  'admin:pages:view': '查看页面',
  'admin:pages:manage': '管理页面',
  'admin:campaigns:view': '查看活动',
  'admin:campaigns:manage': '管理活动',
  'admin:domains:view': '查看域名',
  'admin:domains:manage': '管理域名',
  'admin:billing:view': '查看计费',
  'admin:billing:manage': '管理计费',
  'admin:system:view': '查看系统',
  'admin:system:config': '系统配置',
  'admin:system:logs': '查看日志',
  'admin:system:services': '管理服务',
  'admin:system:cache': '管理缓存',
  'admin:system:backup': '备份管理',
  'admin:system:maintenance': '维护模式',
  'admin:admins:view': '查看管理员',
  'admin:admins:manage': '管理管理员',
  'admin:admins:delete': '删除管理员',
  'admin:roles:view': '查看角色',
  'admin:roles:manage': '管理角色',
  'admin:audit:view': '查看审计',
  'admin:audit:export': '导出审计',
  'admin:alerts:view': '查看告警',
  'admin:alerts:manage': '管理告警',
  'admin:analytics:view': '查看分析',
  'admin:analytics:export': '导出分析',
  'admin:integrations:view': '查看集成',
  'admin:integrations:manage': '管理集成',
  'admin:webhooks:view': '查看Webhook',
  'admin:webhooks:manage': '管理Webhook',
};

const ROLE_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export default function AdminRolesPage() {
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteRole, setDeleteRole] = useState<AdminRole | null>(null);
  const [duplicateRole, setDuplicateRole] = useState<AdminRole | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    permissions: [] as string[],
    priority: 0,
  });

  const queryClient = useQueryClient();

  // Fetch admin roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/system/roles').then((res) => res.data),
  });

  // Fetch available permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api.get('/system/roles/permissions').then((res) => res.data),
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/system/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setIsCreating(false);
      resetForm();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: typeof formData }) =>
      api.put(`/system/roles/${roleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setEditingRole(null);
      resetForm();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/system/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDeleteRole(null);
    },
  });

  const duplicateRoleMutation = useMutation({
    mutationFn: ({ roleId, name }: { roleId: string; name: string }) =>
      api.post(`/system/roles/${roleId}/duplicate`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDuplicateRole(null);
      setDuplicateName('');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      permissions: [],
      priority: 0,
    });
    setExpandedGroups({});
  };

  const openEditDialog = (role: AdminRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      color: role.color || '#3B82F6',
      permissions: role.permissions,
      priority: role.priority,
    });
    // Expand groups that have selected permissions
    const expanded: Record<string, boolean> = {};
    if (permissionsData?.groups) {
      Object.entries(permissionsData.groups as Record<string, PermissionGroup>).forEach(([key, group]) => {
        if (group.permissions.some((p: string) => role.permissions.includes(p))) {
          expanded[key] = true;
        }
      });
    }
    setExpandedGroups(expanded);
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    resetForm();
  };

  const handleSubmit = () => {
    if (editingRole) {
      updateRoleMutation.mutate({ roleId: editingRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleGroupPermissions = (groupKey: string, checked: boolean) => {
    const group = permissionsData?.groups?.[groupKey] as PermissionGroup | undefined;
    if (!group) return;

    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...group.permissions])]
        : prev.permissions.filter((p) => !group.permissions.includes(p)),
    }));
  };

  const isGroupFullySelected = (groupKey: string) => {
    const group = permissionsData?.groups?.[groupKey] as PermissionGroup | undefined;
    return group?.permissions.every((p: string) => formData.permissions.includes(p)) ?? false;
  };

  const isGroupPartiallySelected = (groupKey: string) => {
    const group = permissionsData?.groups?.[groupKey] as PermissionGroup | undefined;
    if (!group) return false;
    const selectedCount = group.permissions.filter((p: string) => formData.permissions.includes(p)).length;
    return selectedCount > 0 && selectedCount < group.permissions.length;
  };

  const roles = rolesData?.roles || [];
  const permissionGroups = permissionsData?.groups || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理员角色</h1>
          <p className="text-muted-foreground">管理平台管理员的角色和权限配置</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          创建角色
        </Button>
      </div>

      {/* Roles List */}
      <div className="rounded-lg border bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">加载中...</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-muted-foreground">暂无管理员角色</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              创建第一个角色
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {roles.map((role: AdminRole) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: role.color || '#3B82F6' }}
                  >
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          系统
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {role.description || `${role.permissions.length} 项权限`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    优先级: {role.priority}
                  </Badge>
                  <Badge variant="outline">
                    {role.permissions.length} 权限
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(role)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDuplicateRole(role);
                      setDuplicateName(`${role.name} (副本)`);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteRole(role)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Role Dialog */}
      <Dialog
        open={isCreating || !!editingRole}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingRole(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? '编辑角色' : '创建角色'}</DialogTitle>
            <DialogDescription>
              {editingRole ? '修改角色的名称、描述和权限' : '创建一个新的管理员角色'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">角色名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：内容审核员"
                  className="mt-1"
                  disabled={editingRole?.isSystem}
                />
                {editingRole?.isSystem && (
                  <p className="text-xs text-muted-foreground mt-1">系统角色名称不可修改</p>
                )}
              </div>
              <div>
                <Label>角色颜色</Label>
                <div className="mt-1 flex gap-2">
                  {ROLE_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="描述此角色的职责..."
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="priority">优先级</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">数值越大权限越高</p>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <Label className="mb-3 block">权限配置</Label>
              <div className="rounded-lg border divide-y max-h-[400px] overflow-y-auto">
                {Object.entries(permissionGroups as Record<string, PermissionGroup>).map(([groupKey, group]) => (
                  <div key={groupKey}>
                    <div
                      className="flex w-full items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [groupKey]: !prev[groupKey],
                        }))
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isGroupFullySelected(groupKey)}
                          ref={(el) => {
                            if (el) {
                              (el as HTMLButtonElement).dataset.state = isGroupPartiallySelected(groupKey)
                                ? 'indeterminate'
                                : isGroupFullySelected(groupKey)
                                ? 'checked'
                                : 'unchecked';
                            }
                          }}
                          onCheckedChange={(checked) => toggleGroupPermissions(groupKey, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {group.permissions.filter((p: string) => formData.permissions.includes(p)).length}/
                          {group.permissions.length}
                        </Badge>
                      </div>
                      {expandedGroups[groupKey] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    {expandedGroups[groupKey] && (
                      <div className="bg-gray-50 p-3 pl-10 space-y-2">
                        {group.permissions.map((permission: string) => (
                          <div key={permission} className="flex items-center gap-2">
                            <Checkbox
                              id={permission}
                              checked={formData.permissions.includes(permission)}
                              onCheckedChange={() => togglePermission(permission)}
                            />
                            <Label htmlFor={permission} className="cursor-pointer text-sm">
                              {PERMISSION_LABELS[permission] || permission}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setEditingRole(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                formData.permissions.length === 0 ||
                createRoleMutation.isPending ||
                updateRoleMutation.isPending
              }
            >
              {createRoleMutation.isPending || updateRoleMutation.isPending ? (
                '保存中...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除角色 "{deleteRole?.name}" 吗？此操作无法撤销。
              如果有管理员正在使用此角色，请先更改他们的角色。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRole && deleteRoleMutation.mutate(deleteRole.id)}
            >
              {deleteRoleMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateRole} onOpenChange={() => setDuplicateRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复制角色</DialogTitle>
            <DialogDescription>
              为 "{duplicateRole?.name}" 的副本输入新名称
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicateName">新角色名称</Label>
            <Input
              id="duplicateName"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="输入新角色名称"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateRole(null)}>
              取消
            </Button>
            <Button
              onClick={() =>
                duplicateRole &&
                duplicateRoleMutation.mutate({ roleId: duplicateRole.id, name: duplicateName })
              }
              disabled={!duplicateName || duplicateRoleMutation.isPending}
            >
              {duplicateRoleMutation.isPending ? '复制中...' : '复制'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
