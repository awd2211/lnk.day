import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Link2,
  MousePointer,
  TrendingUp,
  Building2,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Shield,
  CreditCard,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { formatShortUrl } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { dashboardService, subscriptionsService } from '@/lib/api';

interface DashboardStats {
  totalUsers: number;
  totalTeams: number;
  totalLinks: number;
  totalClicks: number;
  todayClicks: number;
  activeUsers: number;
  growth: {
    users: number;
    teams: number;
    links: number;
    clicks: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'user_signup' | 'link_created' | 'team_created' | 'subscription_upgrade' | 'alert_triggered';
  message: string;
  timestamp: string;
  metadata?: any;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await dashboardService.getStats();
      return res.data as DashboardStats;
    },
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => {
      const res = await dashboardService.getHealth();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: topLinks } = useQuery({
    queryKey: ['dashboard', 'topLinks'],
    queryFn: async () => {
      const res = await dashboardService.getTopLinks(5);
      return res.data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const res = await dashboardService.getMetrics('week');
      // Transform timeSeries data to chart format
      return res.data?.timeSeries?.map((item: any) => ({
        date: format(new Date(item.date), 'MM/dd'),
        clicks: item.clicks || 0,
        users: item.users || 0,
      })) || [];
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => {
      const res = await dashboardService.getActivity(10);
      // Transform backend activity format to frontend format
      return (res.data || []).map((item: any) => ({
        id: item.id,
        type: item.type === 'user' ? (item.action === 'registered' ? 'user_signup' : 'user_login') :
              item.type === 'link' ? 'link_created' :
              item.type === 'team' ? 'team_created' :
              item.type === 'system' ? 'alert_triggered' : 'subscription_upgrade',
        message: item.description,
        timestamp: item.timestamp,
        metadata: item.metadata,
      })) as ActivityItem[];
    },
  });

  // Plan distribution from subscription stats
  const { data: subscriptionStats } = useQuery({
    queryKey: ['dashboard', 'subscriptionStats'],
    queryFn: async () => {
      const res = await subscriptionsService.getStats();
      return res.data;
    },
  });

  const planColors: Record<string, string> = {
    free: '#94a3b8',
    core: '#3b82f6',
    growth: '#8b5cf6',
    premium: '#f59e0b',
    enterprise: '#ef4444',
  };

  const planDistribution = subscriptionStats?.planDistribution?.map((item: { plan: string; percentage: number }) => ({
    name: item.plan?.charAt(0).toUpperCase() + item.plan?.slice(1) || 'Unknown',
    value: item.percentage || 0,
    color: planColors[item.plan?.toLowerCase()] || '#6b7280',
  })) || [];

  // Hourly metrics for today
  const { data: hourlyMetrics } = useQuery({
    queryKey: ['dashboard', 'hourlyMetrics'],
    queryFn: async () => {
      const res = await dashboardService.getMetrics('day');
      // Transform to hourly format
      return res.data?.timeSeries?.map((item: { date: string; clicks: number }) => ({
        hour: new Date(item.date).getHours(),
        clicks: item.clicks || 0,
      })) || [];
    },
  });

  const statCards = [
    {
      name: '总用户数',
      value: stats?.totalUsers || 0,
      icon: Users,
      change: stats?.growth?.users || 0,
      color: 'bg-blue-500',
    },
    {
      name: '总团队数',
      value: stats?.totalTeams || 0,
      icon: Building2,
      change: stats?.growth?.teams || 0,
      color: 'bg-purple-500',
    },
    {
      name: '总链接数',
      value: stats?.totalLinks || 0,
      icon: Link2,
      change: stats?.growth?.links || 0,
      color: 'bg-green-500',
    },
    {
      name: '总点击数',
      value: stats?.totalClicks || 0,
      icon: MousePointer,
      change: stats?.growth?.clicks || 0,
      color: 'bg-orange-500',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getOverallStatus = () => {
    if (!health) return null;
    switch (health.overall) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-700">系统正常</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-700">部分降级</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-100 text-red-700">系统异常</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'link_created':
        return <Link2 className="h-4 w-4 text-green-500" />;
      case 'team_created':
        return <Building2 className="h-4 w-4 text-purple-500" />;
      case 'subscription_upgrade':
        return <CreditCard className="h-4 w-4 text-yellow-500" />;
      case 'alert_triggered':
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return format(new Date(timestamp), 'MM/dd HH:mm', { locale: zhCN });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">控制台概览</h1>
          <p className="text-gray-500">系统运行状态和关键指标</p>
        </div>
        <Button variant="outline" onClick={() => refetchStats()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新数据
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          return (
            <div key={stat.name} className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg ${stat.color} p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold">
                {statsLoading ? '...' : stat.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Click Trends Chart */}
        <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold">点击趋势 (7天)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics || []}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => [value.toLocaleString(), '点击数']}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorClicks)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">套餐分布</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {planDistribution.map((entry: { name: string; value: number; color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, '占比']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {planDistribution.map((plan: { name: string; value: number; color: string }) => (
              <div key={plan.name} className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: plan.color }} />
                <span>{plan.name}</span>
                <span className="ml-auto text-gray-500">{plan.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Stats */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">今日数据</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">今日点击</p>
              <p className="text-2xl font-bold text-blue-700">{stats?.todayClicks?.toLocaleString() || 0}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-600">活跃用户</p>
              <p className="text-2xl font-bold text-green-700">{stats?.activeUsers?.toLocaleString() || 0}</p>
            </div>
          </div>

          {/* Mini bar chart for hourly distribution */}
          <div className="mt-4 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyMetrics || []}>
                <Bar dataKey="clicks" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => [value.toLocaleString(), '点击']}
                  labelFormatter={(label) => `${label}:00`}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">24小时点击分布</p>
        </div>

        {/* Service Health */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">服务状态</h3>
            {getOverallStatus()}
          </div>
          <div className="mt-4 space-y-3">
            {healthLoading ? (
              <p className="text-gray-500">加载中...</p>
            ) : health?.services?.length ? (
              health.services.map((service: any) => (
                <div key={service.name} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {service.latency > 0 ? `${service.latency}ms` : '-'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">无服务数据</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Links */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">热门链接</h3>
            <Button variant="ghost" size="sm">
              <Eye className="mr-1 h-4 w-4" />
              查看全部
            </Button>
          </div>
          {topLinks?.length ? (
            <div className="space-y-3">
              {topLinks.map((link: any, index: number) => (
                <div key={link.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-primary">{formatShortUrl(link.shortCode)}</p>
                    <p className="truncate text-xs text-gray-500">{link.originalUrl}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{link.clicks?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">点击</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">暂无数据</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">最近活动</h3>
            <Button variant="ghost" size="sm">
              <Clock className="mr-1 h-4 w-4" />
              查看更多
            </Button>
          </div>
          {activity?.length ? (
            <div className="space-y-3">
              {activity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-gray-100 p-2">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.message}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(item.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">暂无活动</div>
          )}
        </div>
      </div>
    </div>
  );
}
