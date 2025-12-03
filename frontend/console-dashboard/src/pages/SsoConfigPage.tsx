import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Play,
  Power,
  Shield,
  Key,
  Globe,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface SsoConfig {
  id: string;
  name: string;
  type: 'saml' | 'oidc' | 'oauth2' | 'ldap';
  provider: string;
  teamId?: string;
  teamName?: string;
  enabled: boolean;
  config: {
    clientId?: string;
    clientSecret?: string;
    issuer?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    ldapUrl?: string;
    baseDn?: string;
    bindDn?: string;
    attributeMapping?: Record<string, string>;
  };
  stats: {
    totalLogins: number;
    lastUsed?: string;
    activeUsers: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface SsoStats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  totalLogins: number;
  activeUsers: number;
}

const ssoTypeIcons: Record<string, React.ReactNode> = {
  saml: <Shield className="h-4 w-4" />,
  oidc: <Key className="h-4 w-4" />,
  oauth2: <Globe className="h-4 w-4" />,
  ldap: <Building2 className="h-4 w-4" />,
};

const ssoTypeLabels: Record<string, string> = {
  saml: 'SAML 2.0',
  oidc: 'OpenID Connect',
  oauth2: 'OAuth 2.0',
  ldap: 'LDAP',
};

const ssoProviders: Record<string, string[]> = {
  saml: ['Okta', 'OneLogin', 'Azure AD', 'Google Workspace', 'Custom'],
  oidc: ['Google', 'Microsoft', 'Auth0', 'Keycloak', 'Custom'],
  oauth2: ['GitHub', 'GitLab', 'Slack', 'Custom'],
  ldap: ['Active Directory', 'OpenLDAP', 'Custom'],
};

export default function SsoConfigPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SsoConfig | null>(null);
  const [viewingConfig, setViewingConfig] = useState<SsoConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SsoConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'oidc' as SsoConfig['type'],
    provider: '',
    teamId: '',
    enabled: true,
    config: {
      clientId: '',
      clientSecret: '',
      issuer: '',
      authorizationUrl: '',
      tokenUrl: '',
      userInfoUrl: '',
      entityId: '',
      ssoUrl: '',
      certificate: '',
      ldapUrl: '',
      baseDn: '',
      bindDn: '',
    },
  });

  const { data: stats } = useQuery<SsoStats>({
    queryKey: ['sso-stats'],
    queryFn: () => api.get('/proxy/sso/stats').then(r => r.data),
  });

  const { data: configsData, isLoading } = useQuery({
    queryKey: ['sso-configs', page, typeFilter, statusFilter, search],
    queryFn: () =>
      api.get('/proxy/sso', {
        params: {
          page,
          limit: 10,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
        },
      }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/proxy/sso', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-configs'] });
      queryClient.invalidateQueries({ queryKey: ['sso-stats'] });
      setDialogOpen(false);
      resetForm();
      toast.success('SSO 配置已创建');
    },
    onError: () => {
      toast.error('创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      api.put(`/proxy/sso/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-configs'] });
      setDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      toast.success('SSO 配置已更新');
    },
    onError: () => {
      toast.error('更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proxy/sso/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-configs'] });
      queryClient.invalidateQueries({ queryKey: ['sso-stats'] });
      setDeleteTarget(null);
      toast.success('SSO 配置已删除');
    },
    onError: () => {
      toast.error('删除失败');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/proxy/sso/${id}/toggle`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-configs'] });
      queryClient.invalidateQueries({ queryKey: ['sso-stats'] });
      toast.success('状态已更新');
    },
    onError: () => {
      toast.error('操作失败');
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/proxy/sso/${id}/test`),
    onSuccess: (response) => {
      if (response.data?.success) {
        toast.success('SSO 配置测试成功');
      } else {
        toast.error(`测试失败: ${response.data?.error || '未知错误'}`);
      }
    },
    onError: () => {
      toast.error('测试请求失败');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'oidc',
      provider: '',
      teamId: '',
      enabled: true,
      config: {
        clientId: '',
        clientSecret: '',
        issuer: '',
        authorizationUrl: '',
        tokenUrl: '',
        userInfoUrl: '',
        entityId: '',
        ssoUrl: '',
        certificate: '',
        ldapUrl: '',
        baseDn: '',
        bindDn: '',
      },
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const openEditDialog = (config: SsoConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      type: config.type,
      provider: config.provider,
      teamId: config.teamId || '',
      enabled: config.enabled,
      config: {
        clientId: config.config.clientId || '',
        clientSecret: config.config.clientSecret || '',
        issuer: config.config.issuer || '',
        authorizationUrl: config.config.authorizationUrl || '',
        tokenUrl: config.config.tokenUrl || '',
        userInfoUrl: config.config.userInfoUrl || '',
        entityId: config.config.entityId || '',
        ssoUrl: config.config.ssoUrl || '',
        certificate: config.config.certificate || '',
        ldapUrl: config.config.ldapUrl || '',
        baseDn: config.config.baseDn || '',
        bindDn: config.config.bindDn || '',
      },
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.provider) {
      toast.error('请填写必填字段');
      return;
    }

    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const configs = configsData?.data || [];
  const totalPages = configsData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总配置数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">启用中</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSO 登录次数</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLogins?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSO 用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeUsers?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">按类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  {ssoTypeIcons[type]}
                  <span className="text-sm">{ssoTypeLabels[type] || type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索配置..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="类型筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="saml">SAML 2.0</SelectItem>
              <SelectItem value="oidc">OpenID Connect</SelectItem>
              <SelectItem value="oauth2">OAuth 2.0</SelectItem>
              <SelectItem value="ldap">LDAP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">启用</SelectItem>
              <SelectItem value="inactive">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加 SSO 配置
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>提供商</TableHead>
              <TableHead>关联团队</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>登录次数</TableHead>
              <TableHead>最后使用</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  加载中...
                </TableCell>
              </TableRow>
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  暂无 SSO 配置
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config: SsoConfig) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ssoTypeIcons[config.type]}
                      <span>{ssoTypeLabels[config.type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>{config.provider}</TableCell>
                  <TableCell>
                    {config.teamName ? (
                      <Badge variant="outline">{config.teamName}</Badge>
                    ) : (
                      <span className="text-gray-400">全局</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.enabled ? 'default' : 'secondary'}>
                      {config.enabled ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>{config.stats?.totalLogins?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    {config.stats?.lastUsed
                      ? new Date(config.stats.lastUsed).toLocaleString('zh-CN')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setViewingConfig(config);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(config)}>
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => testMutation.mutate(config.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          测试连接
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toggleMutation.mutate({ id: config.id, enabled: !config.enabled })
                          }
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {config.enabled ? '禁用' : '启用'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteTarget(config)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="flex items-center px-4 text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingConfig ? '编辑 SSO 配置' : '添加 SSO 配置'}</DialogTitle>
            <DialogDescription>配置企业级单点登录</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>配置名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: Google SSO"
                />
              </div>
              <div className="space-y-2">
                <Label>SSO 类型 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: SsoConfig['type']) =>
                    setFormData({ ...formData, type: value, provider: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oidc">OpenID Connect</SelectItem>
                    <SelectItem value="saml">SAML 2.0</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="ldap">LDAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>身份提供商 *</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    {ssoProviders[formData.type]?.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>关联团队</Label>
                <Input
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  placeholder="留空表示全局配置"
                />
              </div>
            </div>

            {/* OIDC/OAuth2 Config */}
            {(formData.type === 'oidc' || formData.type === 'oauth2') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={formData.config.clientId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, clientId: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={formData.config.clientSecret}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, clientSecret: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                {formData.type === 'oidc' && (
                  <div className="space-y-2">
                    <Label>Issuer URL</Label>
                    <Input
                      value={formData.config.issuer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, issuer: e.target.value },
                        })
                      }
                      placeholder="https://accounts.google.com"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Authorization URL</Label>
                  <Input
                    value={formData.config.authorizationUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, authorizationUrl: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token URL</Label>
                  <Input
                    value={formData.config.tokenUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, tokenUrl: e.target.value },
                      })
                    }
                  />
                </div>
              </>
            )}

            {/* SAML Config */}
            {formData.type === 'saml' && (
              <>
                <div className="space-y-2">
                  <Label>Entity ID</Label>
                  <Input
                    value={formData.config.entityId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, entityId: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>SSO URL</Label>
                  <Input
                    value={formData.config.ssoUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, ssoUrl: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>X.509 Certificate</Label>
                  <Textarea
                    value={formData.config.certificate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, certificate: e.target.value },
                      })
                    }
                    rows={4}
                    placeholder="-----BEGIN CERTIFICATE-----..."
                  />
                </div>
              </>
            )}

            {/* LDAP Config */}
            {formData.type === 'ldap' && (
              <>
                <div className="space-y-2">
                  <Label>LDAP URL</Label>
                  <Input
                    value={formData.config.ldapUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, ldapUrl: e.target.value },
                      })
                    }
                    placeholder="ldaps://ldap.example.com:636"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base DN</Label>
                  <Input
                    value={formData.config.baseDn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, baseDn: e.target.value },
                      })
                    }
                    placeholder="dc=example,dc=com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bind DN</Label>
                  <Input
                    value={formData.config.bindDn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, bindDn: e.target.value },
                      })
                    }
                    placeholder="cn=admin,dc=example,dc=com"
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>立即启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingConfig ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>SSO 配置详情</DialogTitle>
          </DialogHeader>
          {viewingConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">名称</Label>
                  <p className="font-medium">{viewingConfig.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">类型</Label>
                  <p className="font-medium flex items-center gap-2">
                    {ssoTypeIcons[viewingConfig.type]}
                    {ssoTypeLabels[viewingConfig.type]}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">提供商</Label>
                  <p className="font-medium">{viewingConfig.provider}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={viewingConfig.enabled ? 'default' : 'secondary'}>
                    {viewingConfig.enabled ? '启用' : '禁用'}
                  </Badge>
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="text-muted-foreground">统计信息</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">总登录次数</p>
                    <p className="text-xl font-bold">
                      {viewingConfig.stats?.totalLogins?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">活跃用户</p>
                    <p className="text-xl font-bold">
                      {viewingConfig.stats?.activeUsers?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">最后使用</p>
                    <p className="text-sm font-medium">
                      {viewingConfig.stats?.lastUsed
                        ? new Date(viewingConfig.stats.lastUsed).toLocaleString('zh-CN')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="text-muted-foreground">配置详情</Label>
                <div className="mt-2 bg-gray-50 rounded-lg p-4 text-sm font-mono">
                  {viewingConfig.type === 'oidc' && (
                    <>
                      <p>Issuer: {viewingConfig.config.issuer || '-'}</p>
                      <p>Client ID: {viewingConfig.config.clientId || '-'}</p>
                    </>
                  )}
                  {viewingConfig.type === 'saml' && (
                    <>
                      <p>Entity ID: {viewingConfig.config.entityId || '-'}</p>
                      <p>SSO URL: {viewingConfig.config.ssoUrl || '-'}</p>
                    </>
                  )}
                  {viewingConfig.type === 'ldap' && (
                    <>
                      <p>LDAP URL: {viewingConfig.config.ldapUrl || '-'}</p>
                      <p>Base DN: {viewingConfig.config.baseDn || '-'}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 SSO 配置</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 SSO 配置 "{deleteTarget?.name}" 吗？使用此配置登录的用户将无法继续使用 SSO 登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
