import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHORT_LINK_DOMAIN } from '@/lib/config';
import {
  Search,
  RefreshCw,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Eye,
  Trash2,
  Copy,
  Plus,
  Edit,
  TestTube,
  Webhook,
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
import { notificationsService } from '@/lib/api';

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'slack' | 'webhook';
  subject?: string;
  content: string;
  variables: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationLog {
  id: string;
  type: 'email' | 'sms' | 'push' | 'slack' | 'webhook';
  recipient: string;
  subject?: string;
  status: 'sent' | 'failed' | 'pending' | 'delivered' | 'opened';
  templateId?: string;
  templateName?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  deliveredAt?: string;
}

interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'webhook';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
}

const channelTypes = [
  { type: 'email', name: '邮件', icon: Mail, color: 'bg-blue-500' },
  { type: 'sms', name: '短信', icon: Smartphone, color: 'bg-green-500' },
  { type: 'push', name: '推送', icon: Bell, color: 'bg-purple-500' },
  { type: 'slack', name: 'Slack', icon: MessageSquare, color: 'bg-pink-500' },
  { type: 'webhook', name: 'Webhook', icon: Webhook, color: 'bg-orange-500' },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ subject: '', content: '', type: 'email' });

  // Fetch notification logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['notification-logs', currentPage, statusFilter, typeFilter, searchTerm],
    queryFn: () => notificationsService.getLogs({
      page: currentPage,
      limit: 20,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      search: searchTerm || undefined,
    }),
    enabled: activeTab === 'logs',
  });

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => notificationsService.getTemplates(),
    enabled: activeTab === 'templates',
  });

  // Fetch channels
  const { data: channelsData, isLoading: channelsLoading, refetch: refetchChannels } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: () => notificationsService.getChannels(),
    enabled: activeTab === 'channels',
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: () => notificationsService.getStats(),
  });

  // Mutations
  const sendBroadcastMutation = useMutation({
    mutationFn: (data: { subject: string; content: string; type: string }) =>
      notificationsService.sendBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      setShowBroadcastDialog(false);
      setBroadcastData({ subject: '', content: '', type: 'email' });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => notificationsService.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationTemplate> }) =>
      notificationsService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setShowTemplateDialog(false);
    },
  });

  const toggleChannelMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      notificationsService.toggleChannel(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });

  const testChannelMutation = useMutation({
    mutationFn: (id: string) => notificationsService.testChannel(id),
  });

  const logs = logsData?.data?.items || [];
  const templates = templatesData?.data?.items || [];
  const channels = channelsData?.data?.items || [];
  const stats = statsData?.data || { total: 0, sent: 0, failed: 0, pending: 0, byType: {} };
  const totalPages = logsData?.data?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />已发送</Badge>;
      case 'opened':
        return <Badge className="bg-blue-100 text-blue-800"><Eye className="w-3 h-3 mr-1" />已读</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />待发送</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeInfo = (type: string) => {
    return channelTypes.find(t => t.type === type) ?? channelTypes[0]!;
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
          <h1 className="text-2xl font-bold">通知管理</h1>
          <p className="text-gray-500">管理通知模板、发送记录和通知渠道配置</p>
        </div>
        <Button onClick={() => setShowBroadcastDialog(true)}>
          <Send className="w-4 h-4 mr-2" />
          发送广播
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">今日发送</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTotal || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已发送</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">待发送</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">发送失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">打开率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate || '0'}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">发送记录</TabsTrigger>
          <TabsTrigger value="templates">通知模板</TabsTrigger>
          <TabsTrigger value="channels">渠道配置</TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索收件人..."
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
                  <option value="sent">已发送</option>
                  <option value="delivered">已送达</option>
                  <option value="opened">已读</option>
                  <option value="failed">失败</option>
                  <option value="pending">待发送</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">全部类型</option>
                  {channelTypes.map(t => (
                    <option key={t.type} value={t.type}>{t.name}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => refetchLogs()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无发送记录</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>收件人</TableHead>
                      <TableHead>主题/模板</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>发送时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: NotificationLog) => {
                      const typeInfo = getTypeInfo(log.type);
                      const Icon = typeInfo.icon;
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className={`inline-flex p-2 rounded ${typeInfo.color}`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{log.recipient}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {log.subject || log.templateName || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                            {log.errorMessage && (
                              <div className="text-xs text-red-500 mt-1 truncate max-w-xs">
                                {log.errorMessage}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(log.createdAt)}</TableCell>
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
                                    setSelectedLog(log);
                                    setShowDetailDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                {log.status === 'failed' && (
                                  <DropdownMenuItem
                                    onClick={() => resendMutation.mutate(log.id)}
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    重新发送
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无通知模板</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template: NotificationTemplate) => {
                    const typeInfo = getTypeInfo(template.type);
                    const Icon = typeInfo.icon;
                    return (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded ${typeInfo.color}`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                            </div>
                            {template.isSystem && (
                              <Badge variant="secondary">系统</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            {template.subject || template.content.substring(0, 100)}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {template.variables.slice(0, 3).map(v => (
                              <Badge key={v} variant="outline" className="text-xs">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowTemplateDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              编辑
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {channelsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {channels.map((channel: NotificationChannel) => {
                    const typeInfo = getTypeInfo(channel.type);
                    const Icon = typeInfo.icon;
                    return (
                      <Card key={channel.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg ${typeInfo.color}`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold">{channel.name}</div>
                                <div className="text-sm text-gray-500">{typeInfo.name}</div>
                              </div>
                            </div>
                            <Switch
                              checked={channel.enabled}
                              onCheckedChange={(checked) =>
                                toggleChannelMutation.mutate({ id: channel.id, enabled: checked })
                              }
                            />
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedChannel(channel);
                                setShowChannelDialog(true);
                              }}
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              配置
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testChannelMutation.mutate(channel.id)}
                              disabled={!channel.enabled}
                            >
                              <TestTube className="w-4 h-4 mr-1" />
                              测试
                            </Button>
                          </div>
                          {channel.isDefault && (
                            <Badge className="mt-3" variant="secondary">默认渠道</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>通知详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">类型</Label>
                  <div className="font-medium">{getTypeInfo(selectedLog.type).name}</div>
                </div>
                <div>
                  <Label className="text-gray-500">状态</Label>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">收件人</Label>
                  <div className="font-medium">{selectedLog.recipient}</div>
                </div>
                <div>
                  <Label className="text-gray-500">发送时间</Label>
                  <div className="font-medium">{formatDate(selectedLog.createdAt)}</div>
                </div>
              </div>
              {selectedLog.subject && (
                <div>
                  <Label className="text-gray-500">主题</Label>
                  <div className="font-medium">{selectedLog.subject}</div>
                </div>
              )}
              {selectedLog.templateName && (
                <div>
                  <Label className="text-gray-500">使用模板</Label>
                  <div className="font-medium">{selectedLog.templateName}</div>
                </div>
              )}
              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-gray-500">错误信息</Label>
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                    {selectedLog.errorMessage}
                  </div>
                </div>
              )}
              {selectedLog.deliveredAt && (
                <div>
                  <Label className="text-gray-500">送达时间</Label>
                  <div className="font-medium">{formatDate(selectedLog.deliveredAt)}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
            {selectedLog?.status === 'failed' && (
              <Button onClick={() => {
                resendMutation.mutate(selectedLog.id);
                setShowDetailDialog(false);
              }}>
                重新发送
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑模板</DialogTitle>
            <DialogDescription>
              修改通知模板内容，使用 {"{{变量名}}"} 插入动态内容
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>模板名称</Label>
                <Input defaultValue={selectedTemplate.name} disabled={selectedTemplate.isSystem} />
              </div>
              {selectedTemplate.type === 'email' && (
                <div>
                  <Label>邮件主题</Label>
                  <Input defaultValue={selectedTemplate.subject} />
                </div>
              )}
              <div>
                <Label>模板内容</Label>
                <Textarea
                  defaultValue={selectedTemplate.content}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>可用变量</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedTemplate.variables.map(v => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                    >
                      {`{{${v}}}`}
                      <Copy className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              if (selectedTemplate) {
                updateTemplateMutation.mutate({
                  id: selectedTemplate.id,
                  data: selectedTemplate,
                });
              }
            }}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Config Dialog */}
      <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>渠道配置</DialogTitle>
            <DialogDescription>
              配置 {selectedChannel && getTypeInfo(selectedChannel.type).name} 发送参数
            </DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-4">
              {selectedChannel.type === 'email' && (
                <>
                  <div>
                    <Label>SMTP 服务器</Label>
                    <Input defaultValue={selectedChannel.config?.host} placeholder="smtp.example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>端口</Label>
                      <Input defaultValue={selectedChannel.config?.port} placeholder="587" />
                    </div>
                    <div>
                      <Label>加密方式</Label>
                      <select className="w-full border rounded-md px-3 py-2">
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">无</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>发件人邮箱</Label>
                    <Input defaultValue={selectedChannel.config?.from} placeholder="noreply@example.com" />
                  </div>
                  <div>
                    <Label>发件人名称</Label>
                    <Input defaultValue={selectedChannel.config?.fromName} placeholder={SHORT_LINK_DOMAIN} />
                  </div>
                </>
              )}
              {selectedChannel.type === 'sms' && (
                <>
                  <div>
                    <Label>短信服务商</Label>
                    <select className="w-full border rounded-md px-3 py-2">
                      <option value="aliyun">阿里云短信</option>
                      <option value="tencent">腾讯云短信</option>
                      <option value="twilio">Twilio</option>
                    </select>
                  </div>
                  <div>
                    <Label>Access Key ID</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>Access Key Secret</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>签名</Label>
                    <Input defaultValue={selectedChannel.config?.signName} placeholder={SHORT_LINK_DOMAIN} />
                  </div>
                </>
              )}
              {selectedChannel.type === 'slack' && (
                <>
                  <div>
                    <Label>Webhook URL</Label>
                    <Input
                      defaultValue={selectedChannel.config?.webhookUrl}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                  <div>
                    <Label>默认频道</Label>
                    <Input defaultValue={selectedChannel.config?.channel} placeholder="#general" />
                  </div>
                </>
              )}
              {selectedChannel.type === 'webhook' && (
                <>
                  <div>
                    <Label>Webhook URL</Label>
                    <Input
                      defaultValue={selectedChannel.config?.url}
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                  <div>
                    <Label>请求头</Label>
                    <Textarea
                      defaultValue={JSON.stringify(selectedChannel.config?.headers || {}, null, 2)}
                      rows={4}
                      className="font-mono text-sm"
                      placeholder='{"Authorization": "Bearer xxx"}'
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelDialog(false)}>
              取消
            </Button>
            <Button>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>发送广播通知</DialogTitle>
            <DialogDescription>
              向所有用户发送广播消息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>通知类型</Label>
              <select
                value={broadcastData.type}
                onChange={(e) => setBroadcastData(d => ({ ...d, type: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 mt-1"
              >
                <option value="email">邮件</option>
                <option value="push">推送通知</option>
              </select>
            </div>
            <div>
              <Label>标题</Label>
              <Input
                value={broadcastData.subject}
                onChange={(e) => setBroadcastData(d => ({ ...d, subject: e.target.value }))}
                placeholder="通知标题"
              />
            </div>
            <div>
              <Label>内容</Label>
              <Textarea
                value={broadcastData.content}
                onChange={(e) => setBroadcastData(d => ({ ...d, content: e.target.value }))}
                rows={6}
                placeholder="通知内容..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => sendBroadcastMutation.mutate(broadcastData)}
              disabled={!broadcastData.subject || !broadcastData.content}
            >
              <Send className="w-4 h-4 mr-2" />
              发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
