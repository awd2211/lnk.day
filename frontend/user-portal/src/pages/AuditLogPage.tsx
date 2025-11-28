import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAuditLogs,
  useAuditLogStats,
  useLoginHistory,
  actionLabels,
  resourceTypeLabels,
  severityLabels,
  AuditLog,
  AuditLogFilters,
} from '@/hooks/useAuditLogs';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  User,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  LogIn,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function LogDetailDialog({
  log,
  open,
  onClose,
}: {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>操作详情</DialogTitle>
          <DialogDescription>
            {log.actionLabel || actionLabels[log.action] || log.action}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">操作者</p>
              <p className="font-medium">{log.userName || log.userEmail}</p>
              <p className="text-sm text-muted-foreground">{log.userEmail}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">时间</p>
              <p className="font-medium">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">IP 地址</p>
              <p className="font-medium">{log.ipAddress}</p>
              {log.location && (
                <p className="text-sm text-muted-foreground">
                  {log.location.city}, {log.location.country}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">状态</p>
              <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                {log.status === 'success' ? '成功' : '失败'}
              </Badge>
            </div>
            {log.resourceType && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">资源类型</p>
                <p className="font-medium">{resourceTypeLabels[log.resourceType] || log.resourceType}</p>
              </div>
            )}
            {log.resourceName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">资源名称</p>
                <p className="font-medium">{log.resourceName}</p>
              </div>
            )}
          </div>

          {log.userAgent && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">User Agent</p>
              <p className="text-sm break-all bg-muted p-2 rounded">{log.userAgent}</p>
            </div>
          )}

          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">详细信息</p>
              <pre className="text-sm bg-muted p-3 rounded overflow-auto max-h-[200px]">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: logsData, isLoading, refetch } = useAuditLogs(filters, page, 50);
  const { data: stats } = useAuditLogStats();
  const { data: loginHistory, isLoading: loginsLoading } = useLoginHistory();

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const getSeverityBadge = (severity: string) => {
    const config = severityLabels[severity] || { label: severity, color: 'gray' };
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      info: 'secondary',
      warning: 'outline',
      critical: 'destructive',
    };
    return <Badge variant={variants[severity] || 'secondary'}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">审计日志</h1>
            <p className="text-muted-foreground mt-1">查看系统操作记录和登录历史</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">总记录数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.todayLogs.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">今日操作</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.failedActions}</p>
                    <p className="text-sm text-muted-foreground">失败操作</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.criticalEvents}</p>
                    <p className="text-sm text-muted-foreground">严重事件</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">所有日志</TabsTrigger>
            <TabsTrigger value="logins">登录历史</TabsTrigger>
            <TabsTrigger value="security">安全事件</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* 筛选器 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索操作、用户、资源..."
                        className="pl-10"
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                      />
                    </div>
                  </div>

                  <Select
                    value={filters.resourceType || ''}
                    onValueChange={(value) => handleFilterChange('resourceType', value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="资源类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部</SelectItem>
                      {Object.entries(resourceTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.status || ''}
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部</SelectItem>
                      <SelectItem value="success">成功</SelectItem>
                      <SelectItem value="failure">失败</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.severity || ''}
                    onValueChange={(value) => handleFilterChange('severity', value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="级别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部</SelectItem>
                      <SelectItem value="info">信息</SelectItem>
                      <SelectItem value="warning">警告</SelectItem>
                      <SelectItem value="critical">严重</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    className="w-[150px]"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />

                  <Input
                    type="date"
                    className="w-[150px]"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />

                  {Object.keys(filters).some(k => filters[k as keyof AuditLogFilters]) && (
                    <Button variant="ghost" onClick={clearFilters}>
                      清除筛选
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 日志列表 */}
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>时间</TableHead>
                          <TableHead>用户</TableHead>
                          <TableHead>操作</TableHead>
                          <TableHead>资源</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>级别</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logsData?.data?.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{log.userName || log.userEmail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                {log.actionLabel || actionLabels[log.action] || log.action}
                              </span>
                            </TableCell>
                            <TableCell>
                              {log.resourceType && (
                                <Badge variant="outline">
                                  {resourceTypeLabels[log.resourceType] || log.resourceType}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{getStatusIcon(log.status)}</TableCell>
                            <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.ipAddress}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* 分页 */}
                    {logsData && logsData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          共 {logsData.total.toLocaleString()} 条记录，第 {page} / {logsData.totalPages} 页
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= logsData.totalPages}
                            onClick={() => setPage(p => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logins" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  登录历史
                </CardTitle>
                <CardDescription>查看账号的登录记录</CardDescription>
              </CardHeader>
              <CardContent>
                {loginsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>用户</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>IP 地址</TableHead>
                        <TableHead>位置</TableHead>
                        <TableHead>设备</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginHistory?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{log.userEmail}</TableCell>
                          <TableCell>
                            {log.action === 'user.login' ? (
                              <Badge className="bg-green-500">登录成功</Badge>
                            ) : log.action === 'user.logout' ? (
                              <Badge variant="secondary">登出</Badge>
                            ) : (
                              <Badge variant="destructive">登录失败</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{log.ipAddress}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.location ? `${log.location.city}, ${log.location.country}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.userAgent?.substring(0, 50)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  安全事件
                </CardTitle>
                <CardDescription>重要的安全相关操作记录</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>事件</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>详情</TableHead>
                      <TableHead>级别</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.data
                      ?.filter(log => log.severity !== 'info' || log.action.includes('2fa') || log.action.includes('password') || log.action.includes('sso'))
                      .slice(0, 20)
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.actionLabel || actionLabels[log.action] || log.action}
                          </TableCell>
                          <TableCell>{log.userEmail}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </TableCell>
                          <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <LogDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </Layout>
  );
}
