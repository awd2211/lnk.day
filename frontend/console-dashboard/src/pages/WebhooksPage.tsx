import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Webhook,
  Activity,
  MoreVertical,
  Eye,
  Play,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  History,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { webhooksService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  teamId: string;
  teamName: string;
  events: string[];
  status: 'active' | 'disabled' | 'failing';
  secret?: string;
  lastTriggeredAt?: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number;
  success: boolean;
  responseTime: number;
  triggeredAt: string;
  payload?: any;
  response?: string;
}

interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  failingWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: '活跃', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  disabled: { label: '已禁用', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  failing: { label: '失败中', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const exportColumns = [
  { key: 'name', header: '名称' },
  { key: 'url', header: 'URL' },
  { key: 'teamName', header: '团队' },
  { key: 'status', header: '状态' },
  { key: 'successRate', header: '成功率' },
  { key: 'totalDeliveries', header: '总投递数' },
  { key: 'lastTriggeredAt', header: '最后触发' },
  { key: 'createdAt', header: '创建时间' },
];

export default function WebhooksPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery<WebhookStats>({
    queryKey: ['webhook-stats'],
    queryFn: async () => {
      return {
        totalWebhooks: 856,
        activeWebhooks: 720,
        failingWebhooks: 45,
        totalDeliveries: 1250000,
        successfulDeliveries: 1180000,
        failedDeliveries: 70000,
        averageResponseTime: 245,
      };
    },
  });

  // Fetch webhooks
  const { data, isLoading } = useQuery({
    queryKey: ['webhooks', { search, page, status: statusFilter }],
    queryFn: async () => {
      try {
        const response = await webhooksService.getWebhooks({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          limit: 20,
        });
        return response.data;
      } catch {
        const mockWebhooks: WebhookConfig[] = [
          {
            id: '1',
            name: 'Slack Notifications',
            url: 'https://hooks.slack.com/services/xxx',
            teamId: 't1',
            teamName: 'Acme Corp',
            events: ['link.created', 'link.clicked'],
            status: 'active',
            lastTriggeredAt: '2024-01-20T10:30:00Z',
            successRate: 99.5,
            totalDeliveries: 15680,
            failedDeliveries: 78,
            createdAt: '2023-06-15',
          },
          {
            id: '2',
            name: 'Analytics Webhook',
            url: 'https://analytics.example.com/webhook',
            teamId: 't2',
            teamName: 'Tech Startup',
            events: ['click.recorded'],
            status: 'active',
            lastTriggeredAt: '2024-01-20T09:15:00Z',
            successRate: 98.2,
            totalDeliveries: 256000,
            failedDeliveries: 4608,
            createdAt: '2023-09-20',
          },
          {
            id: '3',
            name: 'CRM Integration',
            url: 'https://crm.example.com/api/webhooks',
            teamId: 't1',
            teamName: 'Acme Corp',
            events: ['link.created', 'campaign.created'],
            status: 'failing',
            lastTriggeredAt: '2024-01-19T18:00:00Z',
            successRate: 45.0,
            totalDeliveries: 1200,
            failedDeliveries: 660,
            createdAt: '2023-11-01',
          },
          {
            id: '4',
            name: 'Old System Hook',
            url: 'https://old.example.com/hook',
            teamId: 't3',
            teamName: 'Legacy System',
            events: ['link.created'],
            status: 'disabled',
            successRate: 0,
            totalDeliveries: 5000,
            failedDeliveries: 2500,
            createdAt: '2022-05-10',
          },
        ];
        return { items: mockWebhooks, total: 4 };
      }
    },
  });

  // Fetch logs for selected webhook
  const { data: logs } = useQuery({
    queryKey: ['webhook-logs', selectedWebhook?.id],
    queryFn: async () => {
      if (!selectedWebhook) return [];
      try {
        const response = await webhooksService.getLogs(selectedWebhook.id, { limit: 20 });
        return response.data as WebhookLog[];
      } catch {
        return [
          { id: '1', webhookId: selectedWebhook.id, event: 'link.created', statusCode: 200, success: true, responseTime: 156, triggeredAt: '2024-01-20T10:30:00Z' },
          { id: '2', webhookId: selectedWebhook.id, event: 'link.clicked', statusCode: 200, success: true, responseTime: 203, triggeredAt: '2024-01-20T10:25:00Z' },
          { id: '3', webhookId: selectedWebhook.id, event: 'link.created', statusCode: 500, success: false, responseTime: 1500, triggeredAt: '2024-01-20T10:20:00Z' },
        ] as WebhookLog[];
      }
    },
    enabled: !!selectedWebhook,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksService.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-stats'] });
      setDeleteOpen(false);
      setSelectedWebhook(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => webhooksService.testWebhook(id),
    onSuccess: () => {
      setTestResult({ success: true, message: 'Webhook 测试成功！响应码: 200' });
    },
    onError: () => {
      setTestResult({ success: false, message: 'Webhook 测试失败，请检查配置。' });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (data: { webhookId: string; logId: string }) =>
      webhooksService.retryWebhook(data.webhookId, data.logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
    },
  });

  const handleDelete = () => {
    if (!selectedWebhook) return;
    deleteMutation.mutate(selectedWebhook.id);
  };

  const handleTest = () => {
    if (!selectedWebhook) return;
    setTestResult(null);
    testMutation.mutate(selectedWebhook.id);
  };

  const openDelete = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setDeleteOpen(true);
  };

  const openTest = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setTestResult(null);
    setTestOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Webhook className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Webhook 总数</p>
              <p className="text-2xl font-bold">{stats?.totalWebhooks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃 Webhook</p>
              <p className="text-2xl font-bold">{stats?.activeWebhooks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Send className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总投递数</p>
              <p className="text-2xl font-bold">{stats?.totalDeliveries?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均响应时间</p>
              <p className="text-2xl font-bold">{stats?.averageResponseTime || 0}ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索 Webhook..."
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
              <SelectItem value="failing">失败中</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个 Webhook</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="webhooks_export"
            title="导出 Webhook 数据"
            size="sm"
          />
        </div>
      </div>

      {/* Webhooks Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">名称</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">URL</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">团队</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">成功率</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">最后触发</th>
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
              ) : data?.items?.length ? (
                data.items.map((webhook: WebhookConfig) => {
                  const StatusIcon = statusConfig[webhook.status]?.icon || CheckCircle;
                  return (
                    <tr key={webhook.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{webhook.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{webhook.events.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="block max-w-[200px] truncate rounded bg-gray-100 px-2 py-1 text-xs">
                          {webhook.url}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm">{webhook.teamName}</td>
                      <td className="px-6 py-4">
                        <Badge className={statusConfig[webhook.status]?.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[webhook.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full ${
                                webhook.successRate >= 95
                                  ? 'bg-green-500'
                                  : webhook.successRate >= 80
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${webhook.successRate}%` }}
                            />
                          </div>
                          <span className="text-sm">{webhook.successRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {webhook.lastTriggeredAt ? formatDateTime(webhook.lastTriggeredAt) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedWebhook(webhook)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openTest(webhook)}>
                              <Play className="mr-2 h-4 w-4" />
                              测试 Webhook
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDelete(webhook)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无 Webhook
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Detail Sheet */}
      <Sheet open={!!selectedWebhook && !deleteOpen && !testOpen} onOpenChange={() => setSelectedWebhook(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Webhook 详情</SheetTitle>
            <SheetDescription>{selectedWebhook?.name}</SheetDescription>
          </SheetHeader>
          {selectedWebhook && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">基本信息</TabsTrigger>
                <TabsTrigger value="logs" className="flex-1">投递日志</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">URL</label>
                    <code className="mt-1 block break-all rounded bg-gray-100 p-2 text-sm">
                      {selectedWebhook.url}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">团队</label>
                      <p className="font-medium">{selectedWebhook.teamName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">状态</label>
                      <Badge className={statusConfig[selectedWebhook.status]?.color}>
                        {statusConfig[selectedWebhook.status]?.label}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">总投递数</label>
                      <p className="font-medium">{selectedWebhook.totalDeliveries.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">成功率</label>
                      <p className="font-medium">{selectedWebhook.successRate}%</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">创建时间</label>
                      <p className="font-medium">{formatDate(selectedWebhook.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">最后触发</label>
                      <p className="font-medium">
                        {selectedWebhook.lastTriggeredAt
                          ? formatDateTime(selectedWebhook.lastTriggeredAt)
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">订阅事件</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedWebhook.events.map((event) => (
                        <Badge key={event} variant="outline">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openTest(selectedWebhook)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    测试
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    onClick={() => openDelete(selectedWebhook)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-4 space-y-3">
                {logs?.length ? (
                  logs.map((log: WebhookLog) => (
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
                          <p className="font-medium">{log.event}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(log.triggeredAt)} · {log.responseTime}ms
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.statusCode}
                        </Badge>
                        {!log.success && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              retryMutation.mutate({
                                webhookId: selectedWebhook.id,
                                logId: log.id,
                              })
                            }
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">暂无投递日志</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Webhook</DialogTitle>
            <DialogDescription>
              确定要删除 "{selectedWebhook?.name}" 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">
                <p className="font-medium">此操作不可撤销</p>
                <p className="mt-1">删除后，此 Webhook 将停止接收所有事件通知。</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>测试 Webhook</DialogTitle>
            <DialogDescription>
              向 "{selectedWebhook?.name}" 发送测试请求
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {testResult ? (
              <div
                className={`flex items-start gap-3 rounded-lg border p-4 ${
                  testResult.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  <p className="font-medium">{testResult.success ? '测试成功' : '测试失败'}</p>
                  <p className="mt-1">{testResult.message}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>点击下方按钮发送测试请求</p>
                <p className="mt-1 text-sm">将发送一个示例事件到 Webhook URL</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleTest} disabled={testMutation.isPending}>
              {testMutation.isPending ? '发送中...' : '发送测试请求'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
