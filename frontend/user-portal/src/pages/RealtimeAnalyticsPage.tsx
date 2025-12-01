import { useState, useEffect } from 'react';
import { Activity, Users, MousePointer, Clock, Zap, RefreshCw } from 'lucide-react';

import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamRealtimeAnalytics, useTeamAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 500;
    const steps = 20;
    const stepDuration = duration / steps;
    const diff = value - displayValue;
    const stepValue = diff / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => Math.round(prev + stepValue));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}

function PulsingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
    </span>
  );
}

export default function RealtimeAnalyticsPage() {
  const { user } = useAuth();
  const teamId = user?.id; // 使用用户 ID 作为团队 ID（个人空间）

  const { data: realtimeData, isLoading: realtimeLoading } = useTeamRealtimeAnalytics(teamId);
  const { data: teamAnalytics, isLoading: analyticsLoading } = useTeamAnalytics({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (realtimeData) {
      setLastUpdate(new Date());
    }
  }, [realtimeData]);

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">实时数据</h1>
            <Badge variant="outline" className="flex items-center gap-1.5 text-green-600 border-green-200 bg-green-50">
              <PulsingDot />
              实时更新
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">监控链接访问的实时动态</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          <span>每 5 秒自动刷新</span>
          <span className="text-xs">
            (最后更新: {lastUpdate.toLocaleTimeString('zh-CN')})
          </span>
        </div>
      </div>

      {/* 实时统计卡片 */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 当前分钟点击 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前分钟</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {realtimeLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-blue-600">
                <AnimatedNumber value={realtimeData?.clicks_this_minute || 0} />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">次点击</p>
          </CardContent>
        </Card>

        {/* 最近 5 分钟点击 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最近 5 分钟</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {realtimeLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-green-600">
                <AnimatedNumber value={realtimeData?.clicks_last_5_minutes || 0} />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">次点击</p>
          </CardContent>
        </Card>

        {/* 当前小时点击 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前小时</CardTitle>
            <MousePointer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {realtimeLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-purple-600">
                <AnimatedNumber value={realtimeData?.clicks_this_hour || 0} />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">次点击</p>
          </CardContent>
        </Card>

        {/* 今日总点击 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日累计</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-orange-600">
                <AnimatedNumber value={teamAnalytics?.todayClicks || 0} />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">次点击</p>
          </CardContent>
        </Card>
      </div>

      {/* 实时活动流 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              活动概览
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 点击率指标 */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">平均每分钟</span>
                  <span className="text-lg font-semibold">
                    {realtimeData?.clicks_last_5_minutes
                      ? Math.round(realtimeData.clicks_last_5_minutes / 5)
                      : 0}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        ((realtimeData?.clicks_last_5_minutes || 0) / 5 / 10) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">平均每小时</span>
                  <span className="text-lg font-semibold">
                    {teamAnalytics?.clicksByDay?.length
                      ? Math.round(teamAnalytics.totalClicks / teamAnalytics.clicksByDay.length / 24)
                      : 0}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        ((realtimeData?.clicks_this_hour || 0) / 100) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">独立访客（今日）</span>
                  <span className="text-lg font-semibold">
                    {teamAnalytics?.uniqueVisitors || 0}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        ((teamAnalytics?.uniqueVisitors || 0) / (teamAnalytics?.totalClicks || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 实时状态指示器 */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PulsingDot />
                  <span className="text-sm font-medium">系统状态</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  正常运行
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                数据实时同步中，延迟 &lt; 5 秒
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
