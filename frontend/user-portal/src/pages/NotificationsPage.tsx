import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Filter,
  MoreHorizontal,
  Link2,
  Users,
  AlertTriangle,
  CreditCard,
  Shield,
  Activity,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  RefreshCw,
  Archive,
  Star,
  StarOff,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'link' | 'team' | 'billing' | 'security' | 'system' | 'campaign';
  title: string;
  message: string;
  read: boolean;
  starred: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationPreferences {
  email: {
    enabled: boolean;
    digest: 'realtime' | 'daily' | 'weekly' | 'never';
    types: {
      link: boolean;
      team: boolean;
      billing: boolean;
      security: boolean;
      system: boolean;
      campaign: boolean;
    };
  };
  push: {
    enabled: boolean;
    types: {
      link: boolean;
      team: boolean;
      billing: boolean;
      security: boolean;
      system: boolean;
      campaign: boolean;
    };
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    types: {
      link: boolean;
      team: boolean;
      billing: boolean;
      security: boolean;
      system: boolean;
      campaign: boolean;
    };
  };
}

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'link',
    title: '链接达到里程碑',
    message: '您的链接 "产品发布" 已获得 10,000 次点击！',
    read: false,
    starred: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actionUrl: '/links/123',
    metadata: { linkId: '123', clicks: 10000 },
  },
  {
    id: '2',
    type: 'team',
    title: '新团队成员加入',
    message: 'john@example.com 已接受邀请加入您的团队',
    read: false,
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    metadata: { memberEmail: 'john@example.com' },
  },
  {
    id: '3',
    type: 'billing',
    title: '付款成功',
    message: '您的月度订阅费用 $49.00 已成功扣款',
    read: true,
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    actionUrl: '/billing',
    metadata: { amount: 49.00, currency: 'USD' },
  },
  {
    id: '4',
    type: 'security',
    title: '新设备登录',
    message: '检测到来自新设备的登录：Chrome on Windows, 北京',
    read: true,
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    metadata: { device: 'Chrome on Windows', location: '北京' },
  },
  {
    id: '5',
    type: 'campaign',
    title: '活动目标达成',
    message: '您的活动 "双十一促销" 已达成转化目标！',
    read: false,
    starred: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    actionUrl: '/campaigns/456',
    metadata: { campaignId: '456', goalType: 'conversion' },
  },
  {
    id: '6',
    type: 'system',
    title: '系统维护通知',
    message: '计划于本周六凌晨 2:00-4:00 进行系统维护',
    read: true,
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: '7',
    type: 'link',
    title: '链接即将过期',
    message: '您的链接 "限时优惠" 将于 3 天后过期',
    read: false,
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    actionUrl: '/links/789',
    metadata: { linkId: '789', expiresIn: '3 days' },
  },
];

const mockPreferences: NotificationPreferences = {
  email: {
    enabled: true,
    digest: 'daily',
    types: {
      link: true,
      team: true,
      billing: true,
      security: true,
      system: true,
      campaign: true,
    },
  },
  push: {
    enabled: true,
    types: {
      link: true,
      team: true,
      billing: true,
      security: true,
      system: false,
      campaign: true,
    },
  },
  slack: {
    enabled: false,
    webhookUrl: '',
    types: {
      link: false,
      team: false,
      billing: false,
      security: false,
      system: false,
      campaign: false,
    },
  },
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(mockPreferences);
  const queryClient = useQueryClient();

  // In real app, fetch from API
  const notifications = mockNotifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'starred') return n.starred;
    return n.type === filter;
  });

  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  const starredCount = mockNotifications.filter((n) => n.starred).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'link':
        return <Link2 className="h-4 w-4 text-blue-500" />;
      case 'team':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'billing':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'security':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'system':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'campaign':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      link: 'bg-blue-100 text-blue-700',
      team: 'bg-purple-100 text-purple-700',
      billing: 'bg-green-100 text-green-700',
      security: 'bg-red-100 text-red-700',
      system: 'bg-yellow-100 text-yellow-700',
      campaign: 'bg-orange-100 text-orange-700',
    };
    const labels: Record<string, string> = {
      link: '链接',
      team: '团队',
      billing: '账单',
      security: '安全',
      system: '系统',
      campaign: '活动',
    };
    return <Badge className={styles[type] || 'bg-gray-100'}>{labels[type] || type}</Badge>;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleSelectNotification = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications([...selectedNotifications, id]);
    } else {
      setSelectedNotifications(selectedNotifications.filter((nId) => nId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(notifications.map((n) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleMarkAsRead = (ids: string[]) => {
    console.log('Mark as read:', ids);
    // In real app, call API
  };

  const handleMarkAllAsRead = () => {
    console.log('Mark all as read');
    // In real app, call API
  };

  const handleDelete = (ids: string[]) => {
    console.log('Delete:', ids);
    // In real app, call API
  };

  const handleToggleStar = (id: string) => {
    console.log('Toggle star:', id);
    // In real app, call API
  };

  const handlePreferenceChange = (
    channel: 'email' | 'push' | 'slack',
    key: string,
    value: any
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value,
      },
    }));
  };

  const handleTypeToggle = (
    channel: 'email' | 'push' | 'slack',
    type: string,
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        types: {
          ...prev[channel].types,
          [type]: value,
        },
      },
    }));
  };

  const isAllSelected = notifications.length > 0 && selectedNotifications.length === notifications.length;

  return (
    <Layout
      title="通知中心"
      description="查看和管理您的所有通知"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            全部已读
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            通知设置
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockNotifications.length}</p>
                <p className="text-sm text-muted-foreground">全部通知</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <BellOff className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">未读</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{starredCount}</p>
                <p className="text-sm text-muted-foreground">已收藏</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockNotifications.length - unreadCount}</p>
                <p className="text-sm text-muted-foreground">已读</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部通知</SelectItem>
                <SelectItem value="unread">未读</SelectItem>
                <SelectItem value="starred">已收藏</SelectItem>
                <SelectItem value="link">链接相关</SelectItem>
                <SelectItem value="team">团队相关</SelectItem>
                <SelectItem value="billing">账单相关</SelectItem>
                <SelectItem value="security">安全相关</SelectItem>
                <SelectItem value="campaign">活动相关</SelectItem>
                <SelectItem value="system">系统通知</SelectItem>
              </SelectContent>
            </Select>

            {selectedNotifications.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                <span className="text-sm">已选 {selectedNotifications.length} 项</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(selectedNotifications)}
                >
                  <Check className="mr-1 h-3 w-3" />
                  标为已读
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedNotifications)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  删除
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="rounded-lg border bg-card">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {notifications.length} 条通知
            </span>
          </div>

          {/* List */}
          <div className="divide-y">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">暂无通知</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  当有新的通知时，它们会显示在这里
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/50',
                    !notification.read && 'bg-blue-50/50'
                  )}
                >
                  <Checkbox
                    checked={selectedNotifications.includes(notification.id)}
                    onCheckedChange={(checked) =>
                      handleSelectNotification(notification.id, checked as boolean)
                    }
                  />

                  <button
                    className="mt-0.5"
                    onClick={() => handleToggleStar(notification.id)}
                  >
                    {notification.starred ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4 text-muted-foreground hover:text-yellow-400" />
                    )}
                  </button>

                  <div className="mt-0.5">{getTypeIcon(notification.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={cn('font-medium', !notification.read && 'font-semibold')}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {getTypeBadge(notification.type)}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {notification.actionUrl && (
                        <DropdownMenuItem>
                          <Link2 className="mr-2 h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleMarkAsRead([notification.id])}>
                        <Check className="mr-2 h-4 w-4" />
                        {notification.read ? '标为未读' : '标为已读'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStar(notification.id)}>
                        {notification.starred ? (
                          <>
                            <StarOff className="mr-2 h-4 w-4" />
                            取消收藏
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            收藏
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="mr-2 h-4 w-4" />
                        归档
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete([notification.id])}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>通知设置</DialogTitle>
            <DialogDescription>配置您希望接收通知的方式和类型</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="email" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1">
                <Mail className="mr-2 h-4 w-4" />
                邮件
              </TabsTrigger>
              <TabsTrigger value="push" className="flex-1">
                <Smartphone className="mr-2 h-4 w-4" />
                推送
              </TabsTrigger>
              <TabsTrigger value="slack" className="flex-1">
                <MessageSquare className="mr-2 h-4 w-4" />
                Slack
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">启用邮件通知</p>
                  <p className="text-sm text-muted-foreground">接收重要事件的邮件提醒</p>
                </div>
                <Switch
                  checked={preferences.email.enabled}
                  onCheckedChange={(v) => handlePreferenceChange('email', 'enabled', v)}
                />
              </div>

              {preferences.email.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>邮件摘要频率</Label>
                    <Select
                      value={preferences.email.digest}
                      onValueChange={(v) => handlePreferenceChange('email', 'digest', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">实时</SelectItem>
                        <SelectItem value="daily">每日摘要</SelectItem>
                        <SelectItem value="weekly">每周摘要</SelectItem>
                        <SelectItem value="never">不发送</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>通知类型</Label>
                    {Object.entries(preferences.email.types).map(([type, enabled]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(type)}
                          <span className="text-sm">
                            {{
                              link: '链接相关',
                              team: '团队相关',
                              billing: '账单相关',
                              security: '安全相关',
                              system: '系统通知',
                              campaign: '活动相关',
                            }[type]}
                          </span>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => handleTypeToggle('email', type, v)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="push" className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">启用浏览器推送</p>
                  <p className="text-sm text-muted-foreground">在浏览器中接收实时通知</p>
                </div>
                <Switch
                  checked={preferences.push.enabled}
                  onCheckedChange={(v) => handlePreferenceChange('push', 'enabled', v)}
                />
              </div>

              {preferences.push.enabled && (
                <div className="space-y-3">
                  <Label>通知类型</Label>
                  {Object.entries(preferences.push.types).map(([type, enabled]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(type)}
                        <span className="text-sm">
                          {{
                            link: '链接相关',
                            team: '团队相关',
                            billing: '账单相关',
                            security: '安全相关',
                            system: '系统通知',
                            campaign: '活动相关',
                          }[type]}
                        </span>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => handleTypeToggle('push', type, v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="slack" className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">启用 Slack 集成</p>
                  <p className="text-sm text-muted-foreground">将通知发送到 Slack 频道</p>
                </div>
                <Switch
                  checked={preferences.slack.enabled}
                  onCheckedChange={(v) => handlePreferenceChange('slack', 'enabled', v)}
                />
              </div>

              {preferences.slack.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <input
                      type="url"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="https://hooks.slack.com/services/..."
                      value={preferences.slack.webhookUrl}
                      onChange={(e) =>
                        handlePreferenceChange('slack', 'webhookUrl', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>通知类型</Label>
                    {Object.entries(preferences.slack.types).map(([type, enabled]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(type)}
                          <span className="text-sm">
                            {{
                              link: '链接相关',
                              team: '团队相关',
                              billing: '账单相关',
                              security: '安全相关',
                              system: '系统通知',
                              campaign: '活动相关',
                            }[type]}
                          </span>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => handleTypeToggle('slack', type, v)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              取消
            </Button>
            <Button onClick={() => setShowSettings(false)}>保存设置</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
