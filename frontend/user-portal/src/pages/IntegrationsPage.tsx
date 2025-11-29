import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  useIntegrations,
  useAvailableIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useSyncIntegration,
  useNotificationChannels,
  useCreateNotificationChannel,
  useUpdateNotificationChannel,
  useDeleteNotificationChannel,
  useToggleNotificationChannel,
  useTestNotificationChannel,
  useNotificationEvents,
  Integration,
  NotificationChannel,
} from '@/hooks/useIntegrations';
import { EmptyState } from '@/components/EmptyState';
import {
  Plug,
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  Send,
  Zap,
  BarChart3,
  ShoppingBag,
  Users,
} from 'lucide-react';

// 集成图标映射
const integrationIcons: Record<string, any> = {
  zapier: Zap,
  hubspot: Users,
  salesforce: Users,
  shopify: ShoppingBag,
  slack: MessageSquare,
  teams: MessageSquare,
  google_analytics: BarChart3,
  facebook_pixel: BarChart3,
  custom: Settings,
};

// 通知渠道图标映射
const channelIcons: Record<string, any> = {
  email: Mail,
  slack: MessageSquare,
  teams: MessageSquare,
  sms: Smartphone,
  webhook: Webhook,
  push: Bell,
};

function IntegrationCard({
  integration,
  onDisconnect,
  onSync,
  onConfigure,
}: {
  integration: Integration;
  onDisconnect: () => void;
  onSync: () => void;
  onConfigure: () => void;
}) {
  const Icon = integrationIcons[integration.type] || Plug;

  const getStatusBadge = () => {
    switch (integration.status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />已连接</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />错误</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />连接中</Badge>;
      default:
        return <Badge variant="outline">未连接</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${integration.status === 'connected' ? 'bg-green-100' : 'bg-muted'}`}>
              <Icon className={`h-6 w-6 ${integration.status === 'connected' ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">{integration.name}</h3>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        {integration.description && (
          <p className="text-sm text-muted-foreground mt-3">{integration.description}</p>
        )}

        {integration.status === 'error' && integration.errorMessage && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            {integration.errorMessage}
          </div>
        )}

        {integration.lastSyncAt && (
          <p className="text-xs text-muted-foreground mt-3">
            上次同步: {new Date(integration.lastSyncAt).toLocaleString()}
          </p>
        )}

        <div className="flex gap-2 mt-4 pt-4 border-t">
          {integration.status === 'connected' && (
            <>
              <Button size="sm" variant="outline" onClick={onSync}>
                <RefreshCw className="h-4 w-4 mr-1" />
                同步
              </Button>
              <Button size="sm" variant="outline" onClick={onConfigure}>
                <Settings className="h-4 w-4 mr-1" />
                配置
              </Button>
            </>
          )}
          <Button size="sm" variant="destructive" onClick={onDisconnect}>
            <Trash2 className="h-4 w-4 mr-1" />
            断开
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AvailableIntegrationCard({
  integration,
  onConnect,
  isConnecting,
}: {
  integration: any;
  onConnect: () => void;
  isConnecting: boolean;
}) {
  const Icon = integrationIcons[integration.type] || Plug;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{integration.name}</h3>
            <Badge variant="outline">{integration.category}</Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3">{integration.description}</p>

        {integration.features && (
          <div className="flex flex-wrap gap-1 mt-3">
            {integration.features.slice(0, 3).map((feature: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">{feature}</Badge>
            ))}
          </div>
        )}

        <Button className="w-full mt-4" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          连接
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationChannelCard({
  channel,
  onEdit,
  onDelete,
  onToggle,
  onTest,
}: {
  channel: NotificationChannel;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTest: () => void;
}) {
  const Icon = channelIcons[channel.type] || Bell;

  return (
    <Card className={`hover:shadow-md transition-shadow ${!channel.enabled ? 'opacity-60' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-blue-100' : 'bg-muted'}`}>
              <Icon className={`h-5 w-5 ${channel.enabled ? 'text-blue-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">{channel.name}</h3>
              <Badge variant="outline">{channel.type}</Badge>
            </div>
          </div>
          <Switch checked={channel.enabled} onCheckedChange={onToggle} />
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {channel.events.slice(0, 3).map((event, index) => (
            <Badge key={index} variant="secondary" className="text-xs">{event}</Badge>
          ))}
          {channel.events.length > 3 && (
            <Badge variant="secondary" className="text-xs">+{channel.events.length - 3}</Badge>
          )}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button size="sm" variant="outline" onClick={onTest}>
            <Send className="h-4 w-4 mr-1" />
            测试
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Settings className="h-4 w-4 mr-1" />
            编辑
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<NotificationChannel | null>(null);
  const [disconnectingIntegration, setDisconnectingIntegration] = useState<Integration | null>(null);
  const [channelFormData, setChannelFormData] = useState({
    name: '',
    type: 'email' as NotificationChannel['type'],
    config: {} as Record<string, any>,
    events: [] as string[],
    enabled: true,
  });

  const { data: integrations, isLoading: integrationsLoading } = useIntegrations();
  const { data: availableIntegrations } = useAvailableIntegrations();
  const { data: channels, isLoading: channelsLoading } = useNotificationChannels();
  const { data: notificationEvents } = useNotificationEvents();

  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();
  const syncIntegration = useSyncIntegration();
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  const toggleChannel = useToggleNotificationChannel();
  const testChannel = useTestNotificationChannel();

  const connectedIntegrations = integrations?.filter(i => i.status === 'connected' || i.status === 'error');
  const availableToConnect = availableIntegrations?.filter(
    a => !integrations?.some(i => i.type === a.type && i.status === 'connected')
  );

  const handleConnect = (type: string) => {
    connectIntegration.mutate({ type: type as Integration['type'] }, {
      onSuccess: (data) => {
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          toast({ title: '集成已连接' });
        }
      },
      onError: () => {
        toast({ title: '连接失败', variant: 'destructive' });
      },
    });
  };

  const handleDisconnect = () => {
    if (!disconnectingIntegration) return;

    disconnectIntegration.mutate(disconnectingIntegration.id, {
      onSuccess: () => {
        toast({ title: '集成已断开' });
        setDisconnectingIntegration(null);
      },
    });
  };

  const handleSync = (integration: Integration) => {
    syncIntegration.mutate(integration.id, {
      onSuccess: () => {
        toast({ title: '同步完成' });
      },
    });
  };

  const handleCreateChannel = () => {
    if (!channelFormData.name.trim()) {
      toast({ title: '请输入渠道名称', variant: 'destructive' });
      return;
    }

    createChannel.mutate(channelFormData, {
      onSuccess: () => {
        toast({ title: '通知渠道已创建' });
        setIsCreateChannelOpen(false);
        resetChannelForm();
      },
    });
  };

  const handleUpdateChannel = () => {
    if (!editingChannel) return;

    updateChannel.mutate({
      id: editingChannel.id,
      data: channelFormData,
    }, {
      onSuccess: () => {
        toast({ title: '通知渠道已更新' });
        setEditingChannel(null);
        resetChannelForm();
      },
    });
  };

  const handleDeleteChannel = () => {
    if (!deletingChannel) return;

    deleteChannel.mutate(deletingChannel.id, {
      onSuccess: () => {
        toast({ title: '通知渠道已删除' });
        setDeletingChannel(null);
      },
    });
  };

  const handleToggleChannel = (channel: NotificationChannel) => {
    toggleChannel.mutate({
      id: channel.id,
      enabled: !channel.enabled,
    }, {
      onSuccess: () => {
        toast({ title: channel.enabled ? '渠道已禁用' : '渠道已启用' });
      },
    });
  };

  const handleTestChannel = (channel: NotificationChannel) => {
    testChannel.mutate(channel.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast({ title: '测试消息已发送' });
        } else {
          toast({ title: '测试失败', description: result.message, variant: 'destructive' });
        }
      },
    });
  };

  const resetChannelForm = () => {
    setChannelFormData({
      name: '',
      type: 'email',
      config: {},
      events: [],
      enabled: true,
    });
  };

  const openEditChannel = (channel: NotificationChannel) => {
    setChannelFormData({
      name: channel.name,
      type: channel.type,
      config: channel.config,
      events: channel.events,
      enabled: channel.enabled,
    });
    setEditingChannel(channel);
  };

  const getChannelConfigFields = (type: string) => {
    switch (type) {
      case 'email':
        return [{ key: 'email', label: '邮箱地址', type: 'email' }];
      case 'slack':
        return [{ key: 'webhookUrl', label: 'Webhook URL', type: 'url' }];
      case 'teams':
        return [{ key: 'webhookUrl', label: 'Webhook URL', type: 'url' }];
      case 'sms':
        return [{ key: 'phoneNumber', label: '手机号码', type: 'tel' }];
      case 'webhook':
        return [
          { key: 'url', label: 'Webhook URL', type: 'url' },
          { key: 'secret', label: '签名密钥（可选）', type: 'password' },
        ];
      default:
        return [];
    }
  };

  if (integrationsLoading || channelsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">集成与通知</h1>
          <p className="text-muted-foreground mt-1">连接第三方服务并配置通知渠道</p>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations">第三方集成</TabsTrigger>
            <TabsTrigger value="notifications">通知渠道</TabsTrigger>
          </TabsList>

          {/* 第三方集成 */}
          <TabsContent value="integrations" className="space-y-6">
            {/* 已连接的集成 */}
            {connectedIntegrations && connectedIntegrations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">已连接</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connectedIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onDisconnect={() => setDisconnectingIntegration(integration)}
                      onSync={() => handleSync(integration)}
                      onConfigure={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 可用的集成 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">可用集成</h2>
              {availableToConnect && availableToConnect.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableToConnect.map((integration) => (
                    <AvailableIntegrationCard
                      key={integration.type}
                      integration={integration}
                      onConnect={() => handleConnect(integration.type)}
                      isConnecting={connectIntegration.isPending}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    所有可用集成都已连接
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 通知渠道 */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">通知渠道</h2>
              <Button onClick={() => setIsCreateChannelOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加渠道
              </Button>
            </div>

            {channels?.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="还没有通知渠道"
                description="添加通知渠道以接收重要事件通知"
                action={{
                  label: '添加第一个渠道',
                  onClick: () => setIsCreateChannelOpen(true),
                  icon: Plus,
                }}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {channels?.map((channel) => (
                  <NotificationChannelCard
                    key={channel.id}
                    channel={channel}
                    onEdit={() => openEditChannel(channel)}
                    onDelete={() => setDeletingChannel(channel)}
                    onToggle={() => handleToggleChannel(channel)}
                    onTest={() => handleTestChannel(channel)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 创建/编辑通知渠道对话框 */}
      <Dialog
        open={isCreateChannelOpen || !!editingChannel}
        onOpenChange={() => {
          setIsCreateChannelOpen(false);
          setEditingChannel(null);
          resetChannelForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChannel ? '编辑通知渠道' : '添加通知渠道'}</DialogTitle>
            <DialogDescription>配置通知接收方式和触发事件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="channel-name">渠道名称</Label>
              <Input
                id="channel-name"
                value={channelFormData.name}
                onChange={(e) => setChannelFormData({ ...channelFormData, name: e.target.value })}
                placeholder="例如：团队Slack通知"
              />
            </div>

            <div className="space-y-2">
              <Label>渠道类型</Label>
              <Select
                value={channelFormData.type}
                onValueChange={(value) => setChannelFormData({
                  ...channelFormData,
                  type: value as NotificationChannel['type'],
                  config: {},
                })}
                disabled={!!editingChannel}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      邮件
                    </div>
                  </SelectItem>
                  <SelectItem value="slack">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Slack
                    </div>
                  </SelectItem>
                  <SelectItem value="teams">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Microsoft Teams
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      短信
                    </div>
                  </SelectItem>
                  <SelectItem value="webhook">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhook
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 动态配置字段 */}
            {getChannelConfigFields(channelFormData.type).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  value={channelFormData.config[field.key] || ''}
                  onChange={(e) => setChannelFormData({
                    ...channelFormData,
                    config: { ...channelFormData.config, [field.key]: e.target.value },
                  })}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label>触发事件</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                {(notificationEvents || [
                  { event: 'link.created', name: '链接创建', description: '创建新短链接时触发' },
                  { event: 'link.clicked', name: '链接点击', description: '短链接被点击时触发' },
                  { event: 'goal.completed', name: '目标完成', description: '营销目标达成时触发' },
                  { event: 'goal.milestone', name: '目标里程碑', description: '目标达到里程碑时触发' },
                  { event: 'campaign.started', name: '活动开始', description: '营销活动开始时触发' },
                  { event: 'campaign.ended', name: '活动结束', description: '营销活动结束时触发' },
                  { event: 'quota.warning', name: '配额警告', description: '使用量接近上限时触发' },
                  { event: 'security.alert', name: '安全警报', description: '检测到可疑活动时触发' },
                ]).map((event) => (
                  <div key={event.event} className="flex items-start space-x-3">
                    <Checkbox
                      id={event.event}
                      checked={channelFormData.events.includes(event.event)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setChannelFormData({
                            ...channelFormData,
                            events: [...channelFormData.events, event.event],
                          });
                        } else {
                          setChannelFormData({
                            ...channelFormData,
                            events: channelFormData.events.filter(e => e !== event.event),
                          });
                        }
                      }}
                    />
                    <div>
                      <Label htmlFor={event.event} className="cursor-pointer font-medium">
                        {event.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>启用渠道</Label>
                <p className="text-sm text-muted-foreground">立即开始接收通知</p>
              </div>
              <Switch
                checked={channelFormData.enabled}
                onCheckedChange={(checked) => setChannelFormData({ ...channelFormData, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateChannelOpen(false);
              setEditingChannel(null);
              resetChannelForm();
            }}>
              取消
            </Button>
            <Button
              onClick={editingChannel ? handleUpdateChannel : handleCreateChannel}
              disabled={createChannel.isPending || updateChannel.isPending}
            >
              {(createChannel.isPending || updateChannel.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingChannel ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 断开集成确认 */}
      <AlertDialog open={!!disconnectingIntegration} onOpenChange={() => setDisconnectingIntegration(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认断开集成？</AlertDialogTitle>
            <AlertDialogDescription>
              断开 "{disconnectingIntegration?.name}" 后，相关的自动化和数据同步将停止。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
              断开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除通知渠道确认 */}
      <AlertDialog open={!!deletingChannel} onOpenChange={() => setDeletingChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除通知渠道？</AlertDialogTitle>
            <AlertDialogDescription>
              删除 "{deletingChannel?.name}" 后将无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChannel} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
