import { useQuery } from '@tanstack/react-query';
import {
  Link2,
  MousePointerClick,
  QrCode,
  Key,
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  Globe,
  FileImage,
  Smartphone,
  BarChart3,
  Loader2,
  CheckCircle,
  Zap,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface QuotaItem {
  name: string;
  used: number;
  limit: number;
  unit: string;
  icon: React.ReactNode;
  description: string;
}

interface UsageHistory {
  date: string;
  links: number;
  clicks: number;
  api_calls: number;
}

function QuotaPage() {
  const { user } = useAuth();

  // Fetch quota data
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: async () => {
      const response = await api.get('/api/v1/quota');
      return response.data;
    },
  });

  // Fetch usage history
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['quota-usage'],
    queryFn: async () => {
      const response = await api.get('/api/v1/quota/usage');
      return response.data;
    },
  });

  // Mock data for demonstration
  const quota = quotaData || {
    plan: 'Pro',
    renewDate: '2024-02-01',
    quotas: {
      links: { used: 2847, limit: 10000 },
      clicks: { used: 456000, limit: 1000000 },
      qrCodes: { used: 156, limit: 500 },
      apiCalls: { used: 12500, limit: 50000 },
      teamMembers: { used: 8, limit: 25 },
      customDomains: { used: 3, limit: 10 },
      bioLinks: { used: 5, limit: 20 },
      deepLinks: { used: 45, limit: 200 },
    },
  };

  const usageHistory: UsageHistory[] = usageData?.history || [
    { date: '2024-01-01', links: 120, clicks: 45000, api_calls: 3500 },
    { date: '2024-01-08', links: 95, clicks: 52000, api_calls: 4200 },
    { date: '2024-01-15', links: 143, clicks: 48000, api_calls: 3800 },
    { date: '2024-01-22', links: 88, clicks: 61000, api_calls: 5100 },
  ];

  const quotaItems: QuotaItem[] = [
    {
      name: '链接数量',
      used: quota.quotas.links.used,
      limit: quota.quotas.links.limit,
      unit: '个',
      icon: <Link2 className="h-5 w-5" />,
      description: '已创建的短链接总数',
    },
    {
      name: '月点击量',
      used: quota.quotas.clicks.used,
      limit: quota.quotas.clicks.limit,
      unit: '次',
      icon: <MousePointerClick className="h-5 w-5" />,
      description: '本月链接点击次数',
    },
    {
      name: 'QR 码数量',
      used: quota.quotas.qrCodes.used,
      limit: quota.quotas.qrCodes.limit,
      unit: '个',
      icon: <QrCode className="h-5 w-5" />,
      description: '已创建的 QR 码总数',
    },
    {
      name: 'API 调用',
      used: quota.quotas.apiCalls.used,
      limit: quota.quotas.apiCalls.limit,
      unit: '次/月',
      icon: <Key className="h-5 w-5" />,
      description: '本月 API 调用次数',
    },
    {
      name: '团队成员',
      used: quota.quotas.teamMembers.used,
      limit: quota.quotas.teamMembers.limit,
      unit: '人',
      icon: <Users className="h-5 w-5" />,
      description: '团队成员数量限制',
    },
    {
      name: '自定义域名',
      used: quota.quotas.customDomains.used,
      limit: quota.quotas.customDomains.limit,
      unit: '个',
      icon: <Globe className="h-5 w-5" />,
      description: '可绑定的自定义域名数',
    },
    {
      name: 'Bio 链接',
      used: quota.quotas.bioLinks.used,
      limit: quota.quotas.bioLinks.limit,
      unit: '个',
      icon: <FileImage className="h-5 w-5" />,
      description: 'Bio 链接页面数量',
    },
    {
      name: '深度链接',
      used: quota.quotas.deepLinks.used,
      limit: quota.quotas.deepLinks.limit,
      unit: '个',
      icon: <Smartphone className="h-5 w-5" />,
      description: '移动端深度链接数量',
    },
  ];

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-orange-500';
    return 'text-green-500';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (quotaLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">配额与使用情况</h1>
            <p className="text-muted-foreground">
              查看您的账户资源使用情况和配额限制
            </p>
          </div>
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            升级套餐
          </Button>
        </div>

        {/* Plan Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{quota.plan} 套餐</h3>
                    <Badge variant="secondary">当前方案</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    下次续期: {new Date(quota.renewDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">需要更多配额？</p>
                <Button variant="link" className="p-0 h-auto">
                  查看升级选项 <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quota Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quotaItems.slice(0, 4).map((item) => {
            const percentage = getUsagePercentage(item.used, item.limit);
            return (
              <Card key={item.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                  <div className={getUsageColor(percentage)}>{item.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{formatNumber(item.used)}</span>
                    <span className="text-sm text-muted-foreground">
                      / {formatNumber(item.limit)} {item.unit}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-2">
                          <Progress
                            value={percentage}
                            className={`h-2 ${percentage >= 90 ? '[&>div]:bg-destructive' : percentage >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{percentage.toFixed(1)}% 已使用</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {percentage >= 75 && (
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <AlertTriangle className={`h-3 w-3 ${getUsageColor(percentage)}`} />
                      <span className={getUsageColor(percentage)}>
                        {percentage >= 90 ? '即将达到上限' : '使用量较高'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Quota Table */}
        <Card>
          <CardHeader>
            <CardTitle>配额详情</CardTitle>
            <CardDescription>
              所有资源配额的详细使用情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资源类型</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="text-right">已使用</TableHead>
                  <TableHead className="text-right">配额上限</TableHead>
                  <TableHead className="text-right">使用率</TableHead>
                  <TableHead className="w-[200px]">进度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotaItems.map((item) => {
                  const percentage = getUsagePercentage(item.used, item.limit);
                  return (
                    <TableRow key={item.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">{item.icon}</div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(item.used)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(item.limit)} {item.unit}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getUsageColor(percentage)}`}>
                        {percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Progress
                          value={percentage}
                          className={`h-2 ${percentage >= 90 ? '[&>div]:bg-destructive' : percentage >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              使用趋势
            </CardTitle>
            <CardDescription>
              最近的资源使用记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周期</TableHead>
                    <TableHead className="text-right">新建链接</TableHead>
                    <TableHead className="text-right">点击量</TableHead>
                    <TableHead className="text-right">API 调用</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageHistory.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {new Date(record.date).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                        })} - {new Date(new Date(record.date).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">{record.links}</TableCell>
                      <TableCell className="text-right">{formatNumber(record.clicks)}</TableCell>
                      <TableCell className="text-right">{formatNumber(record.api_calls)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>套餐对比</CardTitle>
            <CardDescription>
              比较不同套餐的配额限制
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Free Plan */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">免费版</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> 100 个链接
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" /> 10K 点击/月
                  </li>
                  <li className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> 10 个 QR 码
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> 1 个成员
                  </li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="border-2 border-primary rounded-lg p-4 relative">
                <Badge className="absolute -top-2 right-4">当前</Badge>
                <h4 className="font-semibold mb-2">Pro 版</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> 10,000 个链接
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" /> 1M 点击/月
                  </li>
                  <li className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> 500 个 QR 码
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> 25 个成员
                  </li>
                </ul>
              </div>

              {/* Enterprise Plan */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">企业版</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> 无限链接
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" /> 无限点击
                  </li>
                  <li className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> 无限 QR 码
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> 无限成员
                  </li>
                </ul>
                <Button className="w-full mt-4" variant="outline">
                  联系销售
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default QuotaPage;
