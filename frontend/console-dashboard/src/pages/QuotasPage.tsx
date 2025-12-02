import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gauge,
  Search,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Building2,
  Link2,
  MousePointerClick,
  QrCode,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  Filter,
  Download,
  Settings,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface UsageItem {
  used: number;
  limit: number;
  percentage: number;
}

interface TeamQuota {
  id: string;
  teamId: string;
  teamName?: string;
  plan: string;
  linksUsed: number;
  clicksUsed: number;
  qrCodesUsed: number;
  apiRequestsUsed: number;
  billingCycleStart: string;
  billingCycleEnd: string;
  customLimits: any;
  limits: {
    maxLinks: number;
    maxClicks: number;
    maxQrCodes: number;
    maxTeamMembers: number;
    maxCustomDomains: number;
    maxCampaigns: number;
    maxApiRequests: number;
    retentionDays: number;
    features: Record<string, boolean>;
  };
  usage: {
    links: UsageItem;
    clicks: UsageItem;
    qrCodes: UsageItem;
    apiRequests: UsageItem;
  };
}

interface PlanTemplate {
  id: string;
  name: string;
  quotas: Record<string, number>;
}

const QUOTA_TYPES = [
  { key: 'links', label: '链接数量', icon: Link2 },
  { key: 'clicks', label: '月点击量', icon: MousePointerClick },
  { key: 'qrCodes', label: 'QR 码', icon: QrCode },
  { key: 'apiRequests', label: 'API 调用', icon: Key },
];

export default function QuotasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamQuota | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const limit = 15;

  // Form state for editing
  const [quotaForm, setQuotaForm] = useState<Record<string, number>>({});

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  // Fetch team quotas
  const { data: quotasData, isLoading } = useQuery({
    queryKey: ['admin-quotas', searchQuery, filterPlan, page, sortBy, sortOrder],
    queryFn: async () => {
      const response = await api.get('/proxy/quotas', {
        params: {
          search: searchQuery || undefined,
          plan: filterPlan !== 'all' ? filterPlan : undefined,
          page,
          limit,
          sortBy,
          sortOrder,
        },
      });
      return response.data;
    },
  });

  // Fetch plan templates
  const { data: plansData } = useQuery({
    queryKey: ['plan-templates'],
    queryFn: async () => {
      const response = await api.get('/proxy/plans');
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['quota-stats'],
    queryFn: async () => {
      const response = await api.get('/proxy/quotas/stats');
      return response.data;
    },
  });

  const quotas: TeamQuota[] = quotasData?.data || quotasData?.items || [];
  const total = quotasData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const plans: PlanTemplate[] = plansData?.data || [];
  const stats = {
    totalTeams: statsData?.totalTeams || 0,
    nearLimit: statsData?.warnings?.nearingLimit || 0,
    overLimit: statsData?.warnings?.exceededLimit || 0,
    totalLinks: statsData?.usage?.totalLinks || 0,
    totalClicks: statsData?.usage?.totalClicks || 0,
  };

  // Update quota mutation
  const updateQuotaMutation = useMutation({
    mutationFn: async ({ teamId, customLimits }: { teamId: string; customLimits: Record<string, number> }) => {
      // Map frontend keys to backend limit keys
      const mappedLimits = {
        maxLinks: customLimits.links,
        maxClicks: customLimits.clicks,
        maxQrCodes: customLimits.qrCodes,
        maxApiRequests: customLimits.apiRequests,
      };
      const response = await api.put(`/proxy/quotas/${teamId}`, { customLimits: mappedLimits });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotas'] });
      setEditDialogOpen(false);
      setSelectedTeam(null);
      toast({ title: '成功', description: '配额已更新' });
    },
    onError: () => {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' });
    },
  });

  // Reset quota mutation
  const resetQuotaMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const response = await api.post(`/proxy/quotas/${teamId}/reset`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotas'] });
      toast({ title: '成功', description: '配额已重置' });
    },
    onError: () => {
      toast({ title: '错误', description: '重置失败', variant: 'destructive' });
    },
  });

  const handleEditQuota = (team: TeamQuota) => {
    setSelectedTeam(team);
    setQuotaForm({
      links: team.usage?.links?.limit || team.limits?.maxLinks || 0,
      clicks: team.usage?.clicks?.limit || team.limits?.maxClicks || 0,
      qrCodes: team.usage?.qrCodes?.limit || team.limits?.maxQrCodes || 0,
      apiRequests: team.usage?.apiRequests?.limit || team.limits?.maxApiRequests || 0,
    });
    setEditDialogOpen(true);
  };

  const handleViewDetails = (team: TeamQuota) => {
    setSelectedTeam(team);
    setDetailSheetOpen(true);
  };

  const handleSaveQuota = () => {
    if (selectedTeam) {
      updateQuotaMutation.mutate({ teamId: selectedTeam.teamId, customLimits: quotaForm });
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-orange-500';
    return 'text-green-500';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getHighestUsage = (usage: TeamQuota['usage']) => {
    if (!usage) return 0;
    let highest = 0;
    Object.values(usage).forEach((q) => {
      if (q && typeof q.percentage === 'number') {
        if (q.percentage > highest) highest = q.percentage;
      }
    });
    return highest;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">配额管理</h1>
          <p className="text-muted-foreground">
            管理团队资源配额和使用限制
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            导出报告
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            套餐模板
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">团队总数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">接近上限</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.nearLimit}</div>
            <p className="text-xs text-muted-foreground">使用率 &gt; 75%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">超出限制</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overLimit}</div>
            <p className="text-xs text-muted-foreground">使用率 &gt; 100%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总链接数</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalLinks)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总点击量</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalClicks)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索团队..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="套餐" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有套餐</SelectItem>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="pro">Pro 版</SelectItem>
                  <SelectItem value="enterprise">企业版</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotas Table */}
      <Card>
        <CardHeader>
          <CardTitle>团队配额列表</CardTitle>
          <CardDescription>
            查看和管理各团队的资源配额
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : quotas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Gauge className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无数据</h3>
              <p className="text-muted-foreground text-center">
                没有找到符合条件的团队配额
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('teamName')}
                    >
                      团队
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('plan')}
                    >
                      套餐
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('linksUsed')}
                    >
                      链接使用
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('clicksUsed')}
                    >
                      点击使用
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>最高使用率</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort('billingCycleEnd')}
                    >
                      下次重置
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotas.map((team) => {
                  const linksUsage = team.usage?.links || { used: 0, limit: 0, percentage: 0 };
                  const clicksUsage = team.usage?.clicks || { used: 0, limit: 0, percentage: 0 };
                  const linksPercent = linksUsage.percentage || 0;
                  const clicksPercent = clicksUsage.percentage || 0;
                  const highestUsage = getHighestUsage(team.usage);

                  return (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{team.teamName || team.teamId.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{team.teamId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{team.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={getUsageColor(linksPercent)}>
                              {formatNumber(linksUsage.used)}
                            </span>
                            <span className="text-muted-foreground">
                              / {formatNumber(linksUsage.limit)}
                            </span>
                          </div>
                          <Progress
                            value={linksPercent}
                            className={`h-1.5 ${linksPercent >= 90 ? '[&>div]:bg-destructive' : linksPercent >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={getUsageColor(clicksPercent)}>
                              {formatNumber(clicksUsage.used)}
                            </span>
                            <span className="text-muted-foreground">
                              / {formatNumber(clicksUsage.limit)}
                            </span>
                          </div>
                          <Progress
                            value={clicksPercent}
                            className={`h-1.5 ${clicksPercent >= 90 ? '[&>div]:bg-destructive' : clicksPercent >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getUsageColor(highestUsage)}`}>
                            {highestUsage.toFixed(0)}%
                          </span>
                          {highestUsage >= 90 && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(team.billingCycleEnd).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(team)}>
                              <TrendingUp className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditQuota(team)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              编辑配额
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => resetQuotaMutation.mutate(team.teamId)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              重置使用量
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {total} 条记录，第 {page} / {totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Quota Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑配额限制</DialogTitle>
            <DialogDescription>
              {selectedTeam?.teamName} - {selectedTeam?.plan}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {QUOTA_TYPES.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-36">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">{label}</Label>
                </div>
                <Input
                  type="number"
                  value={quotaForm[key] || 0}
                  onChange={(e) => setQuotaForm({ ...quotaForm, [key]: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveQuota}
              disabled={updateQuotaMutation.isPending}
            >
              {updateQuotaMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>配额详情</SheetTitle>
            <SheetDescription>
              {selectedTeam?.teamName}
            </SheetDescription>
          </SheetHeader>
          {selectedTeam && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-lg py-1 px-3">
                  {selectedTeam.plan}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  下次重置: {new Date(selectedTeam.billingCycleEnd).toLocaleDateString()}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                {QUOTA_TYPES.map(({ key, label, icon: Icon }) => {
                  const usage = selectedTeam.usage?.[key as keyof typeof selectedTeam.usage];
                  const quota = usage || { used: 0, limit: 0, percentage: 0 };
                  const percentage = quota.percentage || 0;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{label}</span>
                        </div>
                        <span className={`font-bold ${getUsageColor(percentage)}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className={`h-2 ${percentage >= 90 ? '[&>div]:bg-destructive' : percentage >= 75 ? '[&>div]:bg-orange-500' : ''}`}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>已用: {formatNumber(quota.used)}</span>
                        <span>上限: {formatNumber(quota.limit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleEditQuota(selectedTeam);
                    setDetailSheetOpen(false);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑配额
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => resetQuotaMutation.mutate(selectedTeam.teamId)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重置使用量
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
