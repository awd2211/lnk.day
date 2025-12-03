import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Eye,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointerClick,
  DollarSign,
  ArrowRight,
  BarChart3,
  Filter,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';

interface Goal {
  id: string;
  name: string;
  description?: string;
  type: 'click' | 'conversion' | 'revenue' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'active' | 'completed' | 'paused';
  linkId?: string;
  linkSlug?: string;
  campaignId?: string;
  campaignName?: string;
  teamId: string;
  teamName?: string;
  conversionRate: number;
  trend: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface GoalStats {
  total: number;
  active: number;
  completed: number;
  totalConversions: number;
  totalRevenue: number;
  avgConversionRate: number;
  byType: Record<string, number>;
}

interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

interface GoalFunnel {
  goalId: string;
  steps: FunnelStep[];
  totalVisitors: number;
  totalConversions: number;
  overallRate: number;
}

interface Conversion {
  id: string;
  goalId: string;
  userId?: string;
  sessionId: string;
  value?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface GoalRanking {
  id: string;
  name: string;
  teamName?: string;
  conversions: number;
  conversionRate: number;
  revenue?: number;
  trend: number;
}

const goalTypeLabels: Record<string, string> = {
  click: '点击目标',
  conversion: '转化目标',
  revenue: '收入目标',
  custom: '自定义目标',
};

const goalTypeIcons: Record<string, React.ReactNode> = {
  click: <MousePointerClick className="h-4 w-4" />,
  conversion: <Target className="h-4 w-4" />,
  revenue: <DollarSign className="h-4 w-4" />,
  custom: <BarChart3 className="h-4 w-4" />,
};

const statusLabels: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  paused: '已暂停',
};

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState('goals');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
  const [viewingGoal, setViewingGoal] = useState<Goal | null>(null);
  const [goalFunnel, setGoalFunnel] = useState<GoalFunnel | null>(null);
  const [conversionsData, setConversionsData] = useState<Conversion[]>([]);

  const { data: stats } = useQuery<GoalStats>({
    queryKey: ['goals-stats'],
    queryFn: () => api.get('/proxy/goals/stats').then(r => r.data),
  });

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals', page, typeFilter, statusFilter, search],
    queryFn: () =>
      api.get('/proxy/goals', {
        params: {
          page,
          limit: 10,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
        },
      }).then(r => r.data),
    enabled: activeTab === 'goals',
  });

  const { data: rankingsData } = useQuery({
    queryKey: ['goals-rankings'],
    queryFn: () => api.get('/proxy/goals/rankings').then(r => r.data),
    enabled: activeTab === 'rankings',
  });

  const fetchFunnel = async (goal: Goal) => {
    try {
      const response = await api.get(`/proxy/goals/${goal.id}/funnel`);
      setGoalFunnel(response.data);
      setFunnelDialogOpen(true);
    } catch {
      console.error('获取漏斗数据失败');
    }
  };

  const fetchConversions = async (goal: Goal) => {
    try {
      const response = await api.get(`/proxy/goals/${goal.id}/conversions`, {
        params: { limit: 50 },
      });
      setConversionsData(response.data?.data || []);
      setViewingGoal(goal);
      setDetailsDialogOpen(true);
    } catch {
      console.error('获取转化数据失败');
    }
  };

  const goals = goalsData?.data || [];
  const totalPages = goalsData?.totalPages || 1;
  const rankings = rankingsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总目标数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active || 0} 个进行中
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总转化数</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.totalConversions?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalRevenue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均转化率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgConversionRate ? `${(stats.avgConversionRate * 100).toFixed(2)}%` : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">目标类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  {goalTypeIcons[type]}
                  <span className="text-sm">{goalTypeLabels[type] || type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="goals">目标列表</TabsTrigger>
          <TabsTrigger value="rankings">目标排行</TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索目标..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="类型筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="click">点击目标</SelectItem>
                <SelectItem value="conversion">转化目标</SelectItem>
                <SelectItem value="revenue">收入目标</SelectItem>
                <SelectItem value="custom">自定义目标</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="paused">已暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>目标名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>进度</TableHead>
                  <TableHead>转化率</TableHead>
                  <TableHead>趋势</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>关联</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : goals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                      暂无目标数据
                    </TableCell>
                  </TableRow>
                ) : (
                  goals.map((goal: Goal) => {
                    const progress = goal.targetValue > 0
                      ? Math.min(100, (goal.currentValue / goal.targetValue) * 100)
                      : 0;

                    return (
                      <TableRow key={goal.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{goal.name}</p>
                            {goal.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {goalTypeIcons[goal.type]}
                            <span className="text-sm">{goalTypeLabels[goal.type]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">
                              {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {(goal.conversionRate * 100).toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {goal.trend > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : goal.trend < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                            <span
                              className={
                                goal.trend > 0
                                  ? 'text-green-600'
                                  : goal.trend < 0
                                    ? 'text-red-600'
                                    : ''
                              }
                            >
                              {goal.trend > 0 ? '+' : ''}
                              {(goal.trend * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              goal.status === 'active'
                                ? 'default'
                                : goal.status === 'completed'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {statusLabels[goal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {goal.campaignName ? (
                            <Badge variant="outline">{goal.campaignName}</Badge>
                          ) : goal.linkSlug ? (
                            <span className="font-mono text-xs">{goal.linkSlug}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fetchConversions(goal)}
                              title="查看转化"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fetchFunnel(goal)}
                              title="查看漏斗"
                            >
                              <Filter className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="flex items-center px-4 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">目标转化排行榜</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rankings.length === 0 ? (
                  <p className="text-center py-10 text-gray-500">暂无排行数据</p>
                ) : (
                  rankings.map((item: GoalRanking, index: number) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-600'
                            : index === 1
                              ? 'bg-gray-200 text-gray-600'
                              : index === 2
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.teamName && (
                          <p className="text-xs text-gray-500">{item.teamName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.conversions.toLocaleString()} 转化</p>
                        <p className="text-sm text-gray-500">
                          {(item.conversionRate * 100).toFixed(2)}% 转化率
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.trend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : item.trend < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        <span
                          className={`text-sm ${
                            item.trend > 0
                              ? 'text-green-600'
                              : item.trend < 0
                                ? 'text-red-600'
                                : ''
                          }`}
                        >
                          {item.trend > 0 ? '+' : ''}
                          {(item.trend * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conversions Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>转化详情 - {viewingGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingGoal && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">当前进度</p>
                  <p className="text-xl font-bold">
                    {viewingGoal.currentValue.toLocaleString()} / {viewingGoal.targetValue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">转化率</p>
                  <p className="text-xl font-bold">
                    {(viewingGoal.conversionRate * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">趋势</p>
                  <p className="text-xl font-bold flex items-center gap-1">
                    {viewingGoal.trend > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : viewingGoal.trend < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    ) : null}
                    {viewingGoal.trend > 0 ? '+' : ''}
                    {(viewingGoal.trend * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label className="text-muted-foreground">最近转化记录</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {conversionsData.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">暂无转化记录</p>
                ) : (
                  conversionsData.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {conv.userId || `会话 ${conv.sessionId.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(conv.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      {conv.value !== undefined && (
                        <Badge variant="outline">${conv.value.toLocaleString()}</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Funnel Dialog */}
      <Dialog open={funnelDialogOpen} onOpenChange={setFunnelDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>转化漏斗</DialogTitle>
          </DialogHeader>
          {goalFunnel && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">总访问</p>
                  <p className="text-xl font-bold">
                    {goalFunnel.totalVisitors.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">总转化</p>
                  <p className="text-xl font-bold text-green-600">
                    {goalFunnel.totalConversions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">整体转化率</p>
                  <p className="text-xl font-bold">
                    {(goalFunnel.overallRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {goalFunnel.steps.map((step, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{step.name}</span>
                      <span className="text-sm text-gray-500">
                        {step.count.toLocaleString()} ({(step.percentage * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={step.percentage * 100} className="h-8" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white mix-blend-difference">
                          {step.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {step.dropoff !== undefined && step.dropoff > 0 && (
                      <div className="flex items-center justify-center mt-1 text-xs text-gray-400">
                        <ArrowRight className="h-3 w-3 mx-1" />
                        <span className="text-red-500">-{(step.dropoff * 100).toFixed(1)}% 流失</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
