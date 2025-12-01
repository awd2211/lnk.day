import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Users,
  MousePointerClick,
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  RefreshCcw,
  Wifi,
  WifiOff,
  Zap,
  Link2,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';

interface RealtimeStats {
  activeUsers: number;
  clicksPerMinute: number;
  clicksLast5Min: number;
  clicksLast15Min: number;
  clicksLastHour: number;
  peakClicksToday: number;
  peakTimeToday: string;
  avgResponseTime: number;
  errorRate: number;
}

interface LiveClick {
  id: string;
  shortCode: string;
  originalUrl: string;
  timestamp: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
}

interface TopLink {
  id: string;
  shortCode: string;
  title: string;
  clicksLastHour: number;
  trend: number;
}

interface GeoData {
  country: string;
  clicks: number;
  percentage: number;
}

export default function RealtimePage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Realtime stats
  const { data: stats, refetch: refetchStats } = useQuery<RealtimeStats>({
    queryKey: ['realtime', 'stats'],
    queryFn: () => api.get('/proxy/realtime/stats').then((r) => r.data),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Top/Hot links
  const { data: topLinks, refetch: refetchClicks } = useQuery<TopLink[]>({
    queryKey: ['realtime', 'hot-links'],
    queryFn: () => api.get('/proxy/realtime/hot-links?limit=10').then((r) => r.data?.items || r.data?.data || []),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Timeline data
  const { data: timelineData } = useQuery({
    queryKey: ['realtime', 'timeline'],
    queryFn: () => api.get('/proxy/realtime/timeline?minutes=60').then((r) => r.data),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Geographic distribution
  const { data: geoData } = useQuery<GeoData[]>({
    queryKey: ['realtime', 'map'],
    queryFn: () => api.get('/proxy/realtime/map').then((r) => r.data?.countries || r.data?.data || []),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Simulate live clicks from timeline data
  const liveClicks: LiveClick[] = (timelineData?.recentClicks || []).slice(0, 20);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleManualRefresh = () => {
    refetchStats();
    refetchClicks();
    setLastUpdate(new Date());
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile') || device.toLowerCase().includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    return `${Math.floor(seconds / 3600)}小时前`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">实时数据</h2>
          <p className="text-muted-foreground">
            监控平台实时流量和用户活动
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </div>
          <Select
            value={String(refreshInterval)}
            onValueChange={(v) => setRefreshInterval(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3000">3秒</SelectItem>
              <SelectItem value="5000">5秒</SelectItem>
              <SelectItem value="10000">10秒</SelectItem>
              <SelectItem value="30000">30秒</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                自动刷新
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-2" />
                已暂停
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在线用户</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">当前活跃访客</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">每分钟点击</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.clicksPerMinute || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>最近5分钟: {stats?.clicksLast5Min || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">响应时间</CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.avgResponseTime || 0}ms</div>
            <div className="flex items-center text-xs">
              {(stats?.avgResponseTime || 0) < 100 ? (
                <Badge variant="outline" className="text-green-600">优秀</Badge>
              ) : (stats?.avgResponseTime || 0) < 300 ? (
                <Badge variant="outline" className="text-yellow-600">良好</Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">需优化</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日峰值</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.peakClicksToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              峰值时间: {stats?.peakTimeToday || '--:--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Click Feed */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <MousePointerClick className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              实时点击流
            </CardTitle>
            <CardDescription>最新的链接点击事件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {(liveClicks || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无实时数据</p>
                </div>
              ) : (
                (liveClicks || []).map((click, index) => (
                  <div
                    key={click.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${
                      index === 0 ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <div className="shrink-0">
                      {getDeviceIcon(click.device)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-primary">
                          /{click.shortCode}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {click.country}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {click.browser} · {click.os}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatTimeAgo(click.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              热门链接
            </CardTitle>
            <CardDescription>过去一小时点击最多的链接</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topLinks || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无数据</p>
                </div>
              ) : (
                (topLinks || []).map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono">/{link.shortCode}</code>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.title || '未命名链接'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{link.clicksLastHour}</div>
                      <div className="flex items-center text-xs">
                        {link.trend >= 0 ? (
                          <span className="text-green-600 flex items-center">
                            <ArrowUp className="h-3 w-3" />
                            {link.trend}%
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <ArrowDown className="h-3 w-3" />
                            {Math.abs(link.trend)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            地理分布
          </CardTitle>
          <CardDescription>过去一小时访客来源分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {(geoData || []).length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无地理数据</p>
              </div>
            ) : (
              (geoData || []).map((geo) => (
                <div
                  key={geo.country}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{geo.country}</p>
                    <p className="text-sm text-muted-foreground">
                      {geo.clicks} 点击
                    </p>
                  </div>
                  <Badge variant="secondary">{geo.percentage.toFixed(1)}%</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">最近15分钟</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.clicksLast15Min?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">次点击</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">最近1小时</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.clicksLastHour?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">次点击</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">错误率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((stats?.errorRate || 0) * 100).toFixed(2)}%
            </div>
            <Badge
              variant="outline"
              className={
                (stats?.errorRate || 0) < 0.01
                  ? 'text-green-600'
                  : (stats?.errorRate || 0) < 0.05
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }
            >
              {(stats?.errorRate || 0) < 0.01
                ? '正常'
                : (stats?.errorRate || 0) < 0.05
                ? '注意'
                : '异常'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
