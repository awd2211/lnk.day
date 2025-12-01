import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Trash2,
  QrCode,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  Clock,
  Calendar,
  TrendingUp,
  Users,
  MousePointer,
  Activity,
  ChevronDown,
  Settings,
  Shield,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useLink, useDeleteLink } from '@/hooks/useLinks';
import { useLinkAnalytics, useRealtimeAnalytics } from '@/hooks/useAnalytics';
import { RedirectRulesManager } from '@/components/links/RedirectRulesManager';
import { SecurityBadge } from '@/components/links/SecurityBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

type DateRange = '7d' | '14d' | '30d' | '90d';

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Queries
  const { data: link, isLoading: isLoadingLink } = useLink(id || '');
  const deleteLink = useDeleteLink();

  // Calculate date range
  const dateParams = useMemo(() => {
    const days = parseInt(dateRange);
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days));
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const { data: analytics, isLoading: isLoadingAnalytics } = useLinkAnalytics(
    id || '',
    dateParams
  );
  const { data: realtime } = useRealtimeAnalytics(id || '');

  const shortUrl = link ? `https://lnk.day/${link.shortCode}` : '';

  const copyToClipboard = async () => {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: '已复制到剪贴板' });
  };

  const handleDelete = async () => {
    if (!link) return;

    try {
      await deleteLink.mutateAsync(link.id);
      toast({ title: '链接已删除' });
      setShowDeleteConfirm(false);
      navigate('/links');
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    change,
    description,
  }: {
    title: string;
    value: string | number;
    icon: any;
    change?: number;
    description?: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change !== undefined && (
              <p
                className={cn(
                  'mt-1 text-xs',
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}% 较上期
              </p>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DistributionChart = ({
    data,
    title,
    icon: Icon,
  }: {
    data: Array<{ label: string; value: number; percentage: number }>;
    title: string;
    icon: any;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 5).map((item, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.value.toLocaleString()} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
          {data.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              暂无数据
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoadingLink) {
    return (
      <Layout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!link) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-medium">链接不存在</h2>
          <p className="mt-2 text-muted-foreground">该链接可能已被删除</p>
          <Button className="mt-4" onClick={() => navigate('/links')}>
            返回链接列表
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/links')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {link.title || link.shortCode}
                </h1>
                <Badge variant={link.status === 'active' ? 'default' : 'secondary'}>
                  {link.status === 'active' ? '活跃' : link.status === 'inactive' ? '禁用' : '已归档'}
                </Badge>
                <SecurityBadge url={link.originalUrl} showLabel />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {shortUrl}
              </a>
              <button
                onClick={copyToClipboard}
                className="rounded p-1 hover:bg-muted"
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <span className="mx-2 text-muted-foreground">→</span>
              <a
                href={link.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex max-w-md items-center gap-1 truncate text-muted-foreground hover:text-foreground"
              >
                {link.originalUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            {link.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {link.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">最近 7 天</SelectItem>
                <SelectItem value="14d">最近 14 天</SelectItem>
                <SelectItem value="30d">最近 30 天</SelectItem>
                <SelectItem value="90d">最近 90 天</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  操作
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/links/${id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑链接
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/qr?url=${encodeURIComponent(shortUrl)}`)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  生成二维码
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除链接
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              数据分析
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Settings className="h-4 w-4" />
              重定向规则
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              安全
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6 space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="总点击数"
                value={analytics?.totalClicks || link.clicks}
                icon={MousePointer}
              />
              <StatCard
                title="独立访客"
                value={analytics?.uniqueClicks || 0}
                icon={Users}
              />
              <StatCard
                title="实时访客"
                value={realtime?.currentVisitors || 0}
                icon={Activity}
                description="最近 5 分钟"
              />
              <StatCard
                title="平均日点击"
                value={
                  analytics?.clicksByDay?.length
                    ? Math.round(
                        analytics.totalClicks / analytics.clicksByDay.length
                      )
                    : 0
                }
                icon={TrendingUp}
              />
            </div>

            {/* Charts */}
            {isLoadingAnalytics ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : (
              <>
                {/* Click trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4" />
                      点击趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.clicksByDay && analytics.clicksByDay.length > 0 ? (
                      <div className="flex h-48 items-end gap-1">
                        {analytics.clicksByDay.map((day, i) => {
                          const maxClicks = Math.max(
                            ...analytics.clicksByDay.map((d) => d.clicks)
                          );
                          const height =
                            maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;
                          return (
                            <div
                              key={i}
                              className="flex flex-1 flex-col items-center gap-1"
                            >
                              <div
                                className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                                style={{ height: `${height}%`, minHeight: 4 }}
                                title={`${day.clicks} 点击`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(day.date), 'MM/dd', {
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center text-muted-foreground">
                        暂无数据
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Distribution charts */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <DistributionChart
                    title="地理位置"
                    icon={Globe}
                    data={
                      analytics?.countries?.map((c) => ({
                        label: c.country,
                        value: c.clicks,
                        percentage: c.percentage,
                      })) || []
                    }
                  />
                  <DistributionChart
                    title="设备类型"
                    icon={Smartphone}
                    data={
                      analytics?.devices?.map((d) => ({
                        label: d.device,
                        value: d.clicks,
                        percentage: d.percentage,
                      })) || []
                    }
                  />
                  <DistributionChart
                    title="浏览器"
                    icon={Chrome}
                    data={
                      analytics?.browsers?.map((b) => ({
                        label: b.browser,
                        value: b.clicks,
                        percentage: b.percentage,
                      })) || []
                    }
                  />
                </div>

                {/* Referrers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ExternalLink className="h-4 w-4" />
                      来源网站
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.referrers && analytics.referrers.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.referrers.slice(0, 10).map((ref, i) => (
                          <div key={i}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="truncate">
                                {ref.referrer || '直接访问'}
                              </span>
                              <span className="text-muted-foreground">
                                {ref.clicks.toLocaleString()} (
                                {ref.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <Progress value={ref.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">
                        暂无来源数据
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Hourly activity heatmap */}
                {analytics?.hourlyActivity && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        活跃时段热力图
                      </CardTitle>
                      <CardDescription>显示一周内各时段的点击分布</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {['日', '一', '二', '三', '四', '五', '六'].map((day, dayIndex) => (
                          <div key={dayIndex} className="flex items-center gap-1">
                            <span className="w-6 text-xs text-muted-foreground">
                              {day}
                            </span>
                            <div className="flex flex-1 gap-0.5">
                              {Array.from({ length: 24 }).map((_, hour) => {
                                const activity = analytics.hourlyActivity?.find(
                                  (a) => a.day === dayIndex && a.hour === hour
                                );
                                const maxClicks = Math.max(
                                  ...(analytics.hourlyActivity?.map((a) => a.clicks) || [1])
                                );
                                const intensity = activity
                                  ? Math.min(activity.clicks / maxClicks, 1)
                                  : 0;
                                return (
                                  <div
                                    key={hour}
                                    className="h-4 flex-1 rounded-sm"
                                    style={{
                                      backgroundColor: intensity > 0
                                        ? `rgba(var(--primary-rgb), ${0.2 + intensity * 0.8})`
                                        : 'rgb(var(--muted))',
                                    }}
                                    title={`${day} ${hour}:00 - ${activity?.clicks || 0} 点击`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                          <span>少</span>
                          <div className="flex gap-0.5">
                            {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                              <div
                                key={opacity}
                                className="h-3 w-3 rounded-sm"
                                style={{
                                  backgroundColor: `rgba(var(--primary-rgb), ${opacity})`,
                                }}
                              />
                            ))}
                          </div>
                          <span>多</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            <RedirectRulesManager linkId={id || ''} />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>安全扫描</CardTitle>
                <CardDescription>
                  检查目标链接的安全性
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <SecurityBadge url={link.originalUrl} showLabel size="lg" autoCheck />
                  <div className="flex-1">
                    <p className="text-sm">目标链接</p>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {link.originalUrl}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Link info footer */}
        <Card className="bg-muted/50">
          <CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                创建于{' '}
                {format(new Date(link.createdAt), 'yyyy-MM-dd HH:mm', {
                  locale: zhCN,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                更新于{' '}
                {format(new Date(link.updatedAt), 'yyyy-MM-dd HH:mm', {
                  locale: zhCN,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>累计 {(link.totalClicks ?? link.clicks ?? 0).toLocaleString()} 次点击</span>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="删除链接"
          description="确定要删除这个链接吗？此操作不可撤销。"
          confirmText="删除"
          onConfirm={handleDelete}
          isLoading={deleteLink.isPending}
          variant="destructive"
        />
      </div>
    </Layout>
  );
}
