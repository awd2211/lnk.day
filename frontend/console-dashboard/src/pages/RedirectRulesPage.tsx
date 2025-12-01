import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  MoreHorizontal,
  Eye,
  Play,
  Power,
  ArrowRight,
  Globe,
  Smartphone,
  Clock,
  MapPin,
  Users,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shuffle,
  Filter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface RedirectCondition {
  type: 'device' | 'browser' | 'os' | 'country' | 'language' | 'time' | 'referrer' | 'custom';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'in' | 'not_in';
  value: string | string[];
}

interface RedirectRule {
  id: string;
  name: string;
  linkId: string;
  linkSlug: string;
  priority: number;
  conditions: RedirectCondition[];
  targetUrl: string;
  enabled: boolean;
  matchCount: number;
  lastMatch?: string;
  teamId: string;
  teamName?: string;
  createdAt: string;
  updatedAt: string;
}

interface RedirectRuleStats {
  total: number;
  active: number;
  inactive: number;
  totalMatches: number;
  byConditionType: Record<string, number>;
  conflicts: number;
}

interface RuleConflict {
  ruleId: string;
  ruleName: string;
  conflictingRuleId: string;
  conflictingRuleName: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

interface TestResult {
  matched: boolean;
  matchedRule?: {
    id: string;
    name: string;
    targetUrl: string;
  };
  evaluatedRules: Array<{
    id: string;
    name: string;
    matched: boolean;
    reason?: string;
  }>;
}

const conditionTypeLabels: Record<string, string> = {
  device: '设备类型',
  browser: '浏览器',
  os: '操作系统',
  country: '国家/地区',
  language: '语言',
  time: '时间',
  referrer: '来源',
  custom: '自定义',
};

const conditionTypeIcons: Record<string, React.ReactNode> = {
  device: <Smartphone className="h-4 w-4" />,
  browser: <Globe className="h-4 w-4" />,
  os: <Smartphone className="h-4 w-4" />,
  country: <MapPin className="h-4 w-4" />,
  language: <Globe className="h-4 w-4" />,
  time: <Clock className="h-4 w-4" />,
  referrer: <ArrowRight className="h-4 w-4" />,
  custom: <Tag className="h-4 w-4" />,
};

export default function RedirectRulesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionTypeFilter, setConditionTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [viewingRule, setViewingRule] = useState<RedirectRule | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testParams, setTestParams] = useState({
    device: 'desktop',
    browser: 'chrome',
    os: 'windows',
    country: 'CN',
    language: 'zh-CN',
  });

  const { data: stats } = useQuery<RedirectRuleStats>({
    queryKey: ['redirect-rules-stats'],
    queryFn: () => api.get('/proxy/redirect-rules/stats').then(r => r.data),
  });

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['redirect-rules', page, statusFilter, conditionTypeFilter, search],
    queryFn: () =>
      api.get('/proxy/redirect-rules', {
        params: {
          page,
          limit: 10,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          conditionType: conditionTypeFilter !== 'all' ? conditionTypeFilter : undefined,
          search: search || undefined,
        },
      }).then(r => r.data),
    enabled: activeTab === 'rules',
  });

  const { data: conflictsData } = useQuery({
    queryKey: ['redirect-rules-conflicts'],
    queryFn: () => api.get('/proxy/redirect-rules/conflicts').then(r => r.data),
    enabled: activeTab === 'conflicts',
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/proxy/redirect-rules/${id}/toggle`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirect-rules'] });
      queryClient.invalidateQueries({ queryKey: ['redirect-rules-stats'] });
      toast.success('状态已更新');
    },
    onError: () => {
      toast.error('操作失败');
    },
  });

  const testRuleMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: typeof testParams }) =>
      api.post(`/proxy/redirect-rules/${id}/test`, params),
    onSuccess: (response) => {
      setTestResult(response.data);
    },
    onError: () => {
      toast.error('测试失败');
    },
  });

  const rules = rulesData?.data || [];
  const totalPages = rulesData?.totalPages || 1;
  const conflicts = conflictsData?.data || [];

  const openTestDialog = (rule: RedirectRule) => {
    setViewingRule(rule);
    setTestResult(null);
    setTestDialogOpen(true);
  };

  const runTest = () => {
    if (viewingRule) {
      testRuleMutation.mutate({ id: viewingRule.id, params: testParams });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总规则数</CardTitle>
            <Shuffle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">启用中</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总匹配次数</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMatches?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">规则冲突</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.conflicts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Condition Type Distribution */}
      {stats?.byConditionType && Object.keys(stats.byConditionType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">条件类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byConditionType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  {conditionTypeIcons[type]}
                  <span className="text-sm">{conditionTypeLabels[type] || type}</span>
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
          <TabsTrigger value="rules">重定向规则</TabsTrigger>
          <TabsTrigger value="conflicts">
            规则冲突
            {stats?.conflicts && stats.conflicts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.conflicts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索规则..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">禁用</SelectItem>
              </SelectContent>
            </Select>
            <Select value={conditionTypeFilter} onValueChange={setConditionTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="条件类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="device">设备类型</SelectItem>
                <SelectItem value="browser">浏览器</SelectItem>
                <SelectItem value="country">国家/地区</SelectItem>
                <SelectItem value="language">语言</SelectItem>
                <SelectItem value="time">时间</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>关联链接</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>目标 URL</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>匹配次数</TableHead>
                  <TableHead>状态</TableHead>
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
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                      暂无重定向规则
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule: RedirectRule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="font-mono text-sm">{rule.linkSlug}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.conditions.slice(0, 3).map((cond, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {conditionTypeIcons[cond.type]}
                              <span className="ml-1">{conditionTypeLabels[cond.type]}</span>
                            </Badge>
                          ))}
                          {rule.conditions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{rule.conditions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                          {rule.targetUrl}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell>{rule.matchCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? '启用' : '禁用'}
                        </Badge>
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
                                setViewingRule(rule);
                                setDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openTestDialog(rule)}>
                              <Play className="mr-2 h-4 w-4" />
                              测试规则
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })
                              }
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {rule.enabled ? '禁用' : '启用'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
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

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">检测到的规则冲突</CardTitle>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500">没有检测到规则冲突</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conflicts.map((conflict: RuleConflict, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        conflict.severity === 'high'
                          ? 'border-red-200 bg-red-50'
                          : conflict.severity === 'medium'
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 mt-0.5 ${
                            conflict.severity === 'high'
                              ? 'text-red-500'
                              : conflict.severity === 'medium'
                                ? 'text-yellow-500'
                                : 'text-gray-500'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                conflict.severity === 'high'
                                  ? 'destructive'
                                  : conflict.severity === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {conflict.severity === 'high'
                                ? '高'
                                : conflict.severity === 'medium'
                                  ? '中'
                                  : '低'}
                            </Badge>
                            <span className="font-medium">{conflict.ruleName}</span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{conflict.conflictingRuleName}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{conflict.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>规则详情</DialogTitle>
          </DialogHeader>
          {viewingRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">规则名称</Label>
                  <p className="font-medium">{viewingRule.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={viewingRule.enabled ? 'default' : 'secondary'}>
                    {viewingRule.enabled ? '启用' : '禁用'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">关联链接</Label>
                  <p className="font-mono text-sm">{viewingRule.linkSlug}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">优先级</Label>
                  <p className="font-medium">{viewingRule.priority}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">目标 URL</Label>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1">
                  {viewingRule.targetUrl}
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">匹配条件</Label>
                <div className="mt-2 space-y-2">
                  {viewingRule.conditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {conditionTypeIcons[cond.type]}
                      <span className="font-medium">{conditionTypeLabels[cond.type]}</span>
                      <Badge variant="outline">{cond.operator}</Badge>
                      <span className="font-mono text-sm">
                        {Array.isArray(cond.value) ? cond.value.join(', ') : cond.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">统计信息</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">匹配次数</p>
                    <p className="text-xl font-bold">
                      {viewingRule.matchCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">最后匹配</p>
                    <p className="text-sm font-medium">
                      {viewingRule.lastMatch
                        ? new Date(viewingRule.lastMatch).toLocaleString('zh-CN')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>测试规则 - {viewingRule?.name}</DialogTitle>
            <DialogDescription>模拟不同条件测试规则匹配</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Select
                  value={testParams.device}
                  onValueChange={(v) => setTestParams({ ...testParams, device: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">桌面</SelectItem>
                    <SelectItem value="mobile">移动</SelectItem>
                    <SelectItem value="tablet">平板</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>浏览器</Label>
                <Select
                  value={testParams.browser}
                  onValueChange={(v) => setTestParams({ ...testParams, browser: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome">Chrome</SelectItem>
                    <SelectItem value="firefox">Firefox</SelectItem>
                    <SelectItem value="safari">Safari</SelectItem>
                    <SelectItem value="edge">Edge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>操作系统</Label>
                <Select
                  value={testParams.os}
                  onValueChange={(v) => setTestParams({ ...testParams, os: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="windows">Windows</SelectItem>
                    <SelectItem value="macos">macOS</SelectItem>
                    <SelectItem value="linux">Linux</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>国家/地区</Label>
                <Select
                  value={testParams.country}
                  onValueChange={(v) => setTestParams({ ...testParams, country: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CN">中国</SelectItem>
                    <SelectItem value="US">美国</SelectItem>
                    <SelectItem value="JP">日本</SelectItem>
                    <SelectItem value="GB">英国</SelectItem>
                    <SelectItem value="DE">德国</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-lg border ${
                  testResult.matched
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {testResult.matched ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {testResult.matched ? '规则匹配成功' : '规则未匹配'}
                  </span>
                </div>
                {testResult.matchedRule && (
                  <div className="mt-2 p-2 bg-white rounded">
                    <p className="text-sm">
                      匹配规则: <strong>{testResult.matchedRule.name}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      目标 URL: {testResult.matchedRule.targetUrl}
                    </p>
                  </div>
                )}
                {testResult.evaluatedRules && testResult.evaluatedRules.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">评估过程:</p>
                    <div className="space-y-1">
                      {testResult.evaluatedRules.map((er) => (
                        <div
                          key={er.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {er.matched ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-gray-400" />
                          )}
                          <span>{er.name}</span>
                          {er.reason && (
                            <span className="text-gray-500">- {er.reason}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={runTest} disabled={testRuleMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              运行测试
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
