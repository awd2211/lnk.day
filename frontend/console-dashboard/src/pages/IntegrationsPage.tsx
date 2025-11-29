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
import { integrationsService } from '@/lib/api';

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

export default function IntegrationsPage() {
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">第三方集成</h1>
          <p className="text-gray-500">管理 Zapier、HubSpot、Salesforce、Shopify 等平台的集成连接</p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">总集成数</CardTitle>
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
              <p>暂无集成连接</p>
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
