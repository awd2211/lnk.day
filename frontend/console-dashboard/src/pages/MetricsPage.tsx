import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Settings,
  Bell,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Users,
  Link2,
  MousePointer,
  MemoryStick,
  Timer,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subHours } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { systemService } from '@/lib/api';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  uptime: number;
  lastCheck: string;
  cpu: number;
  memory: number;
  requests: number;
  errors: number;
}

interface SystemMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  requests: number;
  latency: number;
  errors: number;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  severity: 'info' | 'warning' | 'critical';
  lastTriggered?: string;
}

// Mock data for demonstration
const generateTimeSeriesData = (hours: number, interval: number = 5) => {
  const data: SystemMetrics[] = [];
  const now = new Date();
  for (let i = hours * 60 / interval; i >= 0; i--) {
    const timestamp = subHours(now, i * interval / 60);
    data.push({
      timestamp: format(timestamp, 'HH:mm'),
      cpu: 30 + Math.random() * 40,
      memory: 50 + Math.random() * 30,
      disk: 45 + Math.random() * 5,
      network: {
        in: Math.random() * 100,
        out: Math.random() * 80,
      },
      requests: Math.floor(100 + Math.random() * 500),
      latency: 20 + Math.random() * 80,
      errors: Math.floor(Math.random() * 10),
    });
  }
  return data;
};

const mockServices: ServiceStatus[] = [
  {
    name: 'api-gateway',
    status: 'healthy',
    latency: 12,
    uptime: 99.99,
    lastCheck: new Date().toISOString(),
    cpu: 25,
    memory: 45,
    requests: 15234,
    errors: 2,
  },
  {
    name: 'user-service',
    status: 'healthy',
    latency: 8,
    uptime: 99.95,
    lastCheck: new Date().toISOString(),
    cpu: 18,
    memory: 38,
    requests: 8921,
    errors: 0,
  },
  {
    name: 'link-service',
    status: 'healthy',
    latency: 15,
    uptime: 99.98,
    lastCheck: new Date().toISOString(),
    cpu: 35,
    memory: 52,
    requests: 24567,
    errors: 5,
  },
  {
    name: 'redirect-service',
    status: 'healthy',
    latency: 3,
    uptime: 99.999,
    lastCheck: new Date().toISOString(),
    cpu: 45,
    memory: 28,
    requests: 156789,
    errors: 1,
  },
  {
    name: 'analytics-service',
    status: 'degraded',
    latency: 85,
    uptime: 98.5,
    lastCheck: new Date().toISOString(),
    cpu: 78,
    memory: 85,
    requests: 45678,
    errors: 23,
  },
  {
    name: 'qr-service',
    status: 'healthy',
    latency: 22,
    uptime: 99.9,
    lastCheck: new Date().toISOString(),
    cpu: 20,
    memory: 35,
    requests: 3421,
    errors: 0,
  },
  {
    name: 'notification-service',
    status: 'healthy',
    latency: 45,
    uptime: 99.8,
    lastCheck: new Date().toISOString(),
    cpu: 15,
    memory: 42,
    requests: 1234,
    errors: 1,
  },
  {
    name: 'console-service',
    status: 'healthy',
    latency: 18,
    uptime: 99.95,
    lastCheck: new Date().toISOString(),
    cpu: 12,
    memory: 32,
    requests: 892,
    errors: 0,
  },
];

const mockAlertRules: AlertRule[] = [
  {
    id: '1',
    name: 'CPU 使用率过高',
    metric: 'cpu_usage',
    condition: '>',
    threshold: 80,
    enabled: true,
    severity: 'warning',
    lastTriggered: '2024-11-28T10:30:00Z',
  },
  {
    id: '2',
    name: '内存使用率过高',
    metric: 'memory_usage',
    condition: '>',
    threshold: 85,
    enabled: true,
    severity: 'critical',
  },
  {
    id: '3',
    name: '错误率过高',
    metric: 'error_rate',
    condition: '>',
    threshold: 5,
    enabled: true,
    severity: 'critical',
    lastTriggered: '2024-11-29T08:15:00Z',
  },
  {
    id: '4',
    name: '响应延迟过高',
    metric: 'latency_p99',
    condition: '>',
    threshold: 500,
    enabled: true,
    severity: 'warning',
  },
  {
    id: '5',
    name: '磁盘空间不足',
    metric: 'disk_usage',
    condition: '>',
    threshold: 90,
    enabled: true,
    severity: 'critical',
  },
  {
    id: '6',
    name: '服务不可用',
    metric: 'service_health',
    condition: '==',
    threshold: 0,
    enabled: true,
    severity: 'critical',
  },
];

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [metricsData, setMetricsData] = useState<SystemMetrics[]>([]);

  // Generate mock data based on time range
  useEffect(() => {
    const hours = {
      '15m': 0.25,
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
    }[timeRange] || 1;

    setMetricsData(generateTimeSeriesData(hours));
  }, [timeRange]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setMetricsData((prev) => {
        const newData = [...prev.slice(1)];
        const now = new Date();
        newData.push({
          timestamp: format(now, 'HH:mm'),
          cpu: 30 + Math.random() * 40,
          memory: 50 + Math.random() * 30,
          disk: 45 + Math.random() * 5,
          network: {
            in: Math.random() * 100,
            out: Math.random() * 80,
          },
          requests: Math.floor(100 + Math.random() * 500),
          latency: 20 + Math.random() * 80,
          errors: Math.floor(Math.random() * 10),
        });
        return newData;
      });
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-700">正常</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-700">降级</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-100 text-red-700">异常</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-700">严重</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700">警告</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-700">信息</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Calculate summary metrics
  const healthyCount = mockServices.filter((s) => s.status === 'healthy').length;
  const degradedCount = mockServices.filter((s) => s.status === 'degraded').length;
  const unhealthyCount = mockServices.filter((s) => s.status === 'unhealthy').length;
  const avgLatency = Math.round(mockServices.reduce((sum, s) => sum + s.latency, 0) / mockServices.length);
  const avgUptime = (mockServices.reduce((sum, s) => sum + s.uptime, 0) / mockServices.length).toFixed(2);
  const totalRequests = mockServices.reduce((sum, s) => sum + s.requests, 0);
  const totalErrors = mockServices.reduce((sum, s) => sum + s.errors, 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统监控</h1>
          <p className="text-gray-500">实时监控系统性能和服务状态</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-refresh" className="text-sm">
              自动刷新
            </Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 分钟</SelectItem>
              <SelectItem value="1h">1 小时</SelectItem>
              <SelectItem value="6h">6 小时</SelectItem>
              <SelectItem value="24h">24 小时</SelectItem>
              <SelectItem value="7d">7 天</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>

          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Grafana
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3">
              <Server className="h-6 w-6 text-green-600" />
            </div>
            <Badge className="bg-green-100 text-green-700">
              {healthyCount}/{mockServices.length} 正常
            </Badge>
          </div>
          <p className="mt-4 text-2xl font-bold">服务状态</p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-green-600">{healthyCount} 正常</span>
            <span className="text-yellow-600">{degradedCount} 降级</span>
            <span className="text-red-600">{unhealthyCount} 异常</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3">
              <Timer className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowDownRight className="h-4 w-4" />
              12%
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{avgLatency}ms</p>
          <p className="text-sm text-gray-500">平均响应延迟</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3">
              <Gauge className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              0.02%
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{avgUptime}%</p>
          <p className="text-sm text-gray-500">平均可用性</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-right">
              <span className="text-xs text-red-600">{totalErrors} 错误</span>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{formatNumber(totalRequests)}</p>
          <p className="text-sm text-gray-500">请求总数 (今日)</p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="services">
            <Server className="mr-2 h-4 w-4" />
            服务
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Cpu className="mr-2 h-4 w-4" />
            资源
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="mr-2 h-4 w-4" />
            告警规则
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Request Rate Chart */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">请求速率</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsData}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                      formatter={(value: number) => [`${value} req/s`, '请求']}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorRequests)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latency Chart */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">响应延迟</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit="ms" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                      formatter={(value: number) => [`${value.toFixed(0)}ms`, '延迟']}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Rate Chart */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">错误率</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                      formatter={(value: number) => [value, '错误']}
                    />
                    <Bar dataKey="errors" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Status Summary */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">服务状态汇总</h3>
              <div className="space-y-3">
                {mockServices.slice(0, 6).map((service) => (
                  <div key={service.name} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(service.status)}
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{service.latency}ms</span>
                      <span className="text-gray-500">{service.uptime}%</span>
                      {getStatusBadge(service.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">服务</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">延迟</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">可用性</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">CPU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">内存</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">请求</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">错误</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mockServices.map((service) => (
                    <tr key={service.name} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(service.status)}
                          <span className="font-medium">{service.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(service.status)}</td>
                      <td className="px-4 py-4">
                        <span className={getMetricColor(service.latency, { warning: 50, critical: 100 })}>
                          {service.latency}ms
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={getMetricColor(100 - service.uptime, { warning: 0.5, critical: 1 })}>
                          {service.uptime}%
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                service.cpu >= 80 ? 'bg-red-500' : service.cpu >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${service.cpu}%` }}
                            />
                          </div>
                          <span className="text-sm">{service.cpu}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                service.memory >= 85 ? 'bg-red-500' : service.memory >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${service.memory}%` }}
                            />
                          </div>
                          <span className="text-sm">{service.memory}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">{formatNumber(service.requests)}</td>
                      <td className="px-4 py-4">
                        <span className={service.errors > 0 ? 'text-red-600' : 'text-green-600'}>
                          {service.errors}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* CPU Usage */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">CPU 使用率</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {metricsData[metricsData.length - 1]?.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'CPU']} />
                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#colorCpu)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">内存使用率</h3>
                <span className="text-2xl font-bold text-purple-600">
                  {metricsData[metricsData.length - 1]?.memory.toFixed(1)}%
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsData}>
                    <defs>
                      <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '内存']} />
                    <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="url(#colorMemory)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">磁盘使用率</h3>
                <span className="text-2xl font-bold text-green-600">
                  {metricsData[metricsData.length - 1]?.disk.toFixed(1)}%
                </span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsData}>
                    <defs>
                      <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '磁盘']} />
                    <Area type="monotone" dataKey="disk" stroke="#22c55e" fill="url(#colorDisk)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Network I/O */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">网络 I/O</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-600">↓ 入站</span>
                  <span className="text-green-600">↑ 出站</span>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricsData.map((d) => ({ ...d, networkIn: d.network.in, networkOut: d.network.out }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="timestamp" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit=" MB/s" />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)} MB/s`]} />
                    <Line type="monotone" dataKey="networkIn" stroke="#3b82f6" strokeWidth={2} dot={false} name="入站" />
                    <Line type="monotone" dataKey="networkOut" stroke="#22c55e" strokeWidth={2} dot={false} name="出站" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Infrastructure Status */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">基础设施状态</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">PostgreSQL</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">正常</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <Database className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Redis</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">正常</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-orange-100 p-3">
                  <Wifi className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">RabbitMQ</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">正常</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-yellow-100 p-3">
                  <Database className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">ClickHouse</p>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">高负载</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">配置监控告警规则，当指标超过阈值时触发通知</p>
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              新建规则
            </Button>
          </div>

          <div className="rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">规则名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">指标</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">条件</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">严重程度</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">最后触发</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mockAlertRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{rule.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-gray-100 px-2 py-1 text-sm">{rule.metric}</code>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {rule.condition} {rule.threshold}
                        {rule.metric.includes('usage') || rule.metric.includes('rate') ? '%' : ''}
                        {rule.metric.includes('latency') ? 'ms' : ''}
                      </td>
                      <td className="px-4 py-4">{getSeverityBadge(rule.severity)}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {rule.lastTriggered
                          ? format(new Date(rule.lastTriggered), 'MM/dd HH:mm')
                          : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <Switch checked={rule.enabled} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
