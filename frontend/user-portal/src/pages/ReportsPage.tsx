import { useState } from 'react';
import {
  Plus,
  FileText,
  Download,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  CalendarClock,
  Power,
  BarChart3,
  Globe,
  Smartphone,
  Target,
  FileSpreadsheet,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useReports,
  useScheduledReports,
  useGenerateReport,
  useDeleteReport,
  useToggleScheduledReport,
  useDeleteScheduledReport,
  Report,
  ScheduledReport,
  ReportType,
  ReportFormat,
  ReportSchedule,
  REPORT_TYPE_LABELS,
  REPORT_METRICS,
  SCHEDULE_LABELS,
  FORMAT_LABELS,
} from '@/hooks/useReports';
import { cn } from '@/lib/utils';

type DateRangePreset = '7d' | '14d' | '30d' | '90d' | 'custom';

export default function ReportsPage() {
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('reports');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'summary' as ReportType,
    dateRangePreset: '30d' as DateRangePreset,
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    metrics: ['clicks', 'unique_clicks', 'devices', 'countries'] as string[],
    format: 'pdf' as ReportFormat,
    schedule: 'once' as ReportSchedule,
    recipients: '',
  });

  // Queries
  const { data: reportsData, isLoading: isLoadingReports, refetch: refetchReports } = useReports({ page, limit: 10 });
  const { data: scheduledReports, isLoading: isLoadingScheduled } = useScheduledReports();

  // Mutations
  const generateReport = useGenerateReport();
  const deleteReport = useDeleteReport();
  const toggleScheduled = useToggleScheduledReport();
  const deleteScheduled = useDeleteScheduledReport();

  const reports = reportsData?.items || [];

  const updateDateRange = (preset: DateRangePreset) => {
    setFormData((prev) => ({
      ...prev,
      dateRangePreset: preset,
      startDate: preset === 'custom' ? prev.startDate : format(subDays(new Date(), parseInt(preset)), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
    }));
  };

  const toggleMetric = (metricId: string) => {
    setFormData((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter((m) => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  const handleGenerateReport = async () => {
    if (!formData.name.trim() || formData.metrics.length === 0) return;

    try {
      await generateReport.mutateAsync({
        type: formData.type,
        name: formData.name.trim(),
        dateRange: {
          start: formData.startDate,
          end: formData.endDate,
        },
        metrics: formData.metrics,
        format: formData.format,
      });
      setIsCreateDialogOpen(false);
      toast({ title: '报告生成中', description: '生成完成后可下载' });
    } catch {
      toast({ title: '生成失败', variant: 'destructive' });
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!confirm(`确定要删除报告 "${report.name}" 吗？`)) return;

    try {
      await deleteReport.mutateAsync(report.id);
      toast({ title: '报告已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleToggleScheduled = async (scheduled: ScheduledReport) => {
    try {
      await toggleScheduled.mutateAsync(scheduled.id);
      toast({
        title: scheduled.isActive ? '定时报告已暂停' : '定时报告已启用',
      });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDeleteScheduled = async (scheduled: ScheduledReport) => {
    if (!confirm(`确定要删除定时报告 "${scheduled.name}" 吗？`)) return;

    try {
      await deleteScheduled.mutateAsync(scheduled.id);
      toast({ title: '定时报告已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const downloadReport = (report: Report) => {
    if (!report.fileUrl) return;
    window.open(report.fileUrl, '_blank');
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: Report['status']) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '生成中';
      case 'failed':
        return '失败';
      default:
        return '等待中';
    }
  };

  const getTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'summary':
        return <BarChart3 className="h-4 w-4" />;
      case 'geographic':
        return <Globe className="h-4 w-4" />;
      case 'devices':
        return <Smartphone className="h-4 w-4" />;
      case 'campaigns':
        return <Target className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">报告中心</h1>
            <p className="text-muted-foreground">生成和管理数据分析报告</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            生成报告
          </Button>
        </div>

        {/* Quick report cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(REPORT_TYPE_LABELS).slice(0, 4).map(([type, { label, description }]) => (
            <Card
              key={type}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  type: type as ReportType,
                  name: `${label} - ${format(new Date(), 'yyyy-MM-dd')}`,
                }));
                setIsCreateDialogOpen(true);
              }}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  {getTypeIcon(type as ReportType)}
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              已生成报告
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              定时报告
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                共 {reportsData?.total || 0} 份报告
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchReports()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新
              </Button>
            </div>

            {isLoadingReports ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="rounded-lg bg-muted p-3">
                        {getTypeIcon(report.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{report.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {REPORT_TYPE_LABELS[report.type]?.label || report.type}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {getStatusIcon(report.status)}
                            {getStatusLabel(report.status)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm', {
                              locale: zhCN,
                            })}
                          </span>
                          {report.fileSize && (
                            <span>{(report.fileSize / 1024).toFixed(1)} KB</span>
                          )}
                        </div>
                        {report.errorMessage && (
                          <p className="mt-1 text-xs text-red-500">
                            {report.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {report.status === 'completed' && report.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            下载
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReport(report)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">暂无报告</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    点击上方按钮生成第一份报告
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    生成报告
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            {isLoadingScheduled ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : scheduledReports && scheduledReports.length > 0 ? (
              <div className="space-y-3">
                {scheduledReports.map((scheduled) => (
                  <Card
                    key={scheduled.id}
                    className={cn(!scheduled.isActive && 'opacity-60')}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="rounded-lg bg-muted p-3">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{scheduled.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {SCHEDULE_LABELS[scheduled.schedule]}
                          </Badge>
                          {!scheduled.isActive && (
                            <Badge variant="outline" className="text-xs">
                              已暂停
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            下次运行:{' '}
                            {format(new Date(scheduled.nextRunAt), 'yyyy-MM-dd HH:mm', {
                              locale: zhCN,
                            })}
                          </span>
                          {scheduled.lastRunAt && (
                            <span>
                              上次运行:{' '}
                              {format(new Date(scheduled.lastRunAt), 'MM-dd HH:mm', {
                                locale: zhCN,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleScheduled(scheduled)}
                        >
                          <Power
                            className={cn(
                              'h-4 w-4',
                              scheduled.isActive
                                ? 'text-green-500'
                                : 'text-muted-foreground'
                            )}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteScheduled(scheduled)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarClock className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">暂无定时报告</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    创建定时报告可自动生成并发送报告
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Report Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>生成报告</DialogTitle>
              <DialogDescription>选择报告类型和数据范围</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Report name */}
              <div>
                <Label htmlFor="report-name">报告名称</Label>
                <Input
                  id="report-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 2024年1月月度报告"
                  className="mt-1"
                />
              </div>

              {/* Report type */}
              <div>
                <Label>报告类型</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(REPORT_TYPE_LABELS).map(([type, { label }]) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type: type as ReportType })}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                        formData.type === type
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      )}
                    >
                      {getTypeIcon(type as ReportType)}
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div>
                <Label>时间范围</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['7d', '14d', '30d', '90d', 'custom'] as DateRangePreset[]).map(
                    (preset) => (
                      <Button
                        key={preset}
                        variant={formData.dateRangePreset === preset ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateDateRange(preset)}
                      >
                        {preset === '7d'
                          ? '最近7天'
                          : preset === '14d'
                          ? '最近14天'
                          : preset === '30d'
                          ? '最近30天'
                          : preset === '90d'
                          ? '最近90天'
                          : '自定义'}
                      </Button>
                    )
                  )}
                </div>
                {formData.dateRangePreset === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date" className="text-xs">
                        开始日期
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-xs">
                        结束日期
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div>
                <Label>包含指标</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {REPORT_METRICS.map((metric) => (
                    <label
                      key={metric.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={formData.metrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetric(metric.id)}
                      />
                      <span className="text-sm">{metric.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <Label>输出格式</Label>
                <div className="mt-2 flex gap-2">
                  {(Object.entries(FORMAT_LABELS) as [ReportFormat, { label: string }][]).map(
                    ([format, { label }]) => (
                      <Button
                        key={format}
                        variant={formData.format === format ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, format })}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {label}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={
                  !formData.name.trim() ||
                  formData.metrics.length === 0 ||
                  generateReport.isPending
                }
              >
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '生成报告'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
