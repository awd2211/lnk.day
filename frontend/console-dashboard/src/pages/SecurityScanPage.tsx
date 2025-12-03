import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Play,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Clock,
  Link2,
  Globe,
  Ban,
  Activity,
  RefreshCw,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface SecurityScan {
  id: string;
  type: 'full' | 'quick' | 'targeted';
  status: 'pending' | 'running' | 'completed' | 'failed';
  target?: string;
  startedAt?: string;
  completedAt?: string;
  results: {
    totalScanned: number;
    threats: number;
    warnings: number;
    safe: number;
  };
  findings: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    linkId?: string;
    url?: string;
  }>;
  triggeredBy: string;
  createdAt: string;
}

interface BlacklistEntry {
  id: string;
  type: 'domain' | 'url' | 'pattern' | 'ip';
  value: string;
  reason: string;
  addedBy: string;
  matchCount: number;
  lastMatch?: string;
  createdAt: string;
}

interface SecurityEvent {
  id: string;
  type: 'threat_detected' | 'scan_completed' | 'blacklist_match' | 'suspicious_activity';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface SecurityStats {
  totalScans: number;
  threatsDetected: number;
  linksBlocked: number;
  blacklistEntries: number;
  lastScanAt?: string;
  threatsByType: Record<string, number>;
  scansByStatus: Record<string, number>;
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500',
};

const severityLabels: Record<string, string> = {
  critical: '严重',
  high: '高危',
  medium: '中等',
  low: '低危',
  info: '信息',
};

const scanStatusLabels: Record<string, string> = {
  pending: '等待中',
  running: '扫描中',
  completed: '已完成',
  failed: '失败',
};

const scanTypeLabels: Record<string, string> = {
  full: '全量扫描',
  quick: '快速扫描',
  targeted: '定向扫描',
};

export default function SecurityScanPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scans');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingScan, setViewingScan] = useState<SecurityScan | null>(null);
  const [scanForm, setScanForm] = useState({
    type: 'quick' as SecurityScan['type'],
    target: '',
  });
  const [blacklistForm, setBlacklistForm] = useState({
    type: 'domain' as BlacklistEntry['type'],
    value: '',
    reason: '',
  });
  const [removeBlacklistTarget, setRemoveBlacklistTarget] = useState<BlacklistEntry | null>(null);

  const { data: stats } = useQuery<SecurityStats>({
    queryKey: ['security-stats'],
    queryFn: () => api.get('/proxy/security/stats').then(r => r.data),
  });

  const { data: scansData, isLoading: scansLoading } = useQuery({
    queryKey: ['security-scans', page, statusFilter],
    queryFn: () =>
      api.get('/proxy/security/scans', {
        params: {
          page,
          limit: 10,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      }).then(r => r.data),
    enabled: activeTab === 'scans',
  });

  const { data: blacklistData, isLoading: blacklistLoading } = useQuery({
    queryKey: ['security-blacklist', page, search],
    queryFn: () =>
      api.get('/proxy/security/blacklist', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
        },
      }).then(r => r.data),
    enabled: activeTab === 'blacklist',
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['security-events', page, severityFilter],
    queryFn: () =>
      api.get('/proxy/security/events', {
        params: {
          page,
          limit: 20,
          severity: severityFilter !== 'all' ? severityFilter : undefined,
        },
      }).then(r => r.data),
    enabled: activeTab === 'events',
  });

  const triggerScanMutation = useMutation({
    mutationFn: (data: typeof scanForm) => api.post('/proxy/security/scans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setScanDialogOpen(false);
      setScanForm({ type: 'quick', target: '' });
      toast.success('安全扫描已启动');
    },
    onError: () => {
      toast.error('启动扫描失败');
    },
  });

  const addToBlacklistMutation = useMutation({
    mutationFn: (data: typeof blacklistForm) => api.post('/proxy/security/blacklist', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blacklist'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setBlacklistDialogOpen(false);
      setBlacklistForm({ type: 'domain', value: '', reason: '' });
      toast.success('已添加到黑名单');
    },
    onError: () => {
      toast.error('添加失败');
    },
  });

  const removeFromBlacklistMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proxy/security/blacklist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-blacklist'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setRemoveBlacklistTarget(null);
      toast.success('已从黑名单移除');
    },
    onError: () => {
      toast.error('移除失败');
    },
  });

  const scans = scansData?.data || [];
  const blacklist = blacklistData?.data || [];
  const events = eventsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总扫描次数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
            {stats?.lastScanAt && (
              <p className="text-xs text-muted-foreground">
                最后扫描: {new Date(stats.lastScanAt).toLocaleString('zh-CN')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">检测到威胁</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.threatsDetected || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已拦截链接</CardTitle>
            <Ban className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.linksBlocked || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">黑名单条目</CardTitle>
            <ShieldX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.blacklistEntries || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Threat Distribution */}
      {stats?.threatsByType && Object.keys(stats.threatsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">威胁类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.threatsByType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm capitalize">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="scans">安全扫描</TabsTrigger>
            <TabsTrigger value="blacklist">黑名单</TabsTrigger>
            <TabsTrigger value="events">安全事件</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === 'scans' && (
              <Button onClick={() => setScanDialogOpen(true)}>
                <Play className="mr-2 h-4 w-4" />
                启动扫描
              </Button>
            )}
            {activeTab === 'blacklist' && (
              <Button onClick={() => setBlacklistDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加黑名单
              </Button>
            )}
          </div>
        </div>

        {/* Scans Tab */}
        <TabsContent value="scans" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="running">扫描中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>扫描类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>扫描结果</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>触发者</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scansLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : scans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      暂无扫描记录
                    </TableCell>
                  </TableRow>
                ) : (
                  scans.map((scan: SecurityScan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        <Badge variant="outline">{scanTypeLabels[scan.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            scan.status === 'completed'
                              ? 'default'
                              : scan.status === 'running'
                                ? 'secondary'
                                : scan.status === 'failed'
                                  ? 'destructive'
                                  : 'outline'
                          }
                        >
                          {scan.status === 'running' && (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {scanStatusLabels[scan.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {scan.target || <span className="text-gray-400">全平台</span>}
                      </TableCell>
                      <TableCell>
                        {scan.status === 'completed' ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">{scan.results.safe} 安全</span>
                            <span className="text-yellow-600">{scan.results.warnings} 警告</span>
                            <span className="text-red-600">{scan.results.threats} 威胁</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {scan.startedAt
                          ? new Date(scan.startedAt).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>{scan.triggeredBy}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setViewingScan(scan);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索黑名单..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>值</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>匹配次数</TableHead>
                  <TableHead>最后匹配</TableHead>
                  <TableHead>添加者</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklistLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : blacklist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      暂无黑名单条目
                    </TableCell>
                  </TableRow>
                ) : (
                  blacklist.map((entry: BlacklistEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.type === 'domain' && <Globe className="mr-1 h-3 w-3" />}
                          {entry.type === 'url' && <Link2 className="mr-1 h-3 w-3" />}
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.value}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.reason}</TableCell>
                      <TableCell>{entry.matchCount}</TableCell>
                      <TableCell>
                        {entry.lastMatch
                          ? new Date(entry.lastMatch).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>{entry.addedBy}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => setRemoveBlacklistTarget(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="严重程度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="high">高危</SelectItem>
                <SelectItem value="medium">中等</SelectItem>
                <SelectItem value="low">低危</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <div className="divide-y">
              {eventsLoading ? (
                <div className="text-center py-10">加载中...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-10 text-gray-500">暂无安全事件</div>
              ) : (
                events.map((event: SecurityEvent) => (
                  <div key={event.id} className="p-4 flex items-start gap-4">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${severityColors[event.severity]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {severityLabels[event.severity]}
                        </Badge>
                        <span className="text-sm font-medium">
                          {event.type === 'threat_detected' && '威胁检测'}
                          {event.type === 'scan_completed' && '扫描完成'}
                          {event.type === 'blacklist_match' && '黑名单匹配'}
                          {event.type === 'suspicious_activity' && '可疑活动'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(event.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          上一页
        </Button>
        <span className="flex items-center px-4 text-sm">第 {page} 页</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
        >
          下一页
        </Button>
      </div>

      {/* Trigger Scan Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>启动安全扫描</DialogTitle>
            <DialogDescription>选择扫描类型并启动安全检测</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>扫描类型</Label>
              <Select
                value={scanForm.type}
                onValueChange={(value: SecurityScan['type']) =>
                  setScanForm({ ...scanForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">快速扫描 - 仅检测高风险链接</SelectItem>
                  <SelectItem value="full">全量扫描 - 扫描所有链接</SelectItem>
                  <SelectItem value="targeted">定向扫描 - 指定目标</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scanForm.type === 'targeted' && (
              <div className="space-y-2">
                <Label>扫描目标</Label>
                <Input
                  value={scanForm.target}
                  onChange={(e) => setScanForm({ ...scanForm, target: e.target.value })}
                  placeholder="输入团队ID、域名或链接ID"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => triggerScanMutation.mutate(scanForm)}
              disabled={triggerScanMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              启动扫描
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Blacklist Dialog */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加到黑名单</DialogTitle>
            <DialogDescription>添加恶意域名、URL或模式到黑名单</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={blacklistForm.type}
                onValueChange={(value: BlacklistEntry['type']) =>
                  setBlacklistForm({ ...blacklistForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domain">域名</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="pattern">正则模式</SelectItem>
                  <SelectItem value="ip">IP 地址</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>值</Label>
              <Input
                value={blacklistForm.value}
                onChange={(e) => setBlacklistForm({ ...blacklistForm, value: e.target.value })}
                placeholder={
                  blacklistForm.type === 'domain'
                    ? 'example.com'
                    : blacklistForm.type === 'url'
                      ? 'https://example.com/malicious'
                      : blacklistForm.type === 'pattern'
                        ? '.*malware.*'
                        : '192.168.1.1'
                }
              />
            </div>
            <div className="space-y-2">
              <Label>原因</Label>
              <Textarea
                value={blacklistForm.reason}
                onChange={(e) => setBlacklistForm({ ...blacklistForm, reason: e.target.value })}
                placeholder="说明添加到黑名单的原因"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => addToBlacklistMutation.mutate(blacklistForm)}
              disabled={addToBlacklistMutation.isPending || !blacklistForm.value}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>扫描详情</DialogTitle>
          </DialogHeader>
          {viewingScan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">扫描类型</Label>
                  <p className="font-medium">{scanTypeLabels[viewingScan.type]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge
                    variant={
                      viewingScan.status === 'completed'
                        ? 'default'
                        : viewingScan.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {scanStatusLabels[viewingScan.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">开始时间</Label>
                  <p className="font-medium">
                    {viewingScan.startedAt
                      ? new Date(viewingScan.startedAt).toLocaleString('zh-CN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">完成时间</Label>
                  <p className="font-medium">
                    {viewingScan.completedAt
                      ? new Date(viewingScan.completedAt).toLocaleString('zh-CN')
                      : '-'}
                  </p>
                </div>
              </div>

              {viewingScan.status === 'completed' && (
                <>
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">扫描结果</Label>
                    <div className="grid grid-cols-4 gap-4 mt-2">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{viewingScan.results.totalScanned}</p>
                        <p className="text-sm text-gray-500">总扫描</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {viewingScan.results.safe}
                        </p>
                        <p className="text-sm text-gray-500">安全</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {viewingScan.results.warnings}
                        </p>
                        <p className="text-sm text-gray-500">警告</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {viewingScan.results.threats}
                        </p>
                        <p className="text-sm text-gray-500">威胁</p>
                      </div>
                    </div>
                  </div>

                  {viewingScan.findings && viewingScan.findings.length > 0 && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">发现的问题</Label>
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {viewingScan.findings.map((finding, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${severityColors[finding.severity]}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {severityLabels[finding.severity]}
                                </Badge>
                                <span className="text-sm font-medium">{finding.type}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                              {finding.url && (
                                <p className="text-xs text-gray-400 mt-1 font-mono">
                                  {finding.url}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove from Blacklist Confirmation */}
      <AlertDialog open={!!removeBlacklistTarget} onOpenChange={(open) => !open && setRemoveBlacklistTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除黑名单</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从黑名单移除 "{removeBlacklistTarget?.value}" 吗？移除后该条目将不再被拦截。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeBlacklistTarget && removeFromBlacklistMutation.mutate(removeBlacklistTarget.id)}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
