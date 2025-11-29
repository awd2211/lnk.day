import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { systemService } from '@/lib/api';

export default function SystemPage() {
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [logLevel, setLogLevel] = useState<string>('all');

  const { data: info, isLoading: infoLoading, refetch: refetchInfo } = useQuery({
    queryKey: ['system', 'info'],
    queryFn: () => systemService.getInfo().then((res) => res.data),
  });

  const { data: services, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['system', 'services'],
    queryFn: () => systemService.getServices().then((res) => res.data),
    refetchInterval: 30000,
  });

  const { data: database } = useQuery({
    queryKey: ['system', 'database'],
    queryFn: () => systemService.getDatabase().then((res) => res.data),
  });

  const { data: cache } = useQuery({
    queryKey: ['system', 'cache'],
    queryFn: () => systemService.getCache().then((res) => res.data),
  });

  const { data: queues } = useQuery({
    queryKey: ['system', 'queues'],
    queryFn: () => systemService.getQueues().then((res) => res.data),
  });

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['system', 'logs', selectedService, logLevel],
    queryFn: async () => {
      if (!selectedService) return null;
      const params: any = { lines: 200 };
      if (logLevel !== 'all') params.level = logLevel;
      const res = await systemService.getServiceLogs(selectedService, params);
      return res.data;
    },
    enabled: !!selectedService && showLogsDialog,
    refetchInterval: showLogsDialog ? 5000 : false,
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
            <CheckCircle className="h-3 w-3" />
            在线
          </span>
        );
      case 'offline':
      case 'unhealthy':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
            <XCircle className="h-3 w-3" />
            离线
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
            <Clock className="h-3 w-3" />
            降级
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* System Info */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">系统信息</h2>
          <Button variant="outline" size="sm" onClick={() => refetchInfo()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>

        {infoLoading ? (
          <p className="text-gray-500">加载中...</p>
        ) : info ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-3">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">主机名</p>
                <p className="font-medium">{info.hostname}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">运行时间</p>
                <p className="font-medium">{formatUptime(info.uptime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-3">
                <Cpu className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">CPU 核心</p>
                <p className="font-medium">{info.cpu?.cores} 核</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-3">
                <MemoryStick className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">内存使用</p>
                <p className="font-medium">
                  {formatBytes(info.memory?.used)} / {formatBytes(info.memory?.total)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">无法获取系统信息</p>
        )}
      </div>

      {/* Services Status */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">服务状态</h2>
          <Button variant="outline" size="sm" onClick={() => refetchServices()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>

        {servicesLoading ? (
          <p className="text-gray-500">加载中...</p>
        ) : services?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">服务名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">URL</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">延迟</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">版本</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.map((service: any) => (
                  <tr key={service.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{service.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{service.url}</td>
                    <td className="px-4 py-3">{getStatusBadge(service.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      {service.latency > 0 ? `${service.latency}ms` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{service.version || '-'}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedService(service.name);
                          setShowLogsDialog(true);
                        }}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        日志
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">无服务数据</p>
        )}
      </div>

      {/* Database & Cache */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Database */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">数据库状态</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-gray-400" />
                <span>PostgreSQL</span>
              </div>
              {getStatusBadge(database?.postgres?.connected ? 'online' : 'offline')}
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">活跃连接</p>
                <p className="text-xl font-semibold">{database?.postgres?.activeConnections || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">最大连接</p>
                <p className="text-xl font-semibold">{database?.postgres?.maxConnections || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-gray-400" />
                <span>ClickHouse</span>
              </div>
              {getStatusBadge(database?.clickhouse?.connected ? 'online' : 'offline')}
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">总行数</p>
                <p className="text-xl font-semibold">{database?.clickhouse?.totalRows?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">磁盘占用</p>
                <p className="text-xl font-semibold">{database?.clickhouse?.diskUsage || '0MB'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cache & Queues */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">缓存与队列</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-gray-400" />
                <span>Redis</span>
              </div>
              {getStatusBadge(cache?.redis?.connected ? 'online' : 'offline')}
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">键数量</p>
                <p className="text-lg font-semibold">{cache?.redis?.keys || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">命中率</p>
                <p className="text-lg font-semibold">
                  {cache?.redis?.hits && cache?.redis?.misses
                    ? ((cache.redis.hits / (cache.redis.hits + cache.redis.misses)) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">内存</p>
                <p className="text-lg font-semibold">{cache?.redis?.memory?.used || '0MB'}</p>
              </div>
            </div>

            <h3 className="mt-4 font-medium">队列状态</h3>
            {queues?.queues?.length ? (
              <div className="space-y-2">
                {queues.queues.map((queue: any) => (
                  <div key={queue.name} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="font-medium">{queue.name}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-yellow-600">等待: {queue.waiting}</span>
                      <span className="text-blue-600">执行: {queue.active}</span>
                      <span className="text-green-600">完成: {queue.completed}</span>
                      <span className="text-red-600">失败: {queue.failed}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">无队列数据</p>
            )}
          </div>
        </div>
      </div>

      {/* Log Viewer Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedService} 日志
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">日志级别:</span>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="error">ERROR</SelectItem>
                  <SelectItem value="warn">WARN</SelectItem>
                  <SelectItem value="info">INFO</SelectItem>
                  <SelectItem value="debug">DEBUG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLogs()}
              disabled={logsLoading}
            >
              {logsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              刷新
            </Button>
            <span className="text-sm text-gray-500">
              {logs?.total || 0} 条日志 (每5秒自动刷新)
            </span>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[50vh] font-mono text-sm">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : logs?.logs?.length ? (
              <div className="space-y-1">
                {logs.logs.map((log: string, index: number) => {
                  // Remove ANSI color codes for display
                  const cleanLog = log.replace(/\x1b\[[0-9;]*m/g, '');
                  // Determine log level color
                  let textColor = 'text-gray-300';
                  if (cleanLog.includes('ERROR')) textColor = 'text-red-400';
                  else if (cleanLog.includes('WARN')) textColor = 'text-yellow-400';
                  else if (cleanLog.includes('LOG')) textColor = 'text-green-400';
                  else if (cleanLog.includes('DEBUG')) textColor = 'text-blue-400';

                  return (
                    <div key={index} className={`${textColor} whitespace-pre-wrap break-all`}>
                      {cleanLog}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                暂无日志记录
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
