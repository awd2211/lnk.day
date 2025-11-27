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
} from 'lucide-react';
import { dashboardService, systemService } from '@/lib/api';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats().then((res) => res.data),
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: () => dashboardService.getHealth().then((res) => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: topLinks } = useQuery({
    queryKey: ['dashboard', 'topLinks'],
    queryFn: () => dashboardService.getTopLinks(5).then((res) => res.data),
  });

  const statCards = [
    {
      name: '总用户数',
      value: stats?.totalUsers || 0,
      icon: Users,
      change: stats?.growth?.users ? `+${stats.growth.users}%` : '+0%',
      color: 'bg-blue-500',
    },
    {
      name: '总团队数',
      value: stats?.totalTeams || 0,
      icon: Building2,
      change: '+0%',
      color: 'bg-purple-500',
    },
    {
      name: '总链接数',
      value: stats?.totalLinks || 0,
      icon: Link2,
      change: stats?.growth?.links ? `+${stats.growth.links}%` : '+0%',
      color: 'bg-green-500',
    },
    {
      name: '总点击数',
      value: stats?.totalClicks || 0,
      icon: MousePointer,
      change: stats?.growth?.clicks ? `+${stats.growth.clicks}%` : '+0%',
      color: 'bg-orange-500',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getOverallStatus = () => {
    if (!health) return null;
    switch (health.overall) {
      case 'healthy':
        return <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">系统正常</span>;
      case 'degraded':
        return <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">部分降级</span>;
      case 'unhealthy':
        return <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">系统异常</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg ${stat.color} p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm text-green-600">{stat.change}</span>
              </div>
              <p className="mt-4 text-2xl font-bold">
                {statsLoading ? '...' : stat.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">今日数据</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">今日点击</p>
              <p className="text-xl font-bold">{stats?.todayClicks?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃用户</p>
              <p className="text-xl font-bold">{stats?.activeUsers?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        {/* Service Health */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">服务状态</h3>
            {getOverallStatus()}
          </div>
          <div className="mt-4 space-y-2">
            {healthLoading ? (
              <p className="text-gray-500">加载中...</p>
            ) : health?.services?.length ? (
              health.services.map((service: any) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className="text-sm">{service.name}</span>
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

      {/* Top Links */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">热门链接</h3>
        {topLinks?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">短链接</th>
                  <th className="pb-3 font-medium">原始 URL</th>
                  <th className="pb-3 text-right font-medium">点击数</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topLinks.map((link: any) => (
                  <tr key={link.id} className="text-sm">
                    <td className="py-3">
                      <span className="font-medium text-primary">lnk.day/{link.shortCode}</span>
                    </td>
                    <td className="max-w-xs truncate py-3 text-gray-500">{link.originalUrl}</td>
                    <td className="py-3 text-right font-medium">{link.clicks?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">暂无数据</div>
        )}
      </div>
    </div>
  );
}
