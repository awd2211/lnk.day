import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Crown,
  User,
  Check,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

// 权限标签
const PERMISSION_LABELS: Record<string, string> = {
  'links:view': '查看链接',
  'links:create': '创建链接',
  'links:edit': '编辑链接',
  'links:delete': '删除链接',
  'links:bulk_edit': '批量编辑链接',
  'analytics:view': '查看分析',
  'analytics:export': '导出分析',
  'analytics:advanced': '高级分析',
  'qr:view': '查看二维码',
  'qr:create': '创建二维码',
  'qr:edit': '编辑二维码',
  'qr:delete': '删除二维码',
  'qr:batch': '批量操作二维码',
  'pages:view': '查看页面',
  'pages:create': '创建页面',
  'pages:edit': '编辑页面',
  'pages:delete': '删除页面',
  'pages:publish': '发布页面',
  'campaigns:view': '查看活动',
  'campaigns:create': '创建活动',
  'campaigns:edit': '编辑活动',
  'campaigns:delete': '删除活动',
  'domains:view': '查看域名',
  'domains:add': '添加域名',
  'domains:remove': '移除域名',
  'domains:configure': '配置域名',
  'integrations:view': '查看集成',
  'integrations:manage': '管理集成',
  'api_keys:view': '查看 API 密钥',
  'api_keys:manage': '管理 API 密钥',
  'webhooks:manage': '管理 Webhooks',
  'team:view': '查看团队',
  'team:invite': '邀请成员',
  'team:remove': '移除成员',
  'team:roles_manage': '管理角色',
  'billing:view': '查看账单',
  'billing:manage': '管理账单',
  'settings:view': '查看设置',
  'settings:edit': '编辑设置',
  'deeplinks:view': '查看深度链接',
  'deeplinks:create': '创建深度链接',
  'deeplinks:edit': '编辑深度链接',
};

// 预设角色颜色
const ROLE_COLORS: Record<string, string> = {
  OWNER: '#8B5CF6',
  ADMIN: '#3B82F6',
  MEMBER: '#10B981',
  VIEWER: '#6B7280',
};

// 角色名称
const ROLE_NAMES: Record<string, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  MEMBER: '成员',
  VIEWER: '查看者',
};

// 角色图标
const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
};

interface PermissionGroup {
  name: string;
  permissions: string[];
}

interface PresetRole {
  name: string;
  permissions: string[];
}

export default function RolesPage() {
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // 获取预设角色权限配置
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['preset-team-roles'],
    queryFn: () => api.get('/system/preset-roles').then((res) => res.data),
  });

  // 获取所有可用权限
  const { data: permissionsData } = useQuery({
    queryKey: ['team-permissions'],
    queryFn: () => api.get('/system/preset-roles/permissions').then((res) => res.data),
  });

  // 更新预设角色权限
  const updateRoleMutation = useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      api.put(`/system/preset-roles/${role}`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preset-team-roles'] });
      setEditingRole(null);
      setEditedPermissions([]);
    },
  });

  // 重置预设角色到默认
  const resetRoleMutation = useMutation({
    mutationFn: (role: string) => api.post(`/system/preset-roles/${role}/reset`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preset-team-roles'] });
      setConfirmReset(null);
    },
  });

  const presetRoles = rolesData?.presets || [];
  const permissionGroups = permissionsData?.groups || {};

  // 开始编辑角色
  const startEditing = (role: PresetRole) => {
    setEditingRole(role.name);
    setEditedPermissions([...role.permissions]);
    // 展开有选中权限的分组
    const expanded: Record<string, boolean> = {};
    Object.entries(permissionGroups as Record<string, PermissionGroup>).forEach(([key, group]) => {
      if (group.permissions.some((p: string) => role.permissions.includes(p))) {
        expanded[key] = true;
      }
    });
    setExpandedGroups(expanded);
  };

  // 切换权限
  const togglePermission = (permission: string) => {
    setEditedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  // 切换整组权限
  const toggleGroupPermissions = (groupKey: string, checked: boolean) => {
    const group = permissionGroups[groupKey] as PermissionGroup | undefined;
    if (!group) return;

    setEditedPermissions((prev) =>
      checked
        ? [...new Set([...prev, ...group.permissions])]
        : prev.filter((p) => !group.permissions.includes(p))
    );
  };

  const isGroupFullySelected = (groupKey: string) => {
    const group = permissionGroups[groupKey] as PermissionGroup | undefined;
    return group?.permissions.every((p: string) => editedPermissions.includes(p)) ?? false;
  };

  const isGroupPartiallySelected = (groupKey: string) => {
    const group = permissionGroups[groupKey] as PermissionGroup | undefined;
    if (!group) return false;
    const selectedCount = group.permissions.filter((p: string) => editedPermissions.includes(p)).length;
    return selectedCount > 0 && selectedCount < group.permissions.length;
  };

  // 保存编辑
  const saveEdit = () => {
    if (editingRole) {
      updateRoleMutation.mutate({ role: editingRole, permissions: editedPermissions });
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingRole(null);
    setEditedPermissions([]);
    setExpandedGroups({});
  };

  // 获取角色权限用于表格显示
  const getRolePermissions = (roleName: string): string[] => {
    const role = presetRoles.find((r: PresetRole) => r.name === roleName);
    return role?.permissions || [];
  };

  // 构建权限对比数据
  const buildComparisonData = () => {
    const groups: { category: string; permissions: { key: string; name: string }[] }[] = [];

    Object.entries(permissionGroups as Record<string, PermissionGroup>).forEach(([, group]) => {
      groups.push({
        category: group.name,
        permissions: group.permissions.map((p: string) => ({
          key: p,
          name: PERMISSION_LABELS[p] || p,
        })),
      });
    });

    return groups;
  };

  const comparisonData = buildComparisonData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">团队角色权限</h1>
        <p className="text-muted-foreground">管理系统预设的团队角色权限配置</p>
      </div>

      {/* Role Legend with Edit Buttons */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="font-medium mb-4">预设角色</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((roleName) => {
            const Icon = ROLE_ICONS[roleName] || Shield;
            const color = ROLE_COLORS[roleName] || '#3B82F6';
            const role = presetRoles.find((r: PresetRole) => r.name === roleName);
            const permissionCount = role?.permissions.length || 0;

            return (
              <div
                key={roleName}
                className="flex items-start gap-3 p-4 rounded-lg border"
                style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color }}>
                      {ROLE_NAMES[roleName] || roleName}
                    </p>
                    {roleName !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => role && startEditing(role)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {permissionCount} 项权限
                  </p>
                  {roleName !== 'OWNER' && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setConfirmReset(roleName)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      恢复默认
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Comparison Table */}
      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">权限对比表</h2>
          <p className="text-sm text-muted-foreground">不同角色拥有的权限对比</p>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">权限</TableHead>
                  {['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((roleName) => {
                    const Icon = ROLE_ICONS[roleName] || Shield;
                    const color = ROLE_COLORS[roleName];
                    return (
                      <TableHead key={roleName} className="text-center w-[120px]">
                        <div className="flex items-center justify-center gap-1">
                          <Icon className="h-4 w-4" style={{ color }} />
                          {ROLE_NAMES[roleName]}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((group) => (
                  <React.Fragment key={group.category}>
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={5} className="font-semibold">
                        {group.category}
                      </TableCell>
                    </TableRow>
                    {group.permissions.map((perm) => (
                      <TableRow key={perm.key}>
                        <TableCell className="pl-8">{perm.name}</TableCell>
                        {['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((roleName) => {
                          const permissions = getRolePermissions(roleName);
                          const hasPermission = permissions.includes(perm.key);
                          return (
                            <TableCell key={roleName} className="text-center">
                              {hasPermission ? (
                                <Check className="h-5 w-5 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-gray-300 mx-auto" />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && cancelEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              编辑 {editingRole && ROLE_NAMES[editingRole]} 角色权限
            </DialogTitle>
            <DialogDescription>
              选择此角色应具有的权限。更改将影响所有使用此预设角色的团队成员。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg border divide-y max-h-[400px] overflow-y-auto">
              {Object.entries(permissionGroups as Record<string, PermissionGroup>).map(
                ([groupKey, group]) => (
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
                              (el as HTMLButtonElement).dataset.state = isGroupPartiallySelected(
                                groupKey
                              )
                                ? 'indeterminate'
                                : isGroupFullySelected(groupKey)
                                ? 'checked'
                                : 'unchecked';
                            }
                          }}
                          onCheckedChange={(checked) =>
                            toggleGroupPermissions(groupKey, !!checked)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {
                            group.permissions.filter((p: string) =>
                              editedPermissions.includes(p)
                            ).length
                          }
                          /{group.permissions.length}
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
                              checked={editedPermissions.includes(permission)}
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
                )
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelEdit}>
              取消
            </Button>
            <Button
              onClick={saveEdit}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? (
                '保存中...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={!!confirmReset} onOpenChange={() => setConfirmReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认权限</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将 {confirmReset && ROLE_NAMES[confirmReset]} 角色的权限恢复到系统默认配置吗？
              此操作将影响所有使用此预设角色的团队成员。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmReset && resetRoleMutation.mutate(confirmReset)}
            >
              {resetRoleMutation.isPending ? '恢复中...' : '确认恢复'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
