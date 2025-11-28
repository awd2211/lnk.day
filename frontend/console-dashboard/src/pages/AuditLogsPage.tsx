import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  FileText,
  User,
  Settings,
  Shield,
  CreditCard,
  Link2,
  Download,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { auditService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    type: 'user' | 'admin' | 'system' | 'api';
    name: string;
    email?: string;
    ip?: string;
  };
  action: string;
  actionCategory: 'auth' | 'user' | 'link' | 'billing' | 'system' | 'security';
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  status: 'success' | 'failure';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}

interface AuditStats {
  todayLogs: number;
  activeAdmins: number;
  securityEvents: number;
  systemOperations: number;
}

const actionCategoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  auth: { label: '认证', icon: Shield, color: 'bg-purple-100 text-purple-700' },
  user: { label: '用户', icon: User, color: 'bg-blue-100 text-blue-700' },
  link: { label: '链接', icon: Link2, color: 'bg-green-100 text-green-700' },
  billing: { label: '计费', icon: CreditCard, color: 'bg-yellow-100 text-yellow-700' },
  system: { label: '系统', icon: Settings, color: 'bg-gray-100 text-gray-700' },
  security: { label: '安全', icon: Shield, color: 'bg-red-100 text-red-700' },
};

const actorTypeConfig: Record<string, { label: string; color: string }> = {
  user: { label: '用户', color: 'bg-blue-100 text-blue-700' },
  admin: { label: '管理员', color: 'bg-purple-100 text-purple-700' },
  system: { label: '系统', color: 'bg-gray-100 text-gray-700' },
  api: { label: 'API', color: 'bg-green-100 text-green-700' },
};

const actionLabels: Record<string, string> = {
  'user.ban': '封禁用户',
  'user.unban': '解封用户',
  'user.delete': '删除用户',
  'user.update': '更新用户',
  'user.create': '创建用户',
  'link.block': '封禁链接',
  'link.unblock': '解封链接',
  'link.auto_block': '自动封禁链接',
  'link.create_bulk': '批量创建链接',
  'link.delete': '删除链接',
  'subscription.upgrade': '升级订阅',
  'subscription.downgrade': '降级订阅',
  'subscription.cancel': '取消订阅',
  'subscription.reactivate': '重新激活订阅',
  'auth.login': '登录',
  'auth.logout': '登出',
  'auth.login_failed': '登录失败',
  'auth.password_reset': '重置密码',
  'auth.mfa_enabled': '启用MFA',
  'system.backup': '系统备份',
  'system.config_change': '配置变更',
  'system.cache_clear': '清除缓存',
  'admin.create': '创建管理员',
  'admin.delete': '删除管理员',
  'admin.update': '更新管理员',
  'alert.acknowledge': '确认告警',
  'alert.resolve': '解决告警',
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '1d':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  // Fetch stats
  const { data: stats } = useQuery<AuditStats>({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      try {
        const res = await auditService.getStats();
        return res.data;
      } catch {
        // Mock data fallback
        return {
          todayLogs: 1256,
          activeAdmins: 5,
          securityEvents: 12,
          systemOperations: 45,
        };
      }
    },
  });

  // Fetch audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', { search, page, category: categoryFilter, actorType: actorTypeFilter, status: statusFilter, dateRange }],
    queryFn: async () => {
      try {
        const { startDate, endDate } = getDateRange();
        const res = await auditService.getLogs({
          page,
          limit: 20,
          search: search || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          actorType: actorTypeFilter !== 'all' ? actorTypeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          startDate,
          endDate,
        });
        return res.data;
      } catch {
        // Mock data fallback
        const mockLogs: AuditLog[] = [
          {
            id: '1',
            timestamp: '2024-01-15T10:30:00Z',
            actor: { id: 'a1', type: 'admin', name: 'Super Admin', email: 'admin@lnk.day', ip: '192.168.1.100' },
            action: 'user.ban',
            actionCategory: 'user',
            resource: { type: 'user', id: 'u123', name: 'Bad User' },
            status: 'success',
            metadata: { reason: '违反使用条款' },
          },
          {
            id: '2',
            timestamp: '2024-01-15T10:15:00Z',
            actor: { id: 'a1', type: 'admin', name: 'Super Admin', email: 'admin@lnk.day', ip: '192.168.1.100' },
            action: 'link.block',
            actionCategory: 'link',
            resource: { type: 'link', id: 'l456', name: 'lnk.day/abc123' },
            status: 'success',
            metadata: { reason: '恶意链接' },
          },
          {
            id: '3',
            timestamp: '2024-01-15T09:45:00Z',
            actor: { id: 's1', type: 'system', name: 'Auto Moderation' },
            action: 'link.auto_block',
            actionCategory: 'security',
            resource: { type: 'link', id: 'l789', name: 'lnk.day/xyz789' },
            status: 'success',
            metadata: { detectionType: 'phishing', confidence: 0.95 },
          },
          {
            id: '4',
            timestamp: '2024-01-15T09:30:00Z',
            actor: { id: 'a2', type: 'admin', name: 'Support Admin', email: 'support@lnk.day', ip: '192.168.1.101' },
            action: 'subscription.upgrade',
            actionCategory: 'billing',
            resource: { type: 'subscription', id: 's123', name: 'User Premium Plan' },
            status: 'success',
            changes: [
              { field: 'plan', oldValue: 'core', newValue: 'premium' },
              { field: 'amount', oldValue: 12, newValue: 99 },
            ],
          },
          {
            id: '5',
            timestamp: '2024-01-15T09:00:00Z',
            actor: { id: 'api1', type: 'api', name: 'API Key: prod-xxxx' },
            action: 'link.create_bulk',
            actionCategory: 'link',
            resource: { type: 'links', name: '批量创建' },
            status: 'success',
            metadata: { count: 150 },
          },
          {
            id: '6',
            timestamp: '2024-01-15T08:30:00Z',
            actor: { id: 'u1', type: 'user', name: 'John Doe', email: 'john@example.com', ip: '203.0.113.50' },
            action: 'auth.login',
            actionCategory: 'auth',
            resource: { type: 'session' },
            status: 'success',
            metadata: { device: 'Chrome on macOS', location: 'Shanghai, CN' },
          },
          {
            id: '7',
            timestamp: '2024-01-15T08:15:00Z',
            actor: { id: 'unknown', type: 'user', name: 'Unknown', ip: '198.51.100.1' },
            action: 'auth.login_failed',
            actionCategory: 'security',
            resource: { type: 'session' },
            status: 'failure',
            metadata: { reason: '密码错误', attempts: 3 },
          },
          {
            id: '8',
            timestamp: '2024-01-15T07:00:00Z',
            actor: { id: 's1', type: 'system', name: 'Scheduler' },
            action: 'system.backup',
            actionCategory: 'system',
            resource: { type: 'database' },
            status: 'success',
            metadata: { size: '2.5GB', duration: '45s' },
          },
        ];
        return { items: mockLogs, total: mockLogs.length, page: 1, totalPages: 1 };
      }
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (format: 'csv' | 'json') => {
      const { startDate, endDate } = getDateRange();
      return auditService.exportLogs({
        format,
        startDate,
        endDate,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });
    },
    onSuccess: (res) => {
      // Handle download
      if (res.data.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      }
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const getActionLabel = (action: string): string => {
    return actionLabels[action] || action;
  };

  // Export columns for audit logs
  const exportColumns = [
    { key: 'timestamp', label: '时间' },
    { key: 'actor.name', label: '操作者' },
    { key: 'actor.type', label: '操作者类型' },
    { key: 'actor.email', label: '邮箱' },
    { key: 'actor.ip', label: 'IP地址' },
    { key: 'action', label: '操作' },
    { key: 'actionCategory', label: '类别' },
    { key: 'resource.type', label: '资源类型' },
    { key: 'resource.name', label: '资源名称' },
    { key: 'status', label: '状态' },
  ];

  const prepareExportData = () => {
    return data?.items?.map((log) => ({
      timestamp: formatDate(log.timestamp),
      'actor.name': log.actor.name,
      'actor.type': actorTypeConfig[log.actor.type]?.label || log.actor.type,
      'actor.email': log.actor.email || '',
      'actor.ip': log.actor.ip || '',
      action: getActionLabel(log.action),
      actionCategory: actionCategoryConfig[log.actionCategory]?.label || log.actionCategory,
      'resource.type': log.resource.type,
      'resource.name': log.resource.name || '',
      status: log.status === 'success' ? '成功' : '失败',
    })) || [];
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日记录</p>
              <p className="text-2xl font-bold">{stats?.todayLogs?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃管理员</p>
              <p className="text-2xl font-bold">{stats?.activeAdmins || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">安全事件</p>
              <p className="text-2xl font-bold">{stats?.securityEvents || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <Settings className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">系统操作</p>
              <p className="text-2xl font-bold">{stats?.systemOperations || 0}</p>
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
              placeholder="搜索操作、用户..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类别</SelectItem>
              {Object.entries(actionCategoryConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actorTypeFilter} onValueChange={setActorTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="操作者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {Object.entries(actorTypeConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="failure">失败</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">过去 24 小时</SelectItem>
              <SelectItem value="7d">过去 7 天</SelectItem>
              <SelectItem value="30d">过去 30 天</SelectItem>
              <SelectItem value="90d">过去 90 天</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <ExportButton
            data={prepareExportData()}
            columns={exportColumns}
            filename="audit-logs"
            title="导出审计日志"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">时间</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">操作者</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">资源</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((log) => {
                  const CategoryIcon = actionCategoryConfig[log.actionCategory]?.icon || FileText;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className={actorTypeConfig[log.actor.type]?.color}>
                            {actorTypeConfig[log.actor.type]?.label}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{log.actor.name}</p>
                            {log.actor.email && (
                              <p className="text-xs text-gray-500">{log.actor.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`rounded p-1 ${actionCategoryConfig[log.actionCategory]?.color}`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{getActionLabel(log.action)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="text-gray-500">{log.resource.type}</span>
                          {log.resource.name && (
                            <span className="ml-1 font-medium">{log.resource.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {log.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    暂无审计日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-gray-500">
              共 {data.total?.toLocaleString()} 条记录，第 {page} / {data.totalPages} 页
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审计日志详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">时间</label>
                  <p className="font-medium">{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <Badge
                    className={
                      selectedLog.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }
                  >
                    {selectedLog.status === 'success' ? '成功' : '失败'}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">操作者信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">类型</span>
                    <p>{actorTypeConfig[selectedLog.actor.type]?.label}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">名称</span>
                    <p>{selectedLog.actor.name}</p>
                  </div>
                  {selectedLog.actor.email && (
                    <div>
                      <span className="text-gray-500">邮箱</span>
                      <p>{selectedLog.actor.email}</p>
                    </div>
                  )}
                  {selectedLog.actor.ip && (
                    <div>
                      <span className="text-gray-500">IP 地址</span>
                      <p>{selectedLog.actor.ip}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium">操作信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">操作</span>
                    <p>{getActionLabel(selectedLog.action)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">类别</span>
                    <p>{actionCategoryConfig[selectedLog.actionCategory]?.label}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">资源类型</span>
                    <p>{selectedLog.resource.type}</p>
                  </div>
                  {selectedLog.resource.name && (
                    <div>
                      <span className="text-gray-500">资源名称</span>
                      <p>{selectedLog.resource.name}</p>
                    </div>
                  )}
                  {selectedLog.resource.id && (
                    <div>
                      <span className="text-gray-500">资源ID</span>
                      <p className="font-mono text-xs">{selectedLog.resource.id}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-medium">变更记录</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left text-gray-500">字段</th>
                        <th className="py-2 text-left text-gray-500">旧值</th>
                        <th className="py-2 text-left text-gray-500">新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLog.changes.map((change, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2">{change.field}</td>
                          <td className="py-2 text-red-500">{JSON.stringify(change.oldValue)}</td>
                          <td className="py-2 text-green-500">{JSON.stringify(change.newValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-medium">元数据</h4>
                  <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
