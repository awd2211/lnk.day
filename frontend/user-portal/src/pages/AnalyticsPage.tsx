import { useState } from 'react';
import { TrendingUp, Users, MousePointer, Calendar } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClicksLineChart,
  DevicePieChart,
  BrowserPieChart,
  GeoBarChart,
  ReferrerChart,
  HourlyHeatmap,
  StatsCard,
} from '@/components/charts';
import { useTeamAnalytics } from '@/hooks/useAnalytics';

type DateRange = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const getDateParams = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { data: analytics, isLoading } = useTeamAnalytics(getDateParams());

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7 天' },
    { value: '30d', label: '30 天' },
    { value: '90d', label: '90 天' },
  ];

  // Calculate average daily clicks
  const avgDailyClicks = analytics?.clicksByDay?.length
    ? Math.round(analytics.totalClicks / analytics.clicksByDay.length)
    : 0;

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据分析</h1>
          <p className="text-muted-foreground">查看链接访问统计数据</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 rounded-lg border p-1">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={dateRange === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(option.value)}
                className="h-7 px-3"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="总点击量"
          value={analytics?.totalClicks || 0}
          icon={MousePointer}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          loading={isLoading}
        />
        <StatsCard
          title="独立访客"
          value={analytics?.uniqueVisitors || 0}
          icon={Users}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          loading={isLoading}
        />
        <StatsCard
          title="今日点击"
          value={analytics?.todayClicks || 0}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          loading={isLoading}
        />
        <StatsCard
          title="日均点击"
          value={avgDailyClicks}
          icon={Calendar}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          loading={isLoading}
        />
      </div>

      {/* Click Trends Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">点击趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ClicksLineChart data={analytics?.clicksByDay || []} height={300} />
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Device & Browser Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">设备与浏览器</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="device" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="device">设备类型</TabsTrigger>
                <TabsTrigger value="browser">浏览器</TabsTrigger>
              </TabsList>
              <TabsContent value="device">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <DevicePieChart data={analytics?.devices || []} height={280} />
                )}
              </TabsContent>
              <TabsContent value="browser">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <BrowserPieChart data={analytics?.browsers || []} height={280} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Geo Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">访问地区</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <GeoBarChart data={analytics?.countries || []} height={300} maxItems={6} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity Heatmap */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">访问时段分布</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <HourlyHeatmap data={analytics?.hourlyActivity || []} height={200} />
          )}
        </CardContent>
      </Card>

      {/* Referrer Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">流量来源</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ReferrerChart data={analytics?.referrers || []} height={300} maxItems={8} />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
