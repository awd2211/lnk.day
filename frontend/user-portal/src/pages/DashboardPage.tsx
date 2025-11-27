import { Link } from 'react-router-dom';
import { Link2, MousePointerClick, TrendingUp, ArrowUpRight, Clock } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useLinks } from '@/hooks/useLinks';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';

export default function DashboardPage() {
  const { data: linksData, isLoading: linksLoading } = useLinks({ limit: 5 });
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();

  const stats = [
    {
      label: '总链接数',
      value: linksData?.total || 0,
      icon: Link2,
      color: 'bg-blue-500',
    },
    {
      label: '总点击数',
      value: analytics?.totalClicks || 0,
      icon: MousePointerClick,
      color: 'bg-green-500',
    },
    {
      label: '今日点击',
      value: analytics?.todayClicks || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      label: '独立访客',
      value: analytics?.uniqueVisitors || 0,
      icon: ArrowUpRight,
      color: 'bg-orange-500',
    },
  ];

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-gray-500">欢迎回来，查看您的链接数据</p>
        </div>
        <Link to="/links">
          <Button>
            <Link2 className="mr-2 h-4 w-4" />
            创建短链接
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold">
                    {linksLoading || analyticsLoading ? '...' : stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`rounded-full ${stat.color} p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Links */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近链接</h2>
            <Link to="/links" className="text-sm text-primary hover:underline">
              查看全部
            </Link>
          </div>
          {linksLoading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : linksData?.items?.length ? (
            <div className="space-y-4">
              {linksData.items.map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-primary">
                      lnk.day/{link.shortCode}
                    </p>
                    <p className="truncate text-sm text-gray-500">{link.originalUrl}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2 text-sm text-gray-500">
                    <MousePointerClick className="h-4 w-4" />
                    {link.clicks}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              暂无链接，<Link to="/links" className="text-primary hover:underline">创建第一个</Link>
            </div>
          )}
        </div>

        {/* Top Countries */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">访问地区</h2>
          {analyticsLoading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : analytics?.topCountries?.length ? (
            <div className="space-y-3">
              {analytics.topCountries.slice(0, 5).map((country, index) => (
                <div key={country.country} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{country.country || '未知'}</span>
                      <span className="text-sm text-gray-500">{country.clicks}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(country.clicks / (analytics.totalClicks || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">暂无数据</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
