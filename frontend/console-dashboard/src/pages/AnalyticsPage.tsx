import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MousePointer,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Download,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { proxyService, dashboardService } from '@/lib/api';

interface AnalyticsSummary {
  todayClicks: number;
  weekClicks: number;
  monthClicks: number;
  totalClicks: number;
  todayChange: number;
  weekChange: number;
  monthChange: number;
  topCountries: Array<{ country: string; clicks: number }>;
  deviceDistribution: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browserDistribution: Array<{ browser: string; clicks: number; percentage: number }>;
  recentActivity: Array<{
    id: string;
    shortCode: string;
    clicks: number;
    timestamp: string;
  }>;
}

type Period = '7d' | '30d' | '90d';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
  { value: '90d', label: '近90天' },
];

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-500">-</span>;
  const isPositive = value > 0;
  return (
    <span
      className={`flex items-center gap-1 text-sm ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <TrendingDown className="h-4 w-4" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics-summary', period],
    queryFn: () => proxyService.getAnalyticsSummary(),
    refetchInterval: 60000, // Refresh every minute
  });

  const analytics = summary?.data as AnalyticsSummary | undefined;

  const deviceTotal =
    (analytics?.deviceDistribution?.desktop || 0) +
    (analytics?.deviceDistribution?.mobile || 0) +
    (analytics?.deviceDistribution?.tablet || 0);

  const devicePercentage = (value: number) =>
    deviceTotal > 0 ? ((value / deviceTotal) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">数据分析</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  period === p.value
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            导出报告
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">今日点击</h3>
            <MousePointer className="h-5 w-5 text-blue-500" />
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(analytics?.todayClicks || 0)}
              </p>
              <div className="mt-1">
                <ChangeIndicator value={analytics?.todayChange || 0} />
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">本周点击</h3>
            <Calendar className="h-5 w-5 text-green-500" />
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(analytics?.weekClicks || 0)}
              </p>
              <div className="mt-1">
                <ChangeIndicator value={analytics?.weekChange || 0} />
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">本月点击</h3>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(analytics?.monthClicks || 0)}
              </p>
              <div className="mt-1">
                <ChangeIndicator value={analytics?.monthChange || 0} />
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">总点击量</h3>
            <Globe className="h-5 w-5 text-orange-500" />
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <p className="mt-2 text-3xl font-bold">
              {formatNumber(analytics?.totalClicks || 0)}
            </p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Click Trends */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">点击趋势</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>图表功能开发中</p>
                <p className="mt-1 text-sm">将显示 {period} 的点击趋势</p>
              </div>
            </div>
          )}
        </div>

        {/* Geographic Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">地理分布</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : analytics?.topCountries?.length ? (
            <div className="space-y-3">
              {analytics.topCountries.slice(0, 5).map((country, index) => (
                <div key={country.country} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm text-gray-500">
                    {index + 1}
                  </span>
                  <span className="flex-1">{country.country}</span>
                  <span className="font-medium">
                    {formatNumber(country.clicks)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <div className="text-center">
                <Globe className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>暂无地理数据</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device & Browser Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">设备分布</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : deviceTotal > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Monitor className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>桌面端</span>
                    <span className="font-medium">
                      {devicePercentage(analytics?.deviceDistribution?.desktop || 0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${devicePercentage(analytics?.deviceDistribution?.desktop || 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>移动端</span>
                    <span className="font-medium">
                      {devicePercentage(analytics?.deviceDistribution?.mobile || 0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{
                        width: `${devicePercentage(analytics?.deviceDistribution?.mobile || 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Tablet className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>平板</span>
                    <span className="font-medium">
                      {devicePercentage(analytics?.deviceDistribution?.tablet || 0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{
                        width: `${devicePercentage(analytics?.deviceDistribution?.tablet || 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <div className="text-center">
                <Smartphone className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>暂无设备数据</p>
              </div>
            </div>
          )}
        </div>

        {/* Browser Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">浏览器分布</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : analytics?.browserDistribution?.length ? (
            <div className="space-y-3">
              {analytics.browserDistribution.slice(0, 5).map((browser) => (
                <div key={browser.browser} className="flex items-center gap-3">
                  <span className="w-24">{browser.browser}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${browser.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-sm font-medium">
                    {browser.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <div className="text-center">
                <Globe className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>暂无浏览器数据</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">最近活动</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-4 flex-1 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : analytics?.recentActivity?.length ? (
          <div className="space-y-3">
            {analytics.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
              >
                <span className="font-mono text-sm text-blue-600">
                  /{activity.shortCode}
                </span>
                <span className="text-gray-500">
                  {activity.clicks} 次点击
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(activity.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">暂无活动数据</div>
        )}
      </div>
    </div>
  );
}
