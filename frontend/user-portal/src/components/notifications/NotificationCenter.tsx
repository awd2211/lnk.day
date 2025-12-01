import { useState } from 'react';
import { Bell, Check, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  link?: string;
}

// 模拟通知数据 - 实际应用中应该从 API 获取
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '链接创建成功',
    message: '您的短链接 /abc123 已成功创建',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5分钟前
    link: '/links',
  },
  {
    id: '2',
    title: '流量提醒',
    message: '您的链接 /promo 今日访问量已超过 1000',
    type: 'info',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
    link: '/analytics',
  },
  {
    id: '3',
    title: '域名验证成功',
    message: '自定义域名 links.example.com 已验证通过',
    type: 'success',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
    link: '/domains',
  },
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">通知</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="font-semibold">通知</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              <Check className="mr-1 h-3 w-3" />
              全部已读
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'relative p-4 hover:bg-muted/50 transition-colors',
                    !notification.read && 'bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 h-2 w-2 rounded-full shrink-0',
                        notification.read ? 'bg-muted' : 'bg-primary'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            getTypeStyles(notification.type)
                          )}
                        >
                          {notification.type === 'success' && '成功'}
                          {notification.type === 'info' && '提示'}
                          {notification.type === 'warning' && '警告'}
                          {notification.type === 'error' && '错误'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="font-medium text-sm mt-1">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="inline-flex items-center text-xs text-primary mt-2 hover:underline"
                          onClick={() => {
                            markAsRead(notification.id);
                            setOpen(false);
                          }}
                        >
                          查看详情
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" className="w-full" size="sm">
                查看全部通知
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
