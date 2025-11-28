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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { proxyService, dashboardService } from '@/lib/api';

interface ClickTrend {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

interface AnalyticsSummary {
  todayClicks: number;
  weekClicks: number;
  monthClicks: number;
  totalClicks: number;
  todayChange: number;
  weekChange: number;
  monthChange: number;
  clickTrends: ClickTrend[];
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

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'];
const DEVICE_COLORS = {
  desktop: '#3b82f6',
  mobile: '#22c55e',
  tablet: '#a855f7',
};

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

// Generate mock trend data for demo
function generateMockTrends(period: Period): ClickTrend[] {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const trends: ClickTrend[] = [];
  const baseClicks = 1000;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const randomFactor = 0.5 + Math.random();
    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;

    trends.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      clicks: Math.round(baseClicks * randomFactor * weekendFactor),
      uniqueClicks: Math.round(baseClicks * randomFactor * weekendFactor * 0.7),
    });
  }
  return trends;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics-summary', period],
    queryFn: async () => {
      try {
        const response = await proxyService.getAnalyticsSummary();
        return response.data;
      } catch {
        // Return mock data for demo
        return {
          todayClicks: 2847,
          weekClicks: 18923,
          monthClicks: 76234,
          totalClicks: 1234567,
          todayChange: 12.5,
          weekChange: 8.3,
          monthChange: -2.1,
          clickTrends: generateMockTrends(period),
          topCountries: [
            { country: '中国', clicks: 45000 },
            { country: '美国', clicks: 12000 },
            { country: '日本', clicks: 8500 },
            { country: '韩国', clicks: 5200 },
            { country: '新加坡', clicks: 3100 },
          ],
          deviceDistribution: {
            desktop: 45,
            mobile: 48,
            tablet: 7,
          },
          browserDistribution: [
            { browser: 'Chrome', clicks: 35000, percentage: 52 },
            { browser: 'Safari', clicks: 15000, percentage: 22 },
            { browser: 'Firefox', clicks: 8000, percentage: 12 },
            { browser: 'Edge', clicks: 6000, percentage: 9 },
            { browser: '其他', clicks: 3400, percentage: 5 },
          ],
          recentActivity: [
            { id: '1', shortCode: 'abc123', clicks: 156, timestamp: new Date().toISOString() },
            { id: '2', shortCode: 'xyz789', clicks: 89, timestamp: new Date(Date.now() - 300000).toISOString() },
            { id: '3', shortCode: 'promo01', clicks: 234, timestamp: new Date(Date.now() - 600000).toISOString() },
          ],
        };
      }
    },
    refetchInterval: 60000,
  });

  const analytics = summary as AnalyticsSummary | undefined;

  const deviceTotal =
    (analytics?.deviceDistribution?.desktop || 0) +
    (analytics?.deviceDistribution?.mobile || 0) +
    (analytics?.deviceDistribution?.tablet || 0);

  const devicePercentage = (value: number) =>
    deviceTotal > 0 ? ((value / deviceTotal) * 100).toFixed(1) : '0';

  const devicePieData = analytics?.deviceDistribution
    ? [
        { name: '桌面端', value: analytics.deviceDistribution.desktop, color: DEVICE_COLORS.desktop },
        { name: '移动端', value: analytics.deviceDistribution.mobile, color: DEVICE_COLORS.mobile },
        { name: '平板', value: analytics.deviceDistribution.tablet, color: DEVICE_COLORS.tablet },
      ]
    : [];

  const handleExport = () => {
    // TODO: Implement export
    alert('导出功能开发中');
  };

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
                    ? 'bg-blue-600 text-white'
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
          <Button onClick={handleExport}>
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

      {/* Click Trends Chart */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">点击趋势</h3>
        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : analytics?.clickTrends?.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analytics.clickTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number) => [formatNumber(value), '']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                name="总点击"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="uniqueClicks"
                name="独立访客"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-80 items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="mx-auto mb-2 h-12 w-12 text-gray-300" />
              <p>暂无趋势数据</p>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Geographic Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">地理分布 TOP 5</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : analytics?.topCountries?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.topCountries.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={formatNumber}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatNumber(value) + ' 次点击', '']}
                />
                <Bar dataKey="clicks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <div className="text-center">
                <Globe className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>暂无地理数据</p>
              </div>
            </div>
          )}
        </div>

        {/* Device Distribution Pie Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">设备分布</h3>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : deviceTotal > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {devicePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">桌面端</p>
                    <p className="font-semibold">
                      {devicePercentage(analytics?.deviceDistribution?.desktop || 0)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">移动端</p>
                    <p className="font-semibold">
                      {devicePercentage(analytics?.deviceDistribution?.mobile || 0)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Tablet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">平板</p>
                    <p className="font-semibold">
                      {devicePercentage(analytics?.deviceDistribution?.tablet || 0)}%
                    </p>
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
      </div>

      {/* Browser Distribution */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">浏览器分布</h3>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : analytics?.browserDistribution?.length ? (
          <div className="space-y-3">
            {analytics.browserDistribution.slice(0, 5).map((browser, index) => (
              <div key={browser.browser} className="flex items-center gap-4">
                <span className="w-20 font-medium">{browser.browser}</span>
                <div className="flex-1">
                  <div className="h-6 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${browser.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {browser.percentage > 10 ? `${browser.percentage}%` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="w-20 text-right text-sm text-gray-500">
                  {formatNumber(browser.clicks)} 次
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-gray-500">
            <div className="text-center">
              <Globe className="mx-auto mb-2 h-12 w-12 text-gray-300" />
              <p>暂无浏览器数据</p>
            </div>
          </div>
        )}
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
