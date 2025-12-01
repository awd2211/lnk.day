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
  Loader2,
  CheckCircle,
  Zap,
  Target,
  Infinity,
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
import { quotaService } from '@/lib/api';

// Type definitions matching backend
interface PlanLimits {
  maxLinks: number;
  maxClicks: number;
  maxQrCodes: number;
  maxTeamMembers: number;
  maxCustomDomains: number;
  maxCampaigns: number;
  maxApiRequests: number;
  retentionDays: number;
  features: {
    customBranding: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
    bulkOperations: boolean;
    abtesting: boolean;
    deepLinks: boolean;
    passwordProtection: boolean;
    expiringLinks: boolean;
    geoTargeting: boolean;
    deviceTargeting: boolean;
  };
}

interface TeamQuota {
  id: string;
  teamId: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  linksUsed: number;
  clicksUsed: number;
  qrCodesUsed: number;
  apiRequestsUsed: number;
  billingCycleStart?: string;
  billingCycleEnd?: string;
  customLimits?: Partial<PlanLimits>;
  createdAt: string;
  updatedAt: string;
}

interface QuotaUsageResponse {
  quota: TeamQuota;
  limits: PlanLimits;
  usage: {
    links: { used: number; limit: number; percentage: number };
    clicks: { used: number; limit: number; percentage: number };
    qrCodes: { used: number; limit: number; percentage: number };
    apiRequests: { used: number; limit: number; percentage: number };
  };
}

interface QuotaUsageLog {
  id: string;
  teamId: string;
  resourceType: string;
  action: string;
  amount: number;
  resourceId?: string;
  timestamp: string;
}

interface PlanInfo {
  plan: string;
  limits: PlanLimits;
}

interface QuotaItem {
  name: string;
  key: keyof QuotaUsageResponse['usage'];
  unit: string;
  icon: React.ReactNode;
  description: string;
}

function QuotaPage() {
  // Fetch quota usage data
  const { data: usageData, isLoading: usageLoading } = useQuery<QuotaUsageResponse>({
    queryKey: ['quota-usage'],
    queryFn: async () => {
      const response = await quotaService.getUsage();
      return response.data;
    },
  });

  // Fetch usage logs
  const { data: logsData, isLoading: logsLoading } = useQuery<QuotaUsageLog[]>({
    queryKey: ['quota-logs'],
    queryFn: async () => {
      const response = await quotaService.getLogs({ limit: 50 });
      return response.data;
    },
  });

  // Fetch available plans
  const { data: plansData, isLoading: plansLoading } = useQuery<PlanInfo[]>({
    queryKey: ['quota-plans'],
    queryFn: async () => {
      const response = await quotaService.getPlans();
      return response.data;
    },
  });

  const quotaItems: QuotaItem[] = [
    {
      name: '链接数量',
      key: 'links',
      unit: '个',
      icon: <Link2 className="h-5 w-5" />,
      description: '已创建的短链接总数',
    },
    {
      name: '月点击量',
      key: 'clicks',
      unit: '次',
      icon: <MousePointerClick className="h-5 w-5" />,
      description: '本月链接点击次数',
    },
    {
      name: 'QR 码数量',
      key: 'qrCodes',
      unit: '个',
      icon: <QrCode className="h-5 w-5" />,
      description: '已创建的 QR 码总数',
    },
    {
      name: 'API 调用',
      key: 'apiRequests',
      unit: '次/月',
      icon: <Key className="h-5 w-5" />,
      description: '本月 API 调用次数',
    },
  ];

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-orange-500';
    return 'text-green-500';
  };

  const formatNumber = (num: number) => {
    if (num === -1) return '无限';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return '无限';
    return formatNumber(limit);
  };

  const getPlanDisplayName = (plan: string) => {
    const names: Record<string, string> = {
      free: '免费版',
      starter: '入门版',
      pro: 'Pro 版',
      enterprise: '企业版',
    };
    return names[plan] || plan;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatResourceType = (type: string) => {
    const types: Record<string, string> = {
      links: '链接',
      clicks: '点击',
      qrCodes: 'QR码',
      apiRequests: 'API请求',
    };
    return types[type] || type;
  };

  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      increment: '增加',
      decrement: '减少',
    };
    return actions[action] || action;
  };

  if (usageLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const usage = usageData?.usage;
  const quota = usageData?.quota;
  const limits = usageData?.limits;

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
        {quota && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {getPlanDisplayName(quota.plan)}
                      </h3>
                      <Badge variant="secondary">当前方案</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      计费周期: {formatDate(quota.billingCycleStart)} - {formatDate(quota.billingCycleEnd)}
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
        )}

        {/* Quota Overview Cards */}
        {usage && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quotaItems.map((item) => {
              const usageItem = usage[item.key];
              const isUnlimited = usageItem.limit === -1;
              const percentage = isUnlimited ? 0 : usageItem.percentage;

              return (
                <Card key={item.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                    <div className={isUnlimited ? 'text-primary' : getUsageColor(percentage)}>
                      {item.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{formatNumber(usageItem.used)}</span>
                      <span className="text-sm text-muted-foreground">
                        / {formatLimit(usageItem.limit)} {item.unit}
                      </span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="mt-2">
                            {isUnlimited ? (
                              <div className="flex items-center gap-1 text-xs text-primary">
                                <Infinity className="h-3 w-3" />
                                <span>无限制</span>
                              </div>
                            ) : (
                              <Progress
                                value={percentage}
                                className={`h-2 ${percentage >= 90 ? '[&>div]:bg-destructive' : percentage >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                              />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isUnlimited ? '无限制' : `${percentage.toFixed(1)}% 已使用`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {!isUnlimited && percentage >= 75 && (
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
        )}

        {/* Detailed Quota Table */}
        {usage && limits && (
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
                    const usageItem = usage[item.key];
                    const isUnlimited = usageItem.limit === -1;
                    const percentage = isUnlimited ? 0 : usageItem.percentage;

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
                          {formatNumber(usageItem.used)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatLimit(usageItem.limit)} {item.unit}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${isUnlimited ? 'text-primary' : getUsageColor(percentage)}`}>
                          {isUnlimited ? '-' : `${percentage.toFixed(1)}%`}
                        </TableCell>
                        <TableCell>
                          {isUnlimited ? (
                            <div className="flex items-center gap-1 text-xs text-primary">
                              <Infinity className="h-3 w-3" />
                              <span>无限制</span>
                            </div>
                          ) : (
                            <Progress
                              value={percentage}
                              className={`h-2 ${percentage >= 90 ? '[&>div]:bg-destructive' : percentage >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Additional limits */}
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground">
                          <Users className="h-5 w-5" />
                        </div>
                        <span className="font-medium">团队成员</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      团队成员数量限制
                    </TableCell>
                    <TableCell className="text-right font-medium">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatLimit(limits.maxTeamMembers)} 人
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground">
                          <Globe className="h-5 w-5" />
                        </div>
                        <span className="font-medium">自定义域名</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      可绑定的自定义域名数
                    </TableCell>
                    <TableCell className="text-right font-medium">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatLimit(limits.maxCustomDomains)} 个
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground">
                          <Target className="h-5 w-5" />
                        </div>
                        <span className="font-medium">营销活动</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      可创建的营销活动数量
                    </TableCell>
                    <TableCell className="text-right font-medium">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatLimit(limits.maxCampaigns)} 个
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Usage Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              使用日志
            </CardTitle>
            <CardDescription>
              最近的资源使用记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logsData && logsData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>资源类型</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>资源ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatResourceType(log.resourceType)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.action === 'increment' ? 'default' : 'secondary'}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.action === 'increment' ? '+' : '-'}{log.amount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {log.resourceId ? log.resourceId.slice(0, 8) + '...' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无使用记录
              </div>
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
            {plansLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : plansData ? (
              <div className="grid gap-4 md:grid-cols-4">
                {plansData.map((planInfo) => {
                  const isCurrent = quota?.plan === planInfo.plan;

                  return (
                    <div
                      key={planInfo.plan}
                      className={`border rounded-lg p-4 relative ${isCurrent ? 'border-2 border-primary' : ''}`}
                    >
                      {isCurrent && (
                        <Badge className="absolute -top-2 right-4">当前</Badge>
                      )}
                      <h4 className="font-semibold mb-3">
                        {getPlanDisplayName(planInfo.plan)}
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          {formatLimit(planInfo.limits.maxLinks)} 个链接
                        </li>
                        <li className="flex items-center gap-2">
                          <MousePointerClick className="h-4 w-4" />
                          {formatLimit(planInfo.limits.maxClicks)} 点击/月
                        </li>
                        <li className="flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          {formatLimit(planInfo.limits.maxQrCodes)} 个 QR 码
                        </li>
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {formatLimit(planInfo.limits.maxTeamMembers)} 个成员
                        </li>
                        <li className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {formatLimit(planInfo.limits.maxCustomDomains)} 个域名
                        </li>
                        <li className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          {formatLimit(planInfo.limits.maxApiRequests)} API/月
                        </li>
                      </ul>

                      {/* Features */}
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium mb-2">功能</p>
                        <div className="space-y-1">
                          {planInfo.limits.features.apiAccess && (
                            <p className="text-xs text-green-600">API 访问</p>
                          )}
                          {planInfo.limits.features.advancedAnalytics && (
                            <p className="text-xs text-green-600">高级分析</p>
                          )}
                          {planInfo.limits.features.customBranding && (
                            <p className="text-xs text-green-600">自定义品牌</p>
                          )}
                          {planInfo.limits.features.abtesting && (
                            <p className="text-xs text-green-600">A/B 测试</p>
                          )}
                          {planInfo.limits.features.geoTargeting && (
                            <p className="text-xs text-green-600">地理定向</p>
                          )}
                        </div>
                      </div>

                      {!isCurrent && planInfo.plan !== 'free' && (
                        <Button
                          className="w-full mt-4"
                          variant={planInfo.plan === 'enterprise' ? 'outline' : 'default'}
                        >
                          {planInfo.plan === 'enterprise' ? '联系销售' : '升级'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                无法加载套餐信息
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default QuotaPage;
