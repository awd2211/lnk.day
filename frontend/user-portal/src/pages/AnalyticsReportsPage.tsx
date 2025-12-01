import { useState } from 'react';
import { FileText, Download, Calendar, Filter, Clock, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';

import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useGenerateReport,
  useDeleteReport,
  ReportType,
  ReportFormat,
  REPORT_TYPE_LABELS,
  FORMAT_LABELS,
  Report,
} from '@/hooks/useReports';

type DateRange = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [exportFormat, setExportFormat] = useState<ReportFormat>('pdf');

  const { data: reportsData, isLoading } = useReports({ limit: 20 });
  const generateReport = useGenerateReport();
  const deleteReport = useDeleteReport();

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const handleGenerateReport = async () => {
    try {
      await generateReport.mutateAsync({
        type: reportType,
        name: `${REPORT_TYPE_LABELS[reportType].label} - ${new Date().toLocaleDateString('zh-CN')}`,
        dateRange: getDateRange(),
        metrics: ['clicks', 'unique_clicks', 'devices', 'countries', 'referrers'],
        format: exportFormat,
      });
      toast({
        title: '报告已开始生成',
        description: '报告生成完成后将通知您下载',
      });
    } catch (error) {
      toast({
        title: '生成报告失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteReport.mutateAsync(id);
      toast({ title: '报告已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleDownload = (report: Report) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
    }
  };

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            已完成
          </Badge>
        );
      case 'processing':
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            生成中
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        );
    }
  };

  const getDateRangeLabel = (report: Report) => {
    if (report.config?.dateRange) {
      return `${report.config.dateRange.start} - ${report.config.dateRange.end}`;
    }
    return '未知时间范围';
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">报告导出</h1>
        <p className="text-muted-foreground mt-1">生成和下载分析数据报告</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 生成报告 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                生成新报告
              </CardTitle>
              <CardDescription>选择报告类型和时间范围</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">报告类型</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TYPE_LABELS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">时间范围</label>
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">最近 7 天</SelectItem>
                    <SelectItem value="30d">最近 30 天</SelectItem>
                    <SelectItem value="90d">最近 90 天</SelectItem>
                    <SelectItem value="custom">自定义范围</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">导出格式</label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ReportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAT_LABELS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleGenerateReport} disabled={generateReport.isPending}>
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    生成报告
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 报告说明 */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">报告类型说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {Object.entries(REPORT_TYPE_LABELS).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{value.label}：</span>
                  <span className="text-muted-foreground">{value.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 报告历史 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    历史报告
                  </CardTitle>
                  <CardDescription>查看和下载已生成的报告</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  筛选
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reportsData?.items && reportsData.items.length > 0 ? (
                <div className="space-y-3">
                  {reportsData.items.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{report.name || REPORT_TYPE_LABELS[report.type]?.label || report.type}</span>
                            <Badge variant="secondary" className="text-xs">
                              {FORMAT_LABELS[report.config?.format || 'pdf']?.label || report.config?.format}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{getDateRangeLabel(report)}</div>
                          <div className="text-xs text-muted-foreground">
                            创建于 {new Date(report.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(report.status)}
                        {report.status === 'completed' && report.fileUrl && (
                          <Button variant="outline" size="sm" onClick={() => handleDownload(report)}>
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deleteReport.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>暂无历史报告</p>
                  <p className="text-sm">生成您的第一份报告开始使用</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
