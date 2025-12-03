import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Plug,
  Unplug,
  History,
  MoreVertical,
  Zap,
  ShoppingBag,
  Users,
  BarChart3,
  Key,
  Eye,
  EyeOff,
  Save,
  Power,
  PowerOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { integrationsService, integrationConfigService } from '@/lib/api';

// ============ 类型定义 ============

interface IntegrationConfig {
  id: string;
  type: 'zapier' | 'hubspot' | 'salesforce' | 'shopify';
  name: string;
  description: string;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  scopes?: string[];
  callbackUrl?: string;
  webhookUrl?: string;
  settings?: Record<string, any>;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface Integration {
  id: string;
  type: 'zapier' | 'hubspot' | 'salesforce' | 'shopify';
  name: string;
  teamId: string;
  teamName?: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  config: Record<string, any>;
  lastSyncAt?: string;
  syncEnabled: boolean;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: string;
  integrationId: string;
  action: string;
  status: 'success' | 'failed' | 'pending';
  recordsProcessed: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

const integrationTypes = [
  { type: 'zapier', name: 'Zapier', icon: Zap, color: 'bg-orange-500', description: '连接 5000+ 应用的自动化平台' },
  { type: 'hubspot', name: 'HubSpot', icon: Users, color: 'bg-orange-600', description: 'CRM 和营销自动化平台' },
  { type: 'salesforce', name: 'Salesforce', icon: BarChart3, color: 'bg-blue-500', description: '企业级 CRM 解决方案' },
  { type: 'shopify', name: 'Shopify', icon: ShoppingBag, color: 'bg-green-600', description: '电商平台集成' },
];

// ============ 平台配置 Tab ============

function PlatformConfigTab() {
  const queryClient = useQueryClient();
  const [selectedConfig, setSelectedConfig] = useState<IntegrationConfig | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<IntegrationConfig>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const { data: configsData, isLoading, refetch } = useQuery({
    queryKey: ['integration-configs'],
    queryFn: () => integrationConfigService.getConfigs(),
  });

  const { data: configStatsData } = useQuery({
    queryKey: ['integration-config-stats'],
    queryFn: () => integrationConfigService.getStats(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      integrationConfigService.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs'] });
      queryClient.invalidateQueries({ queryKey: ['integration-config-stats'] });
      setShowConfigDialog(false);
      setSelectedConfig(null);
      setShowSaveConfirm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      integrationConfigService.toggleConfig(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs'] });
      queryClient.invalidateQueries({ queryKey: ['integration-config-stats'] });
    },
  });

  const configs: IntegrationConfig[] = configsData?.data || [];
  const configStats = configStatsData?.data || { total: 0, enabled: 0, disabled: 0, byType: {} };

  const getTypeInfo = (type: string) => {
    return integrationTypes.find(t => t.type === type) ?? integrationTypes[0]!;
  };

  const openConfigDialog = (config: IntegrationConfig) => {
    setSelectedConfig(config);
    setFormData({
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      webhookSecret: config.webhookSecret || '',
      apiKey: config.apiKey || '',
      apiSecret: config.apiSecret || '',
      callbackUrl: config.callbackUrl || '',
      webhookUrl: config.webhookUrl || '',
      scopes: config.scopes || [],
      settings: config.settings || {},
    });
    setShowSecrets({});
    setShowConfigDialog(true);
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSave = () => {
    if (selectedConfig) {
      updateMutation.mutate({
        id: selectedConfig.id,
        data: formData,
      });
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总平台数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已启用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{configStats.enabled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已禁用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{configStats.disabled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : configs.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无集成平台配置</p>
          </div>
        ) : (
          configs.map((config) => {
            const typeInfo = getTypeInfo(config.type);
            const Icon = typeInfo.icon;
            const isConfigured = !!(config.clientId || config.apiKey);
            return (
              <Card key={config.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${typeInfo.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <CardDescription>{config.description}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(enabled) =>
                        toggleMutation.mutate({ id: config.id, enabled })
                      }
                      disabled={!isConfigured}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">状态:</span>
                      {config.enabled ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Power className="w-3 h-3 mr-1" />
                          已启用
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <PowerOff className="w-3 h-3 mr-1" />
                          已禁用
                        </Badge>
                      )}
                      {!isConfigured && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          未配置
                        </Badge>
                      )}
                    </div>

                    {/* OAuth Info */}
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Client ID:</span>
                        <span className="font-mono text-xs">
                          {config.clientId ? `${config.clientId.substring(0, 8)}...` : '未设置'}
                        </span>
                      </div>
                      {config.scopes && config.scopes.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500">Scopes:</span>
                          {config.scopes.slice(0, 3).map((scope, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                          {config.scopes.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{config.scopes.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Last Updated */}
                    <div className="text-xs text-gray-400">
                      最后更新: {formatDate(config.updatedAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openConfigDialog(config)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        配置
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              配置 {selectedConfig && getTypeInfo(selectedConfig.type).name}
            </DialogTitle>
            <DialogDescription>
              设置 OAuth 凭证和 API 密钥，以启用此集成平台
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-6">
              {/* OAuth Credentials */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700">OAuth 凭证</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Client ID</Label>
                    <Input
                      value={formData.clientId || ''}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      placeholder="输入 Client ID"
                    />
                  </div>
                  <div>
                    <Label>Client Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSecrets.clientSecret ? 'text' : 'password'}
                        value={formData.clientSecret || ''}
                        onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                        placeholder="输入 Client Secret"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSecret('clientSecret')}
                      >
                        {showSecrets.clientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform-specific fields */}
              {selectedConfig.type === 'zapier' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Zapier 配置</h4>
                  <div>
                    <Label>Webhook Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSecrets.webhookSecret ? 'text' : 'password'}
                        value={formData.webhookSecret || ''}
                        onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                        placeholder="输入 Webhook Secret"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSecret('webhookSecret')}
                      >
                        {showSecrets.webhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedConfig.type === 'shopify' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Shopify 配置</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>API Key</Label>
                      <Input
                        value={formData.apiKey || ''}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="输入 API Key"
                      />
                    </div>
                    <div>
                      <Label>API Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showSecrets.apiSecret ? 'text' : 'password'}
                          value={formData.apiSecret || ''}
                          onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                          placeholder="输入 API Secret"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleSecret('apiSecret')}
                        >
                          {showSecrets.apiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* URLs */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700">回调 URL</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>OAuth Callback URL</Label>
                    <Input
                      value={formData.callbackUrl || ''}
                      onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                      placeholder="https://your-domain.com/auth/callback"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      在第三方平台配置此 URL 作为 OAuth 回调地址
                    </p>
                  </div>
                  <div>
                    <Label>Webhook URL</Label>
                    <Input
                      value={formData.webhookUrl || ''}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://your-domain.com/webhooks/integration"
                    />
                  </div>
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700">权限范围 (Scopes)</h4>
                <Textarea
                  value={(formData.scopes || []).join('\n')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scopes: e.target.value.split('\n').filter(s => s.trim()),
                    })
                  }
                  placeholder="每行一个 scope"
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  每行输入一个权限范围，例如: read_products, write_orders
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 保存敏感凭证确认对话框 */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存配置</AlertDialogTitle>
            <AlertDialogDescription>
              您即将更新 {selectedConfig && getTypeInfo(selectedConfig.type).name} 的集成配置，
              包括可能的 OAuth 凭证（Client Secret、API Secret 等敏感信息）。
              请确保输入的凭证正确无误，错误的凭证可能导致集成功能无法正常工作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>
              {updateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              确认保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ 用户连接 Tab ============

function UserConnectionsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // Fetch integrations
  const { data: integrationsData, isLoading, refetch } = useQuery({
    queryKey: ['integrations', statusFilter, typeFilter, searchTerm],
    queryFn: () => integrationsService.getIntegrations({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      search: searchTerm || undefined,
    }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['integrations-stats'],
    queryFn: () => integrationsService.getStats(),
  });

  // Fetch sync logs for selected integration
  const { data: logsData } = useQuery({
    queryKey: ['integration-logs', selectedIntegration?.id],
    queryFn: () => selectedIntegration ? integrationsService.getSyncLogs(selectedIntegration.id) : null,
    enabled: !!selectedIntegration && showLogsDialog,
  });

  // Mutations
  const syncMutation = useMutation({
    mutationFn: (id: string) => integrationsService.triggerSync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const toggleSyncMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      integrationsService.toggleSync(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsService.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-stats'] });
      setShowDisconnectDialog(false);
      setSelectedIntegration(null);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, any> }) =>
      integrationsService.updateConfig(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowConfigDialog(false);
    },
  });

  const integrations = integrationsData?.data?.items || [];
  const stats = statsData?.data || { total: 0, connected: 0, error: 0, byType: {} };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />已连接</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />未连接</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />错误</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><RefreshCw className="w-3 h-3 mr-1" />同步中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeInfo = (type: string) => {
    return integrationTypes.find(t => t.type === type) ?? integrationTypes[0]!;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总连接数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已连接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">连接错误</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">今日同步</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySyncs || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Types Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {integrationTypes.map((type) => {
          const Icon = type.icon;
          const count = stats.byType?.[type.type] || 0;
          return (
            <Card key={type.type} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setTypeFilter(typeFilter === type.type ? 'all' : type.type)}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${type.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">{type.name}</div>
                    <div className="text-sm text-gray-500">{count} 个连接</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索团队名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">全部状态</option>
              <option value="connected">已连接</option>
              <option value="disconnected">未连接</option>
              <option value="error">错误</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">全部类型</option>
              {integrationTypes.map(t => (
                <option key={t.type} value={t.type}>{t.name}</option>
              ))}
            </select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plug className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无用户集成连接</p>
              <p className="text-sm mt-2">用户在 User Portal 中连接第三方平台后会显示在此处</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>集成类型</TableHead>
                  <TableHead>团队</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>自动同步</TableHead>
                  <TableHead>最后同步</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((integration: Integration) => {
                  const typeInfo = getTypeInfo(integration.type);
                  const Icon = typeInfo.icon;
                  return (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${typeInfo.color}`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{typeInfo.name}</div>
                            <div className="text-sm text-gray-500">{integration.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{integration.teamName || integration.teamId}</TableCell>
                      <TableCell>
                        {getStatusBadge(integration.status)}
                        {integration.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">{integration.errorMessage}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={integration.syncEnabled}
                          onCheckedChange={(checked) =>
                            toggleSyncMutation.mutate({ id: integration.id, enabled: checked })
                          }
                          disabled={integration.status !== 'connected'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(integration.lastSyncAt)}</TableCell>
                      <TableCell>{formatDate(integration.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setShowConfigDialog(true);
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              配置
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => syncMutation.mutate(integration.id)}
                              disabled={integration.status !== 'connected'}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              立即同步
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setShowLogsDialog(true);
                              }}
                            >
                              <History className="w-4 h-4 mr-2" />
                              同步日志
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setShowDisconnectDialog(true);
                              }}
                            >
                              <Unplug className="w-4 h-4 mr-2" />
                              断开连接
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>集成配置</DialogTitle>
            <DialogDescription>
              配置 {selectedIntegration && getTypeInfo(selectedIntegration.type).name} 集成参数
            </DialogDescription>
          </DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4">
              <div>
                <Label>集成名称</Label>
                <Input defaultValue={selectedIntegration.name} disabled />
              </div>
              <div>
                <Label>同步间隔</Label>
                <select className="w-full border rounded-md px-3 py-2 mt-1">
                  <option value="5">每 5 分钟</option>
                  <option value="15">每 15 分钟</option>
                  <option value="30">每 30 分钟</option>
                  <option value="60">每小时</option>
                  <option value="360">每 6 小时</option>
                  <option value="1440">每天</option>
                </select>
              </div>
              <div>
                <Label>同步数据类型</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span>点击事件</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span>转化数据</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span>用户信息</span>
                  </label>
                </div>
              </div>
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={selectedIntegration.config?.webhookUrl || ''}
                    readOnly
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              if (selectedIntegration) {
                updateConfigMutation.mutate({
                  id: selectedIntegration.id,
                  config: selectedIntegration.config,
                });
              }
            }}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>同步日志</DialogTitle>
            <DialogDescription>
              {selectedIntegration && getTypeInfo(selectedIntegration.type).name} 同步历史记录
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>操作</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>处理记录</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>完成时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logsData?.data?.items || []).map((log: SyncLog) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <Badge className="bg-green-100 text-green-800">成功</Badge>
                      ) : log.status === 'failed' ? (
                        <Badge variant="destructive">失败</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">进行中</Badge>
                      )}
                    </TableCell>
                    <TableCell>{log.recordsProcessed}</TableCell>
                    <TableCell>{formatDate(log.startedAt)}</TableCell>
                    <TableCell>{formatDate(log.completedAt)}</TableCell>
                  </TableRow>
                ))}
                {(!logsData?.data?.items || logsData.data.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      暂无同步日志
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogsDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>断开连接</DialogTitle>
            <DialogDescription>
              确定要断开此集成连接吗？断开后将停止数据同步。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedIntegration && disconnectMutation.mutate(selectedIntegration.id)}
            >
              断开连接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ 主组件 ============

export default function IntegrationsPage() {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">第三方集成</h1>
          <p className="text-gray-500">管理集成平台配置和用户连接</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            平台配置
          </TabsTrigger>
          <TabsTrigger value="connections">
            <Plug className="w-4 h-4 mr-2" />
            用户连接
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <PlatformConfigTab />
        </TabsContent>

        <TabsContent value="connections">
          <UserConnectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
