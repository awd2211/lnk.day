import { useState, useEffect } from 'react';
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
  Search,
  Users,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { proxyService, rolesService } from '@/lib/api';

interface Role {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: string[];
  isDefault: boolean;
  canBeDeleted: boolean;
  createdAt: string;
}

interface PermissionGroup {
  name: string;
  permissions: string[];
}

interface Team {
  id: string;
  name: string;
}

// Permission labels for display
const PERMISSION_LABELS: Record<string, string> = {
  'links:view': '查看链接',
  'links:create': '创建链接',
  'links:edit': '编辑链接',
  'links:delete': '删除链接',
  'links:bulk_edit': '批量编辑',
  'analytics:view': '查看分析',
  'analytics:export': '导出分析',
  'analytics:advanced': '高级分析',
  'qr:view': '查看二维码',
  'qr:create': '创建二维码',
  'qr:edit': '编辑二维码',
  'qr:delete': '删除二维码',
  'qr:batch': '批量操作',
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
};

// Permission groups for UI
const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  links: {
    name: '链接管理',
    permissions: ['links:view', 'links:create', 'links:edit', 'links:delete', 'links:bulk_edit'],
  },
  analytics: {
    name: '数据分析',
    permissions: ['analytics:view', 'analytics:export', 'analytics:advanced'],
  },
  qr: {
    name: 'QR 码',
    permissions: ['qr:view', 'qr:create', 'qr:edit', 'qr:delete', 'qr:batch'],
  },
  pages: {
    name: 'Bio 页面',
    permissions: ['pages:view', 'pages:create', 'pages:edit', 'pages:delete', 'pages:publish'],
  },
  campaigns: {
    name: '营销活动',
    permissions: ['campaigns:view', 'campaigns:create', 'campaigns:edit', 'campaigns:delete'],
  },
  domains: {
    name: '自定义域名',
    permissions: ['domains:view', 'domains:add', 'domains:remove', 'domains:configure'],
  },
  integrations: {
    name: '集成与 API',
    permissions: ['integrations:view', 'integrations:manage', 'api_keys:view', 'api_keys:manage', 'webhooks:manage'],
  },
  team: {
    name: '团队管理',
    permissions: ['team:view', 'team:invite', 'team:remove', 'team:roles_manage'],
  },
  billing: {
    name: '账单',
    permissions: ['billing:view', 'billing:manage'],
  },
  settings: {
    name: '设置',
    permissions: ['settings:view', 'settings:edit'],
  },
};

const ROLE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export default function RolesPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [duplicateRole, setDuplicateRole] = useState<Role | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    permissions: [] as string[],
    isDefault: false,
  });

  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teams-for-roles'],
    queryFn: () => proxyService.getTeams({ limit: 100 }).then((res) => res.data),
  });

  // Fetch roles for selected team
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['team-roles', selectedTeamId],
    queryFn: () => rolesService.getTeamRoles(selectedTeamId).then((res) => res.data),
    enabled: !!selectedTeamId,
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: typeof formData) => rolesService.createRole(selectedTeamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles', selectedTeamId] });
      setIsCreating(false);
      resetForm();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: typeof formData }) =>
      rolesService.updateRole(selectedTeamId, roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles', selectedTeamId] });
      setEditingRole(null);
      resetForm();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => rolesService.deleteRole(selectedTeamId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles', selectedTeamId] });
      setDeleteRole(null);
    },
  });

  const duplicateRoleMutation = useMutation({
    mutationFn: ({ roleId, name }: { roleId: string; name: string }) =>
      rolesService.duplicateRole(selectedTeamId, roleId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles', selectedTeamId] });
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
      isDefault: false,
    });
    setExpandedGroups({});
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      color: role.color || '#3B82F6',
      permissions: role.permissions,
      isDefault: role.isDefault,
    });
    // Expand groups that have selected permissions
    const expanded: Record<string, boolean> = {};
    Object.entries(PERMISSION_GROUPS).forEach(([key, group]) => {
      if (group.permissions.some((p) => role.permissions.includes(p))) {
        expanded[key] = true;
      }
    });
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
    const group = PERMISSION_GROUPS[groupKey];
    if (!group) return;

    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...group.permissions])]
        : prev.permissions.filter((p) => !group.permissions.includes(p)),
    }));
  };

  const isGroupFullySelected = (groupKey: string) => {
    const group = PERMISSION_GROUPS[groupKey];
    return group?.permissions.every((p) => formData.permissions.includes(p));
  };

  const isGroupPartiallySelected = (groupKey: string) => {
    const group = PERMISSION_GROUPS[groupKey];
    const selectedCount = group?.permissions.filter((p) => formData.permissions.includes(p)).length || 0;
    return selectedCount > 0 && selectedCount < (group?.permissions.length || 0);
  };

  const filteredTeams = (teamsData?.items || teamsData?.teams || []).filter((team: Team) =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const roles = rolesData?.items || rolesData?.roles || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色权限管理</h1>
          <p className="text-muted-foreground">管理团队的自定义角色和权限配置</p>
        </div>
      </div>

      {/* Team Selector */}
      <div className="rounded-lg border bg-white p-6">
        <Label className="mb-2 block">选择团队</Label>
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索团队..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="选择一个团队" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingTeams ? (
                <SelectItem value="loading" disabled>
                  加载中...
                </SelectItem>
              ) : (
                filteredTeams.map((team: Team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Roles List */}
      {selectedTeamId && (
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">角色列表</h2>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              创建角色
            </Button>
          </div>

          {isLoadingRoles ? (
            <div className="p-8 text-center text-muted-foreground">加载中...</div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-muted-foreground">暂无自定义角色</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                创建第一个角色
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {roles.map((role: Role) => (
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
                        {role.isDefault && (
                          <Badge variant="secondary">默认</Badge>
                        )}
                        {!role.canBeDeleted && (
                          <Badge variant="outline">系统</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {role.description || `${role.permissions.length} 项权限`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
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
                    {role.canBeDeleted && (
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
      )}

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
              {editingRole ? '修改角色的名称、描述和权限' : '创建一个新的自定义角色'}
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
                  placeholder="例如：内容编辑"
                  className="mt-1"
                />
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

            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isDefault: !!checked }))
                }
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                设为默认角色（新成员将自动分配此角色）
              </Label>
            </div>

            {/* Permissions */}
            <div>
              <Label className="mb-3 block">权限配置</Label>
              <div className="rounded-lg border divide-y">
                {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey}>
                    <button
                      className="flex w-full items-center justify-between p-3 hover:bg-gray-50"
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
                          {group.permissions.filter((p) => formData.permissions.includes(p)).length}/
                          {group.permissions.length}
                        </Badge>
                      </div>
                      {expandedGroups[groupKey] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {expandedGroups[groupKey] && (
                      <div className="bg-gray-50 p-3 pl-10 space-y-2">
                        {group.permissions.map((permission) => (
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
              如果有成员正在使用此角色，请先更改他们的角色。
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
              为新角色 "{duplicateRole?.name}" 的副本输入名称
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
