import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  Trophy,
  FlaskConical,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  MousePointerClick,
  CheckCircle,
  Clock,
  XCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface AbTestVariant {
  id: string;
  name: string;
  description?: string;
  weight: number;
  url: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  isControl: boolean;
  isWinner?: boolean;
}

interface AbTest {
  id: string;
  name: string;
  description?: string;
  linkId: string;
  linkSlug: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: AbTestVariant[];
  goal?: string;
  targetClicks: number;
  currentClicks: number;
  startedAt?: string;
  endedAt?: string;
  winnerId?: string;
  confidence?: number;
  teamId: string;
  teamName?: string;
  createdAt: string;
  updatedAt: string;
}

interface AbTestStats {
  total: number;
  running: number;
  completed: number;
  totalClicks: number;
  totalConversions: number;
  avgConversionRate: number;
  byStatus: Record<string, number>;
}

interface AbTestResults {
  testId: string;
  variants: Array<{
    id: string;
    name: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
    improvement?: number;
    confidence?: number;
    isWinner?: boolean;
  }>;
  statisticalSignificance: boolean;
  confidence: number;
  recommendedWinner?: string;
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3 w-3" />,
  running: <Play className="h-3 w-3" />,
  paused: <Pause className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
};

export default function AbTestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [viewingTest, setViewingTest] = useState<AbTest | null>(null);
  const [testResults, setTestResults] = useState<AbTestResults | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [stopTestTarget, setStopTestTarget] = useState<AbTest | null>(null);

  const { data: stats } = useQuery<AbTestStats>({
    queryKey: ['ab-tests-stats'],
    queryFn: () => api.get('/proxy/ab-tests/stats').then(r => r.data),
  });

  const { data: testsData, isLoading } = useQuery({
    queryKey: ['ab-tests', page, statusFilter, search],
    queryFn: () =>
      api.get('/proxy/ab-tests', {
        params: {
          page,
          limit: 10,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
        },
      }).then(r => r.data),
  });

  const stopTestMutation = useMutation({
    mutationFn: (id: string) => api.post(`/proxy/ab-tests/${id}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests-stats'] });
      toast.success('A/B 测试已停止');
      setStopTestTarget(null);
    },
    onError: () => {
      toast.error('操作失败');
    },
  });

  const declareWinnerMutation = useMutation({
    mutationFn: ({ id, winnerId }: { id: string; winnerId: string }) =>
      api.post(`/proxy/ab-tests/${id}/winner`, { winnerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests-stats'] });
      setWinnerDialogOpen(false);
      setViewingTest(null);
      toast.success('已宣布获胜变体');
    },
    onError: () => {
      toast.error('操作失败');
    },
  });

  const fetchResults = async (test: AbTest) => {
    try {
      const response = await api.get(`/proxy/ab-tests/${test.id}/results`);
      setTestResults(response.data);
      setResultsDialogOpen(true);
    } catch {
      toast.error('获取结果失败');
    }
  };

  const tests = testsData?.data || [];
  const totalPages = testsData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总测试数</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">运行中</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.running || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总点击量</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClicks?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均转化率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgConversionRate ? `${(stats.avgConversionRate * 100).toFixed(2)}%` : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  {statusIcons[status]}
                  <span className="text-sm">{statusLabels[status] || status}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索测试..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="running">运行中</SelectItem>
              <SelectItem value="paused">已暂停</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>测试名称</TableHead>
              <TableHead>关联链接</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>变体数</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>最佳转化</TableHead>
              <TableHead>团队</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  加载中...
                </TableCell>
              </TableRow>
            ) : tests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  暂无 A/B 测试
                </TableCell>
              </TableRow>
            ) : (
              tests.map((test: AbTest) => {
                const bestVariant = test.variants.reduce((best, v) =>
                  v.conversionRate > (best?.conversionRate || 0) ? v : best
                , test.variants[0]);
                const progress = test.targetClicks > 0
                  ? Math.min(100, (test.currentClicks / test.targetClicks) * 100)
                  : 0;

                return (
                  <TableRow key={test.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{test.name}</p>
                        {test.description && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {test.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{test.linkSlug}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          test.status === 'running'
                            ? 'default'
                            : test.status === 'completed'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {statusIcons[test.status]}
                        <span className="ml-1">{statusLabels[test.status]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{test.variants.length}</TableCell>
                    <TableCell>
                      <div className="w-32">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">
                          {test.currentClicks.toLocaleString()} / {test.targetClicks.toLocaleString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bestVariant && (
                        <div className="flex items-center gap-2">
                          {bestVariant.isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                          <span>{bestVariant.name}</span>
                          <Badge variant="outline">
                            {(bestVariant.conversionRate * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {test.teamName ? (
                        <Badge variant="outline">{test.teamName}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setViewingTest(test);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => fetchResults(test)}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            查看结果
                          </DropdownMenuItem>
                          {test.status === 'running' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setStopTestTarget(test)}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                停止测试
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setViewingTest(test);
                                  setSelectedWinnerId(test.variants[0]?.id || '');
                                  setWinnerDialogOpen(true);
                                }}
                              >
                                <Trophy className="mr-2 h-4 w-4" />
                                宣布获胜者
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>A/B 测试详情</DialogTitle>
          </DialogHeader>
          {viewingTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">测试名称</Label>
                  <p className="font-medium">{viewingTest.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge
                    variant={
                      viewingTest.status === 'running'
                        ? 'default'
                        : viewingTest.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {statusLabels[viewingTest.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">关联链接</Label>
                  <p className="font-mono text-sm">{viewingTest.linkSlug}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">目标点击</Label>
                  <p className="font-medium">{viewingTest.targetClicks.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">变体对比</Label>
                <div className="mt-2 space-y-3">
                  {viewingTest.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`p-4 rounded-lg border ${
                        variant.isWinner ? 'border-yellow-400 bg-yellow-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {variant.isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                          <span className="font-medium">{variant.name}</span>
                          {variant.isControl && (
                            <Badge variant="outline" className="text-xs">
                              对照组
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary">{variant.weight}% 流量</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 truncate">{variant.url}</p>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-sm text-gray-500">点击量</p>
                          <p className="text-lg font-bold">{variant.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">转化</p>
                          <p className="text-lg font-bold">{variant.conversions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">转化率</p>
                          <p className="text-lg font-bold">
                            {(variant.conversionRate * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewingTest.confidence !== undefined && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">统计置信度</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Progress value={viewingTest.confidence * 100} className="flex-1" />
                    <span className="font-medium">
                      {(viewingTest.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>测试结果分析</DialogTitle>
            <DialogDescription>基于统计分析的测试结果</DialogDescription>
          </DialogHeader>
          {testResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">统计显著性</p>
                  <p className="text-lg font-bold">
                    {testResults.statisticalSignificance ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> 达到显著性
                      </span>
                    ) : (
                      <span className="text-yellow-600 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> 需要更多数据
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">置信度</p>
                  <p className="text-2xl font-bold">{(testResults.confidence * 100).toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-3">
                {testResults.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`p-4 rounded-lg border ${
                      variant.isWinner ? 'border-green-400 bg-green-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {variant.isWinner && <Trophy className="h-5 w-5 text-green-500" />}
                        <span className="font-medium">{variant.name}</span>
                      </div>
                      {variant.improvement !== undefined && (
                        <Badge
                          variant={variant.improvement > 0 ? 'default' : 'secondary'}
                          className={variant.improvement > 0 ? 'bg-green-500' : ''}
                        >
                          {variant.improvement > 0 ? '+' : ''}
                          {(variant.improvement * 100).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-gray-500">点击量</p>
                        <p className="font-bold">{variant.clicks.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">转化</p>
                        <p className="font-bold">{variant.conversions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">转化率</p>
                        <p className="font-bold">{(variant.conversionRate * 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">置信度</p>
                        <p className="font-bold">
                          {variant.confidence ? `${(variant.confidence * 100).toFixed(1)}%` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {testResults.recommendedWinner && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600">
                    <strong>推荐:</strong> 基于当前数据，建议选择{' '}
                    <strong>
                      {testResults.variants.find(v => v.id === testResults.recommendedWinner)?.name}
                    </strong>{' '}
                    作为获胜变体
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>宣布获胜变体</DialogTitle>
            <DialogDescription>选择获胜变体后，所有流量将导向该变体</DialogDescription>
          </DialogHeader>
          {viewingTest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>选择获胜变体</Label>
                <Select value={selectedWinnerId} onValueChange={setSelectedWinnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择变体" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewingTest.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name} - {(variant.conversionRate * 100).toFixed(2)}% 转化率
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (viewingTest && selectedWinnerId) {
                  declareWinnerMutation.mutate({
                    id: viewingTest.id,
                    winnerId: selectedWinnerId,
                  });
                }
              }}
              disabled={declareWinnerMutation.isPending || !selectedWinnerId}
            >
              <Trophy className="mr-2 h-4 w-4" />
              确认获胜
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 停止测试确认对话框 */}
      <AlertDialog open={!!stopTestTarget} onOpenChange={(open) => !open && setStopTestTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认停止测试</AlertDialogTitle>
            <AlertDialogDescription>
              确定要停止 A/B 测试 "{stopTestTarget?.name}" 吗？
              停止后将无法恢复运行，但您可以查看已收集的测试数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => stopTestTarget && stopTestMutation.mutate(stopTestTarget.id)}
            >
              <Pause className="mr-2 h-4 w-4" />
              停止测试
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
