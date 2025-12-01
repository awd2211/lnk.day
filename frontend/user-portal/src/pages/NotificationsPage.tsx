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
  Loader2,
  Star,
  StarOff,
  Archive,
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
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  starred: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, any>;
  category?: string;
}

interface NotificationPreferences {
  email: {
    enabled: boolean;
    linkCreated: boolean;
    milestone: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
  };
  push: {
    enabled: boolean;
    linkCreated: boolean;
    milestone: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
  };
  inApp: {
    enabled: boolean;
    linkCreated: boolean;
    milestone: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
  };
}

// API functions
const notificationApi = {
  getNotifications: async (params: { page?: number; limit?: number; read?: boolean; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.read !== undefined) searchParams.set('read', String(params.read));
    if (params.type) searchParams.set('type', params.type);
    const response = await api.get(`/api/v1/notifications?${searchParams.toString()}`);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/api/v1/notifications/unread-count');
    return response.data;
  },
  getPreferences: async () => {
    const response = await api.get('/api/v1/notifications/preferences');
    return response.data;
  },
  updatePreferences: async (data: Partial<NotificationPreferences>) => {
    const response = await api.put('/api/v1/notifications/preferences', data);
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await api.post(`/api/v1/notifications/${id}/read`);
    return response.data;
  },
  markMultipleAsRead: async (ids: string[]) => {
    const response = await api.post('/api/v1/notifications/read-batch', { ids });
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.post('/api/v1/notifications/read-all');
    return response.data;
  },
  toggleStar: async (id: string) => {
    const response = await api.post(`/api/v1/notifications/${id}/star`);
    return response.data;
  },
  deleteNotification: async (id: string) => {
    const response = await api.delete(`/api/v1/notifications/${id}`);
    return response.data;
  },
  deleteMultiple: async (ids: string[]) => {
    const response = await api.post('/api/v1/notifications/delete-batch', { ids });
    return response.data;
  },
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications
  const { data: notificationData, isLoading } = useQuery({
    queryKey: ['notifications', filter, page],
    queryFn: () => {
      const params: any = { page, limit: 20 };
      if (filter === 'unread') params.read = false;
      else if (filter === 'read') params.read = true;
      else if (filter !== 'all' && filter !== 'starred') params.type = filter;
      return notificationApi.getNotifications(params);
    },
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationApi.getUnreadCount,
  });

  // Fetch preferences
  const { data: preferences, refetch: refetchPreferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationApi.getPreferences,
    enabled: showSettings,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markMultipleAsReadMutation = useMutation({
    mutationFn: notificationApi.markMultipleAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      setSelectedNotifications([]);
      toast({ title: '已标记为已读' });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast({ title: '已将所有通知标记为已读' });
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: notificationApi.toggleStar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationApi.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast({ title: '通知已删除' });
    },
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: notificationApi.deleteMultiple,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      setSelectedNotifications([]);
      toast({ title: '通知已删除' });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: notificationApi.updatePreferences,
    onSuccess: () => {
      refetchPreferences();
      toast({ title: '设置已保存' });
    },
  });

  const notifications: Notification[] = notificationData?.items || [];
  const totalNotifications = notificationData?.total || 0;
  const unreadCount = unreadData?.count || 0;

  // Filter starred locally if needed
  const filteredNotifications = filter === 'starred'
    ? notifications.filter(n => n.starred)
    : notifications;

  const starredCount = notifications.filter(n => n.starred).length;

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
      info: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      link: '链接',
      team: '团队',
      billing: '账单',
      security: '安全',
      system: '系统',
      campaign: '活动',
      info: '信息',
      success: '成功',
      warning: '警告',
      error: '错误',
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
      setSelectedNotifications(filteredNotifications.map((n) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleMarkAsRead = (ids: string[]) => {
    if (ids.length === 1) {
      markAsReadMutation.mutate(ids[0]);
    } else {
      markMultipleAsReadMutation.mutate(ids);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (ids: string[]) => {
    if (ids.length === 1) {
      deleteMutation.mutate(ids[0]);
    } else {
      deleteMultipleMutation.mutate(ids);
    }
  };

  const handleToggleStar = (id: string) => {
    toggleStarMutation.mutate(id);
  };

  const handleSavePreferences = () => {
    if (preferences) {
      updatePreferencesMutation.mutate(preferences);
      setShowSettings(false);
    }
  };

  const handlePreferenceChange = (
    channel: 'email' | 'push' | 'inApp',
    key: string,
    value: boolean
  ) => {
    if (!preferences) return;
    queryClient.setQueryData(['notification-preferences'], {
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [key]: value,
      },
    });
  };

  const isAllSelected = filteredNotifications.length > 0 && selectedNotifications.length === filteredNotifications.length;

  return (
    <Layout
      title="通知中心"
      description="查看和管理您的所有通知"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
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
                <p className="text-2xl font-bold">{totalNotifications}</p>
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
                <p className="text-2xl font-bold">{totalNotifications - unreadCount}</p>
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
                  disabled={markMultipleAsReadMutation.isPending}
                >
                  <Check className="mr-1 h-3 w-3" />
                  标为已读
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedNotifications)}
                  disabled={deleteMultipleMutation.isPending}
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
              {filteredNotifications.length} 条通知
            </span>
          </div>

          {/* List */}
          <div className="divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">暂无通知</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  当有新的通知时，它们会显示在这里
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
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
                    disabled={toggleStarMutation.isPending}
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
                      {notification.link && (
                        <DropdownMenuItem asChild>
                          <a href={notification.link}>
                            <Link2 className="mr-2 h-4 w-4" />
                            查看详情
                          </a>
                        </DropdownMenuItem>
                      )}
                      {!notification.read && (
                        <DropdownMenuItem onClick={() => handleMarkAsRead([notification.id])}>
                          <Check className="mr-2 h-4 w-4" />
                          标为已读
                        </DropdownMenuItem>
                      )}
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

          {/* Pagination */}
          {notificationData?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {notificationData.totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= notificationData.totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>通知设置</DialogTitle>
            <DialogDescription>配置您希望接收通知的方式和类型</DialogDescription>
          </DialogHeader>

          {preferences ? (
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
                <TabsTrigger value="inApp" className="flex-1">
                  <Bell className="mr-2 h-4 w-4" />
                  应用内
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">启用邮件通知</p>
                    <p className="text-sm text-muted-foreground">接收重要事件的邮件提醒</p>
                  </div>
                  <Switch
                    checked={preferences.email?.enabled}
                    onCheckedChange={(v) => handlePreferenceChange('email', 'enabled', v)}
                  />
                </div>

                {preferences.email?.enabled && (
                  <div className="space-y-3">
                    <Label>通知类型</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">链接创建</span>
                      <Switch
                        checked={preferences.email?.linkCreated}
                        onCheckedChange={(v) => handlePreferenceChange('email', 'linkCreated', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">里程碑达成</span>
                      <Switch
                        checked={preferences.email?.milestone}
                        onCheckedChange={(v) => handlePreferenceChange('email', 'milestone', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">周报</span>
                      <Switch
                        checked={preferences.email?.weeklyReport}
                        onCheckedChange={(v) => handlePreferenceChange('email', 'weeklyReport', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">安全警报</span>
                      <Switch
                        checked={preferences.email?.securityAlerts}
                        onCheckedChange={(v) => handlePreferenceChange('email', 'securityAlerts', v)}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="push" className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">启用浏览器推送</p>
                    <p className="text-sm text-muted-foreground">在浏览器中接收实时通知</p>
                  </div>
                  <Switch
                    checked={preferences.push?.enabled}
                    onCheckedChange={(v) => handlePreferenceChange('push', 'enabled', v)}
                  />
                </div>

                {preferences.push?.enabled && (
                  <div className="space-y-3">
                    <Label>通知类型</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">链接创建</span>
                      <Switch
                        checked={preferences.push?.linkCreated}
                        onCheckedChange={(v) => handlePreferenceChange('push', 'linkCreated', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">里程碑达成</span>
                      <Switch
                        checked={preferences.push?.milestone}
                        onCheckedChange={(v) => handlePreferenceChange('push', 'milestone', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">周报</span>
                      <Switch
                        checked={preferences.push?.weeklyReport}
                        onCheckedChange={(v) => handlePreferenceChange('push', 'weeklyReport', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">安全警报</span>
                      <Switch
                        checked={preferences.push?.securityAlerts}
                        onCheckedChange={(v) => handlePreferenceChange('push', 'securityAlerts', v)}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="inApp" className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">启用应用内通知</p>
                    <p className="text-sm text-muted-foreground">在应用内显示通知</p>
                  </div>
                  <Switch
                    checked={preferences.inApp?.enabled}
                    onCheckedChange={(v) => handlePreferenceChange('inApp', 'enabled', v)}
                  />
                </div>

                {preferences.inApp?.enabled && (
                  <div className="space-y-3">
                    <Label>通知类型</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">链接创建</span>
                      <Switch
                        checked={preferences.inApp?.linkCreated}
                        onCheckedChange={(v) => handlePreferenceChange('inApp', 'linkCreated', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">里程碑达成</span>
                      <Switch
                        checked={preferences.inApp?.milestone}
                        onCheckedChange={(v) => handlePreferenceChange('inApp', 'milestone', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">周报</span>
                      <Switch
                        checked={preferences.inApp?.weeklyReport}
                        onCheckedChange={(v) => handlePreferenceChange('inApp', 'weeklyReport', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">安全警报</span>
                      <Switch
                        checked={preferences.inApp?.securityAlerts}
                        onCheckedChange={(v) => handlePreferenceChange('inApp', 'securityAlerts', v)}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              取消
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={updatePreferencesMutation.isPending}
            >
              {updatePreferencesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存设置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
