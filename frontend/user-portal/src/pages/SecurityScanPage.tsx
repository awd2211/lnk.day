import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
  RefreshCw,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  History,
  Zap,
  FileText,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { linkSecurityService } from '@/lib/api';

interface ScanResult {
  id: string;
  url: string;
  status: 'safe' | 'warning' | 'dangerous' | 'scanning' | 'error';
  score: number;
  threats: string[];
  scannedAt: string;
  details?: {
    malware: boolean;
    phishing: boolean;
    spam: boolean;
    ssl: boolean;
    reputation: number;
  };
}

interface ScanHistory {
  id: string;
  url: string;
  status: 'safe' | 'warning' | 'dangerous';
  score: number;
  scannedAt: string;
}

function SecurityScanPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch recent scans (scan history)
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['security-scan-history'],
    queryFn: async () => {
      const response = await linkSecurityService.getRecentScans(50);
      return response.data;
    },
  });

  // Fetch overall stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['security-stats'],
    queryFn: async () => {
      const response = await linkSecurityService.getStats();
      return response.data;
    },
  });

  const history: ScanHistory[] = historyData?.scans || [];
  const stats = statsData || {
    totalScans: 0,
    safeLinks: 0,
    warningLinks: 0,
    dangerousLinks: 0,
    averageScore: 0,
  };

  // Single URL scan mutation
  const scanMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await linkSecurityService.scan(url);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['security-scan-history'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      setSelectedResult(data);
      setDetailsDialogOpen(true);

      if (data.status === 'safe') {
        toast({ title: '扫描完成', description: 'URL 安全检查通过' });
      } else if (data.status === 'warning') {
        toast({ title: '扫描完成', description: 'URL 存在潜在风险', variant: 'default' });
      } else {
        toast({ title: '扫描完成', description: 'URL 检测到安全威胁', variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: '错误', description: '扫描失败，请重试', variant: 'destructive' });
    },
  });

  // Bulk scan mutation
  const bulkScanMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await linkSecurityService.batchScan(urls);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['security-scan-history'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast({
        title: '批量扫描完成',
        description: `已扫描 ${data.count} 个 URL`
      });
      setBulkUrls('');
    },
    onError: () => {
      toast({ title: '错误', description: '批量扫描失败', variant: 'destructive' });
    },
  });

  const handleSingleScan = () => {
    if (!urlInput.trim()) {
      toast({ title: '错误', description: '请输入 URL', variant: 'destructive' });
      return;
    }
    try {
      new URL(urlInput);
      scanMutation.mutate(urlInput.trim());
    } catch {
      toast({ title: '错误', description: '请输入有效的 URL', variant: 'destructive' });
    }
  };

  const handleBulkScan = () => {
    const urls = bulkUrls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

    if (urls.length === 0) {
      toast({ title: '错误', description: '请输入有效的 URL', variant: 'destructive' });
      return;
    }

    bulkScanMutation.mutate(urls);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ShieldAlert className="h-5 w-5 text-orange-500" />;
      case 'dangerous':
        return <ShieldX className="h-5 w-5 text-destructive" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'safe':
        return <Badge className="bg-green-500">安全</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500">警告</Badge>;
      case 'dangerous':
        return <Badge variant="destructive">危险</Badge>;
      case 'scanning':
        return <Badge variant="secondary">扫描中</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-destructive';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">安全检查</h1>
            <p className="text-muted-foreground">
              扫描 URL 检测恶意软件、钓鱼和其他安全威胁
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            导出报告
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总扫描次数</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{stats.totalScans?.toLocaleString() || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">安全链接</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold text-green-500">{stats.safeLinks || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">警告链接</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold text-orange-500">{stats.warningLinks || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">危险链接</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold text-destructive">{stats.dangerousLinks || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均安全分</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore || 0)}`}>
                  {stats.averageScore || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scan Interface */}
        <Tabs defaultValue="single" className="space-y-4">
          <TabsList>
            <TabsTrigger value="single">
              <Zap className="mr-2 h-4 w-4" />
              单个扫描
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <FileText className="mr-2 h-4 w-4" />
              批量扫描
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              扫描历史
            </TabsTrigger>
          </TabsList>

          {/* Single Scan */}
          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle>URL 安全检查</CardTitle>
                <CardDescription>
                  输入 URL 进行安全扫描，检测恶意软件和钓鱼威胁
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://example.com/path"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSingleScan();
                      }}
                    />
                  </div>
                  <Button onClick={handleSingleScan} disabled={scanMutation.isPending}>
                    {scanMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    扫描
                  </Button>
                </div>

                {/* Quick Info */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <ShieldCheck className="h-8 w-8 text-green-500 shrink-0" />
                    <div>
                      <h4 className="font-medium">恶意软件检测</h4>
                      <p className="text-sm text-muted-foreground">
                        扫描病毒、木马和其他恶意代码
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <ShieldAlert className="h-8 w-8 text-orange-500 shrink-0" />
                    <div>
                      <h4 className="font-medium">钓鱼检测</h4>
                      <p className="text-sm text-muted-foreground">
                        识别仿冒网站和欺诈页面
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <Shield className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <h4 className="font-medium">信誉评估</h4>
                      <p className="text-sm text-muted-foreground">
                        基于多个数据源评估网站信誉
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Scan */}
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>批量 URL 扫描</CardTitle>
                <CardDescription>
                  一次扫描多个 URL，每行一个
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows={8}
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {bulkUrls.split('\n').filter((u) => u.trim()).length} 个 URL
                  </p>
                  <Button onClick={handleBulkScan} disabled={bulkScanMutation.isPending}>
                    {bulkScanMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    开始批量扫描
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>扫描历史</CardTitle>
                <CardDescription>
                  查看之前的扫描结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">暂无扫描记录</h3>
                    <p className="text-muted-foreground text-center">
                      扫描 URL 后，记录将显示在这里
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>状态</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead className="text-center">安全评分</TableHead>
                        <TableHead>扫描时间</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 max-w-[300px]">
                              <span className="truncate font-mono text-sm">{item.url}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() => window.open(item.url, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>在新标签页打开</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-bold ${getScoreColor(item.score)}`}>
                                {item.score}
                              </span>
                              <Progress
                                value={item.score}
                                className={`w-16 h-2 ${
                                  item.score >= 80
                                    ? '[&>div]:bg-green-500'
                                    : item.score >= 60
                                    ? '[&>div]:bg-orange-500'
                                    : '[&>div]:bg-destructive'
                                }`}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {new Date(item.scannedAt).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedResult({
                                    ...item,
                                    threats: [],
                                    details: {
                                      malware: false,
                                      phishing: item.status === 'dangerous',
                                      spam: item.status === 'warning',
                                      ssl: true,
                                      reputation: item.score,
                                    },
                                  });
                                  setDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => scanMutation.mutate(item.url)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedResult && getStatusIcon(selectedResult.status)}
                扫描结果详情
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.url}
              </DialogDescription>
            </DialogHeader>
            {selectedResult && (
              <div className="space-y-4">
                {/* Score */}
                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-4xl font-bold ${getScoreColor(selectedResult.score)}`}>
                    {selectedResult.score}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">安全评分</p>
                  <Progress
                    value={selectedResult.score}
                    className={`mt-2 ${
                      selectedResult.score >= 80
                        ? '[&>div]:bg-green-500'
                        : selectedResult.score >= 60
                        ? '[&>div]:bg-orange-500'
                        : '[&>div]:bg-destructive'
                    }`}
                  />
                </div>

                {/* Details */}
                {selectedResult.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium">检测项目</h4>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>恶意软件</span>
                        {selectedResult.details.malware ? (
                          <Badge variant="destructive">检测到威胁</Badge>
                        ) : (
                          <Badge className="bg-green-500">安全</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>钓鱼网站</span>
                        {selectedResult.details.phishing ? (
                          <Badge variant="destructive">检测到威胁</Badge>
                        ) : (
                          <Badge className="bg-green-500">安全</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>垃圾内容</span>
                        {selectedResult.details.spam ? (
                          <Badge className="bg-orange-500">可疑</Badge>
                        ) : (
                          <Badge className="bg-green-500">正常</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>SSL 证书</span>
                        {selectedResult.details.ssl ? (
                          <Badge className="bg-green-500">有效</Badge>
                        ) : (
                          <Badge variant="destructive">无效</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Threats */}
                {selectedResult.threats && selectedResult.threats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">检测到的威胁</h4>
                    <ul className="space-y-1">
                      {selectedResult.threats.map((threat, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          {threat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scan Time */}
                <div className="text-sm text-muted-foreground text-center">
                  扫描时间: {new Date(selectedResult.scannedAt).toLocaleString()}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default SecurityScanPage;
