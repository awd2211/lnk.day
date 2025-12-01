import { Link } from 'react-router-dom';
import {
  Link2,
  MousePointerClick,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLinks } from '@/hooks/useLinks';
import { useAnalyticsSummary, useClickTrends } from '@/hooks/useAnalytics';

export default function DashboardPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: linksData, isLoading: linksLoading } = useLinks({ limit: 5 });
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();

  // Click trends for chart
  const { data: trends } = useClickTrends('7d');

  // Generate trends data from API or fallback
  const trendData = (trends?.data && Array.isArray(trends.data) ? trends.data : null) || Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), 6 - i), 'MM/dd'),
    clicks: 0,
  }));

  // Device distribution from analytics API
  const deviceColors: Record<string, string> = {
    mobile: '#3b82f6',
    desktop: '#8b5cf6',
    tablet: '#f59e0b',
    other: '#6b7280',
  };

  const deviceData = analytics?.topDevices?.length
    ? analytics.topDevices.map((d) => {
        const total = analytics.topDevices!.reduce((sum, item) => sum + item.clicks, 0);
        return {
          name: d.device === 'mobile' ? 'Mobile' : d.device === 'desktop' ? 'Desktop' : d.device === 'tablet' ? 'Tablet' : d.device,
          value: total > 0 ? Math.round((d.clicks / total) * 100) : 0,
          color: deviceColors[d.device.toLowerCase()] || '#6b7280',
        };
      })
    : [
        { name: 'Mobile', value: 0, color: '#3b82f6' },
        { name: 'Desktop', value: 0, color: '#8b5cf6' },
        { name: 'Tablet', value: 0, color: '#f59e0b' },
      ];

  // 从趋势数据计算变化率
  const calculateChange = () => {
    if (!trends?.data || !Array.isArray(trends.data) || trends.data.length < 2) {
      return { clicksChange: null, todayChange: null };
    }

    const data = trends.data;
    // 计算本周与上周的变化
    const halfLength = Math.floor(data.length / 2);
    const recentClicks = data.slice(halfLength).reduce((sum: number, d: { clicks: number }) => sum + d.clicks, 0);
    const previousClicks = data.slice(0, halfLength).reduce((sum: number, d: { clicks: number }) => sum + d.clicks, 0);

    const clicksChange = previousClicks > 0
      ? Math.round((recentClicks - previousClicks) / previousClicks * 100)
      : null;

    // 今日与昨日对比
    const todayClicks = data[data.length - 1]?.clicks || 0;
    const yesterdayClicks = data[data.length - 2]?.clicks || 0;
    const todayChange = yesterdayClicks > 0
      ? Math.round((todayClicks - yesterdayClicks) / yesterdayClicks * 100)
      : null;

    return { clicksChange, todayChange };
  };

  const { clicksChange, todayChange } = calculateChange();

  const stats = [
    {
      label: '总链接数',
      value: linksData?.total || 0,
      icon: Link2,
      color: 'bg-blue-500',
      change: null as number | null, // 链接数暂无变化率
    },
    {
      label: '总点击数',
      value: analytics?.totalClicks || 0,
      icon: MousePointerClick,
      color: 'bg-green-500',
      change: clicksChange,
    },
    {
      label: '今日点击',
      value: analytics?.todayClicks || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: todayChange,
    },
    {
      label: '独立访客',
      value: analytics?.uniqueVisitors || 0,
      icon: Globe,
      color: 'bg-orange-500',
      change: null as number | null, // 访客数暂无变化率
    },
  ];

  const handleCopy = (shortCode: string, id: string) => {
    navigator.clipboard.writeText(`https://lnk.day/${shortCode}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickActions = [
    { label: '创建链接', icon: Plus, to: '/links', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: '生成二维码', icon: QrCode, to: '/qr-codes', color: 'bg-purple-500 hover:bg-purple-600' },
    { label: '查看分析', icon: BarChart3, to: '/analytics', color: 'bg-green-500 hover:bg-green-600' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">仪表盘</h1>
            <p className="text-gray-500">欢迎回来，查看您的链接数据</p>
          </div>
          <div className="flex gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} to={action.to}>
                  <Button className={action.color}>
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const hasChange = stat.change !== null && stat.change !== undefined;
            const isPositive = hasChange && (stat.change ?? 0) >= 0;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-lg ${stat.color} p-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {hasChange && (
                      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {Math.abs(stat.change!)}%
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-2xl font-bold">
                    {linksLoading || analyticsLoading ? '...' : stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Click Trends */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                点击趋势 (7天)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
            </CardContent>
          </Card>

          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                设备分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, '占比']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {deviceData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Links */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                最近链接
              </CardTitle>
              <Link to="/links" className="text-sm text-primary hover:underline">
                查看全部
              </Link>
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <div className="py-8 text-center text-muted-foreground">加载中...</div>
              ) : linksData?.items?.length ? (
                <div className="space-y-3">
                  {linksData.items.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-primary">
                            lnk.day/{link.shortCode}
                          </p>
                          <button
                            onClick={() => handleCopy(link.shortCode, link.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{link.originalUrl}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{link.clicks}</p>
                          <p className="text-xs text-muted-foreground">点击</p>
                        </div>
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">暂无链接</p>
                  <Link to="/links">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      创建第一个链接
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Countries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                访问地区
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="py-8 text-center text-muted-foreground">加载中...</div>
              ) : analytics?.topCountries?.length ? (
                <div className="space-y-3">
                  {analytics.topCountries.slice(0, 5).map((country, index) => (
                    <div key={country.country} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{country.country || '未知'}</span>
                          <span className="text-sm text-muted-foreground">
                            {country.clicks.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
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
                <div className="py-8 text-center text-muted-foreground">
                  <Globe className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p>暂无地区数据</p>
                  <p className="text-sm mt-1">开始分享链接后将显示访问来源</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Tips */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">提升链接效果</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  使用 UTM 参数追踪营销活动效果，或创建二维码让线下用户更方便访问。
                </p>
                <div className="mt-3 flex gap-2">
                  <Link to="/links">
                    <Button variant="outline" size="sm">
                      添加 UTM 参数
                    </Button>
                  </Link>
                  <Link to="/qr-codes">
                    <Button variant="outline" size="sm">
                      生成二维码
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
