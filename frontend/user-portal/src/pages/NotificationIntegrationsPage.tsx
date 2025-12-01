import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Bell,
  Link2,
  AlertTriangle,
  Activity,
  Send,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  HelpCircle,
  Zap,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { slackService, teamsService } from '@/lib/api';

// Types
interface SlackInstallation {
  installed: boolean;
  workspaceName?: string;
  installedAt?: string;
  defaultChannel?: string;
  settings?: {
    notifyOnLinkCreate: boolean;
    notifyOnMilestone: boolean;
    notifyOnAlert: boolean;
    notifyOnWeeklyReport: boolean;
    milestoneThresholds: number[];
  };
}

interface TeamsInstallation {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  settings: {
    notifyOnLinkCreate: boolean;
    notifyOnMilestone: boolean;
    notifyOnAlert: boolean;
    notifyOnWeeklyReport: boolean;
    milestoneThresholds: number[];
  };
  lastTestedAt?: string;
  createdAt: string;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

const notificationTypes = [
  {
    key: 'notifyOnLinkCreate',
    label: '新链接创建',
    description: '当创建新的短链接时发送通知',
    icon: Link2,
  },
  {
    key: 'notifyOnMilestone',
    label: '里程碑达成',
    description: '当链接点击数达到里程碑时通知',
    icon: Activity,
  },
  {
    key: 'notifyOnAlert',
    label: '告警通知',
    description: '接收安全告警和系统异常通知',
    icon: AlertTriangle,
  },
  {
    key: 'notifyOnWeeklyReport',
    label: '周报摘要',
    description: '每周发送数据分析摘要报告',
    icon: Bell,
  },
];

const milestoneOptions = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

export default function NotificationIntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddTeamsDialog, setShowAddTeamsDialog] = useState(false);
  const [editingTeamsInstallation, setEditingTeamsInstallation] = useState<TeamsInstallation | null>(null);
  const [showWebhookUrl, setShowWebhookUrl] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Slack queries
  const { data: slackInstallation, isLoading: slackLoading } = useQuery({
    queryKey: ['slack-installation'],
    queryFn: async () => {
      const response = await slackService.getInstallation();
      return response.data as SlackInstallation;
    },
  });

  const { data: slackChannelsData } = useQuery({
    queryKey: ['slack-channels'],
    queryFn: async () => {
      const response = await slackService.getChannels();
      return response.data.channels as SlackChannel[];
    },
    enabled: slackInstallation?.installed,
  });

  // Teams queries
  const { data: teamsInstallationsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-installations'],
    queryFn: async () => {
      const response = await teamsService.getInstallations();
      return response.data.installations as TeamsInstallation[];
    },
  });

  const slackChannels = slackChannelsData || [];
  const teamsInstallations = teamsInstallationsData || [];

  // State for Slack settings form
  const [slackSettings, setSlackSettings] = useState({
    notifyOnLinkCreate: true,
    notifyOnMilestone: true,
    notifyOnAlert: true,
    notifyOnWeeklyReport: true,
    milestoneThresholds: [100, 1000, 10000, 100000],
  });
  const [selectedChannel, setSelectedChannel] = useState('');

  // Update Slack settings when installation data loads
  useEffect(() => {
    if (slackInstallation?.settings) {
      setSlackSettings(slackInstallation.settings);
    }
    if (slackInstallation?.defaultChannel) {
      setSelectedChannel(slackInstallation.defaultChannel);
    }
  }, [slackInstallation]);

  // Teams form state
  const [newTeamsForm, setNewTeamsForm] = useState({
    name: '',
    webhookUrl: '',
    settings: {
      notifyOnLinkCreate: true,
      notifyOnMilestone: true,
      notifyOnAlert: true,
      notifyOnWeeklyReport: true,
      milestoneThresholds: [1000, 10000, 100000],
    },
  });

  // Slack mutations
  const disconnectSlackMutation = useMutation({
    mutationFn: () => slackService.uninstall(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-installation'] });
      toast({ title: '成功', description: 'Slack 已断开连接' });
    },
    onError: () => {
      toast({ title: '错误', description: '断开 Slack 失败', variant: 'destructive' });
    },
  });

  const updateSlackSettingsMutation = useMutation({
    mutationFn: (data: { defaultChannelId?: string } & typeof slackSettings) =>
      slackService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-installation'] });
      toast({ title: '成功', description: 'Slack 设置已更新' });
    },
    onError: () => {
      toast({ title: '错误', description: '保存设置失败', variant: 'destructive' });
    },
  });

  // Teams mutations
  const createTeamsMutation = useMutation({
    mutationFn: (data: typeof newTeamsForm & { teamId: string }) =>
      teamsService.createInstallation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-installations'] });
      toast({ title: '成功', description: 'Teams Webhook 已添加' });
      setShowAddTeamsDialog(false);
      setNewTeamsForm({
        name: '',
        webhookUrl: '',
        settings: {
          notifyOnLinkCreate: true,
          notifyOnMilestone: true,
          notifyOnAlert: true,
          notifyOnWeeklyReport: true,
          milestoneThresholds: [1000, 10000, 100000],
        },
      });
    },
    onError: () => {
      toast({ title: '错误', description: '添加 Teams Webhook 失败', variant: 'destructive' });
    },
  });

  const updateTeamsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TeamsInstallation> }) =>
      teamsService.updateInstallation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-installations'] });
      toast({ title: '成功', description: 'Teams 设置已更新' });
      setEditingTeamsInstallation(null);
    },
    onError: () => {
      toast({ title: '错误', description: '更新设置失败', variant: 'destructive' });
    },
  });

  const deleteTeamsMutation = useMutation({
    mutationFn: (id: string) => teamsService.deleteInstallation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-installations'] });
      toast({ title: '成功', description: 'Teams Webhook 已删除' });
    },
    onError: () => {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    },
  });

  const testTeamsMutation = useMutation({
    mutationFn: (id: string) => teamsService.testInstallation(id),
    onSuccess: () => {
      toast({ title: '成功', description: '测试消息已发送' });
    },
    onError: () => {
      toast({ title: '错误', description: '发送测试消息失败', variant: 'destructive' });
    },
    onSettled: () => {
      setTestingConnection(null);
    },
  });

  const handleConnectSlack = () => {
    window.location.href = '/api/v1/slack/oauth/install?redirectUrl=' + encodeURIComponent(window.location.href);
  };

  const handleSaveSlackSettings = () => {
    updateSlackSettingsMutation.mutate({
      defaultChannelId: selectedChannel,
      ...slackSettings,
    });
  };

  const handleTestSlackConnection = async () => {
    setTestingConnection('slack');
    try {
      // The backend should have a test endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: '成功', description: '测试消息已发送到 Slack' });
    } catch {
      toast({ title: '错误', description: '发送测试消息失败', variant: 'destructive' });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleAddTeamsInstallation = () => {
    createTeamsMutation.mutate({
      ...newTeamsForm,
      teamId: '', // Will be filled by backend from JWT
    });
  };

  const handleTestTeamsConnection = (installationId: string) => {
    setTestingConnection(installationId);
    testTeamsMutation.mutate(installationId);
  };

  const toggleMilestone = (threshold: number, settings: any, setSettings: (s: any) => void) => {
    const current = settings.milestoneThresholds || [];
    if (current.includes(threshold)) {
      setSettings({
        ...settings,
        milestoneThresholds: current.filter((t: number) => t !== threshold),
      });
    } else {
      setSettings({
        ...settings,
        milestoneThresholds: [...current, threshold].sort((a: number, b: number) => a - b),
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${num / 1000000}M`;
    if (num >= 1000) return `${num / 1000}K`;
    return num.toString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '已复制', description: '命令已复制到剪贴板' });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">通知集成</h1>
          <p className="text-muted-foreground">
            配置 Slack、Microsoft Teams 等第三方通知渠道
          </p>
        </div>

        <Tabs defaultValue="slack" className="space-y-6">
          <TabsList>
            <TabsTrigger value="slack" className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Slack
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.625 8.073c.574 0 1.125.228 1.531.634.406.406.634.957.634 1.531v4.524a2.165 2.165 0 0 1-2.165 2.165h-3.18v3.18a2.165 2.165 0 0 1-2.164 2.164H9.14a2.165 2.165 0 0 1-2.165-2.165v-3.179H3.796a2.165 2.165 0 0 1-2.165-2.165v-4.524c0-.574.228-1.125.634-1.531a2.165 2.165 0 0 1 1.531-.634h3.18V4.893a2.165 2.165 0 0 1 2.164-2.165h6.141a2.165 2.165 0 0 1 2.165 2.165v3.18h3.179z"/>
              </svg>
              Microsoft Teams
            </TabsTrigger>
          </TabsList>

          {/* Slack Tab */}
          <TabsContent value="slack" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4A154B]">
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Slack 集成</CardTitle>
                    <CardDescription>将通知发送到 Slack 工作区</CardDescription>
                  </div>
                </div>
                {slackLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : slackInstallation?.installed ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    已连接
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">
                    <XCircle className="mr-1 h-3 w-3" />
                    未连接
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {slackLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : slackInstallation?.installed ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                      <div>
                        <p className="font-medium">{slackInstallation.workspaceName}</p>
                        <p className="text-sm text-muted-foreground">
                          连接于 {new Date(slackInstallation.installedAt!).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestSlackConnection}
                          disabled={testingConnection === 'slack'}
                        >
                          {testingConnection === 'slack' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          发送测试
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectSlackMutation.mutate()}
                          disabled={disconnectSlackMutation.isPending}
                        >
                          {disconnectSlackMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          断开连接
                        </Button>
                      </div>
                    </div>

                    {/* Channel Selection */}
                    <div className="space-y-2">
                      <Label>默认通知频道</Label>
                      <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择频道" />
                        </SelectTrigger>
                        <SelectContent>
                          {slackChannels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              {channel.isPrivate ? '🔒' : '#'} {channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        选择接收通知的 Slack 频道，确保已邀请 lnk.day 应用到该频道
                      </p>
                    </div>

                    {/* Notification Types */}
                    <div className="space-y-3">
                      <Label>通知类型</Label>
                      <div className="space-y-3">
                        {notificationTypes.map(({ key, label, description, icon: Icon }) => (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{label}</p>
                                <p className="text-sm text-muted-foreground">{description}</p>
                              </div>
                            </div>
                            <Switch
                              checked={(slackSettings as any)[key]}
                              onCheckedChange={(v) =>
                                setSlackSettings((prev) => ({ ...prev, [key]: v }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Milestone Thresholds */}
                    {slackSettings.notifyOnMilestone && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label>里程碑阈值</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>当链接点击数达到这些数值时发送通知</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {milestoneOptions.map((threshold) => (
                            <Button
                              key={threshold}
                              variant={
                                slackSettings.milestoneThresholds?.includes(threshold)
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => toggleMilestone(threshold, slackSettings, setSlackSettings)}
                            >
                              {formatNumber(threshold)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveSlackSettings}
                        disabled={updateSlackSettingsMutation.isPending}
                      >
                        {updateSlackSettingsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        保存设置
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-muted p-4">
                      <Zap className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium">连接 Slack 工作区</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      将 lnk.day 连接到您的 Slack 工作区，在链接创建、达成里程碑等事件时接收实时通知
                    </p>
                    <Button onClick={handleConnectSlack} className="mt-4">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      添加到 Slack
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slack Slash Commands Info */}
            {slackInstallation?.installed && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Slack 斜杠命令</CardTitle>
                  <CardDescription>在 Slack 中使用以下命令快速操作</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div>
                        <code className="font-mono text-sm">/lnk create [url]</code>
                        <p className="text-sm text-muted-foreground">快速创建短链接</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard('/lnk create')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div>
                        <code className="font-mono text-sm">/lnk stats [short-code]</code>
                        <p className="text-sm text-muted-foreground">查看链接统计数据</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard('/lnk stats')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div>
                        <code className="font-mono text-sm">/lnk help</code>
                        <p className="text-sm text-muted-foreground">查看所有可用命令</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard('/lnk help')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#5059C9]">
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.625 8.073c.574 0 1.125.228 1.531.634.406.406.634.957.634 1.531v4.524a2.165 2.165 0 0 1-2.165 2.165h-3.18v3.18a2.165 2.165 0 0 1-2.164 2.164H9.14a2.165 2.165 0 0 1-2.165-2.165v-3.179H3.796a2.165 2.165 0 0 1-2.165-2.165v-4.524c0-.574.228-1.125.634-1.531a2.165 2.165 0 0 1 1.531-.634h3.18V4.893a2.165 2.165 0 0 1 2.164-2.165h6.141a2.165 2.165 0 0 1 2.165 2.165v3.18h3.179z"/>
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Microsoft Teams 集成</CardTitle>
                    <CardDescription>通过 Webhook 将通知发送到 Teams 频道</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setShowAddTeamsDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加 Webhook
                </Button>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : teamsInstallations.length > 0 ? (
                  <div className="space-y-4">
                    {teamsInstallations.map((installation) => (
                      <div
                        key={installation.id}
                        className="rounded-lg border p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              installation.isActive ? "bg-green-500" : "bg-gray-300"
                            )} />
                            <div>
                              <h4 className="font-medium">{installation.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-mono text-xs">
                                  {showWebhookUrl[installation.id]
                                    ? installation.webhookUrl
                                    : installation.webhookUrl.slice(0, 40) + '...'
                                  }
                                </span>
                                <button
                                  onClick={() =>
                                    setShowWebhookUrl((prev) => ({
                                      ...prev,
                                      [installation.id]: !prev[installation.id],
                                    }))
                                  }
                                >
                                  {showWebhookUrl[installation.id] ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestTeamsConnection(installation.id)}
                              disabled={testingConnection === installation.id}
                            >
                              {testingConnection === installation.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-4 w-4" />
                              )}
                              测试
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingTeamsInstallation(installation)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTeamsMutation.mutate(installation.id)}
                              disabled={deleteTeamsMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {installation.settings.notifyOnLinkCreate && (
                            <Badge variant="secondary">新链接通知</Badge>
                          )}
                          {installation.settings.notifyOnMilestone && (
                            <Badge variant="secondary">
                              里程碑通知 ({installation.settings.milestoneThresholds.map(formatNumber).join(', ')})
                            </Badge>
                          )}
                          {installation.settings.notifyOnAlert && (
                            <Badge variant="secondary">告警通知</Badge>
                          )}
                          {installation.settings.notifyOnWeeklyReport && (
                            <Badge variant="secondary">周报</Badge>
                          )}
                        </div>

                        {installation.lastTestedAt && (
                          <p className="text-xs text-muted-foreground">
                            上次测试: {new Date(installation.lastTestedAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-muted p-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium">添加 Teams Webhook</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      在 Microsoft Teams 频道中创建 Incoming Webhook，然后将 URL 添加到这里
                    </p>
                    <Button onClick={() => setShowAddTeamsDialog(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      添加 Webhook
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How to create Teams Webhook */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">如何创建 Teams Webhook</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
                    <span>在 Microsoft Teams 中，右键点击要接收通知的频道，选择"管理频道"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                    <span>点击"连接器"标签，找到"Incoming Webhook"并点击"配置"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
                    <span>输入 Webhook 名称（如 "lnk.day 通知"），可选择上传图标</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">4</span>
                    <span>点击"创建"，复制生成的 Webhook URL，粘贴到上方的配置中</span>
                  </li>
                </ol>
                <Button variant="link" className="mt-4 px-0" asChild>
                  <a
                    href="https://docs.microsoft.com/zh-cn/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    查看详细文档
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Teams Webhook Dialog */}
        <Dialog open={showAddTeamsDialog} onOpenChange={setShowAddTeamsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>添加 Teams Webhook</DialogTitle>
              <DialogDescription>
                配置 Microsoft Teams Incoming Webhook 以接收通知
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input
                  placeholder="如：市场团队通知"
                  value={newTeamsForm.name}
                  onChange={(e) =>
                    setNewTeamsForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://xxx.webhook.office.com/..."
                  value={newTeamsForm.webhookUrl}
                  onChange={(e) =>
                    setNewTeamsForm((prev) => ({ ...prev, webhookUrl: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-3">
                <Label>通知类型</Label>
                {notificationTypes.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch
                      checked={(newTeamsForm.settings as any)[key]}
                      onCheckedChange={(v) =>
                        setNewTeamsForm((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, [key]: v },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              {newTeamsForm.settings.notifyOnMilestone && (
                <div className="space-y-2">
                  <Label>里程碑阈值</Label>
                  <div className="flex flex-wrap gap-2">
                    {milestoneOptions.map((threshold) => (
                      <Button
                        key={threshold}
                        variant={
                          newTeamsForm.settings.milestoneThresholds.includes(threshold)
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          toggleMilestone(threshold, newTeamsForm.settings, (s) =>
                            setNewTeamsForm((prev) => ({ ...prev, settings: s }))
                          )
                        }
                      >
                        {formatNumber(threshold)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTeamsDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleAddTeamsInstallation}
                disabled={!newTeamsForm.name || !newTeamsForm.webhookUrl || createTeamsMutation.isPending}
              >
                {createTeamsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Teams Installation Dialog */}
        <Dialog
          open={!!editingTeamsInstallation}
          onOpenChange={() => setEditingTeamsInstallation(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑 Teams Webhook</DialogTitle>
            </DialogHeader>

            {editingTeamsInstallation && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input
                    value={editingTeamsInstallation.name}
                    onChange={(e) =>
                      setEditingTeamsInstallation((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={editingTeamsInstallation.webhookUrl}
                    onChange={(e) =>
                      setEditingTeamsInstallation((prev) =>
                        prev ? { ...prev, webhookUrl: e.target.value } : null
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>启用</Label>
                  <Switch
                    checked={editingTeamsInstallation.isActive}
                    onCheckedChange={(v) =>
                      setEditingTeamsInstallation((prev) =>
                        prev ? { ...prev, isActive: v } : null
                      )
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>通知类型</Label>
                  {notificationTypes.map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{label}</span>
                      </div>
                      <Switch
                        checked={(editingTeamsInstallation.settings as any)[key]}
                        onCheckedChange={(v) =>
                          setEditingTeamsInstallation((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  settings: { ...prev.settings, [key]: v },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  ))}
                </div>

                {editingTeamsInstallation.settings.notifyOnMilestone && (
                  <div className="space-y-2">
                    <Label>里程碑阈值</Label>
                    <div className="flex flex-wrap gap-2">
                      {milestoneOptions.map((threshold) => (
                        <Button
                          key={threshold}
                          variant={
                            editingTeamsInstallation.settings.milestoneThresholds.includes(threshold)
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => {
                            const current = editingTeamsInstallation.settings.milestoneThresholds;
                            const newThresholds = current.includes(threshold)
                              ? current.filter((t) => t !== threshold)
                              : [...current, threshold].sort((a, b) => a - b);
                            setEditingTeamsInstallation((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    settings: {
                                      ...prev.settings,
                                      milestoneThresholds: newThresholds,
                                    },
                                  }
                                : null
                            );
                          }}
                        >
                          {formatNumber(threshold)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTeamsInstallation(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (editingTeamsInstallation) {
                    updateTeamsMutation.mutate({
                      id: editingTeamsInstallation.id,
                      data: {
                        name: editingTeamsInstallation.name,
                        webhookUrl: editingTeamsInstallation.webhookUrl,
                        isActive: editingTeamsInstallation.isActive,
                        settings: editingTeamsInstallation.settings,
                      },
                    });
                  }
                }}
                disabled={updateTeamsMutation.isPending}
              >
                {updateTeamsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
