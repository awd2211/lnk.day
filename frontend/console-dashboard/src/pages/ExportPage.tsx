import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  FileText,
  Users,
  Building2,
  Link2,
  BarChart3,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportService } from '@/lib/api';

interface ExportJob {
  id: string;
  type: 'users' | 'teams' | 'links' | 'analytics' | 'invoices';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'csv' | 'json' | 'xlsx';
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  progress?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  requestedBy: string;
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  users: { label: '用户数据', icon: Users, color: 'bg-blue-100 text-blue-700' },
  teams: { label: '团队数据', icon: Building2, color: 'bg-green-100 text-green-700' },
  links: { label: '链接数据', icon: Link2, color: 'bg-purple-100 text-purple-700' },
  analytics: { label: '分析数据', icon: BarChart3, color: 'bg-orange-100 text-orange-700' },
  invoices: { label: '发票数据', icon: Receipt, color: 'bg-pink-100 text-pink-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '等待中', color: 'bg-gray-100 text-gray-700', icon: Clock },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: '失败', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ExportPage() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedType, setSelectedType] = useState<string>('users');
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [createOpen, setCreateOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const queryClient = useQueryClient();

  // Fetch export jobs
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: async () => {
      try {
        const response = await exportService.getJobs({});
        return response.data;
      } catch {
        const mockJobs: ExportJob[] = [
          {
            id: '1',
            type: 'users',
            status: 'completed',
            format: 'csv',
            fileName: 'users_export_20240120.csv',
            fileSize: 1245680,
            recordCount: 15680,
            createdAt: '2024-01-20T10:30:00Z',
            completedAt: '2024-01-20T10:32:15Z',
            expiresAt: '2024-01-27T10:32:15Z',
            requestedBy: 'admin@lnk.day',
          },
          {
            id: '2',
            type: 'analytics',
            status: 'processing',
            format: 'xlsx',
            progress: 65,
            createdAt: '2024-01-20T11:00:00Z',
            requestedBy: 'admin@lnk.day',
          },
          {
            id: '3',
            type: 'links',
            status: 'pending',
            format: 'json',
            createdAt: '2024-01-20T11:05:00Z',
            requestedBy: 'admin@lnk.day',
          },
          {
            id: '4',
            type: 'invoices',
            status: 'failed',
            format: 'csv',
            error: '数据量过大，请缩小日期范围',
            createdAt: '2024-01-19T15:30:00Z',
            requestedBy: 'admin@lnk.day',
          },
          {
            id: '5',
            type: 'teams',
            status: 'completed',
            format: 'csv',
            fileName: 'teams_export_20240118.csv',
            fileSize: 524288,
            recordCount: 856,
            createdAt: '2024-01-18T09:00:00Z',
            completedAt: '2024-01-18T09:01:30Z',
            expiresAt: '2024-01-25T09:01:30Z',
            requestedBy: 'admin@lnk.day',
          },
        ];
        return { items: mockJobs, total: 5 };
      }
    },
    refetchInterval: 5000, // Auto refresh every 5 seconds
  });

  // Create export mutation
  const createExportMutation = useMutation({
    mutationFn: async (data: { type: string; format: string; startDate?: string; endDate?: string }) => {
      switch (data.type) {
        case 'users':
          return exportService.exportUsers({ format: data.format });
        case 'teams':
          return exportService.exportTeams({ format: data.format });
        case 'links':
          return exportService.exportLinks({ format: data.format });
        case 'analytics':
          return exportService.exportAnalytics({
            format: data.format,
            startDate: data.startDate,
            endDate: data.endDate,
          });
        case 'invoices':
          return exportService.exportInvoices({
            format: data.format,
            startDate: data.startDate,
            endDate: data.endDate,
          });
        default:
          throw new Error('Unknown export type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
      setCreateOpen(false);
    },
  });

  const handleCreateExport = () => {
    createExportMutation.mutate({
      type: selectedType,
      format: selectedFormat,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    });
  };

  const handleDownload = async (job: ExportJob) => {
    try {
      const response = await exportService.downloadExport(job.id);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.fileName || `export_${job.id}.${job.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">数据导出</h2>
          <p className="text-sm text-gray-500">批量导出平台数据为 CSV、JSON 或 Excel 格式</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          创建导出任务
        </Button>
      </div>

      {/* Export Types */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(typeConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div
              key={key}
              className="cursor-pointer rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
              onClick={() => {
                setSelectedType(key);
                setCreateOpen(true);
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${config.color.split(' ')[0]}`}>
                  <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-gray-500">点击导出</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export Jobs Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-4">
          <h3 className="font-semibold">导出任务</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">格式</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">记录数</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">文件大小</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : jobs?.items?.length ? (
                jobs.items.map((job: ExportJob) => {
                  const TypeIcon = typeConfig[job.type]?.icon || FileText;
                  const StatusIcon = statusConfig[job.status]?.icon || Clock;
                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{typeConfig[job.type]?.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{job.format.toUpperCase()}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className={statusConfig[job.status]?.color}>
                            <StatusIcon
                              className={`mr-1 h-3 w-3 ${
                                job.status === 'processing' ? 'animate-spin' : ''
                              }`}
                            />
                            {statusConfig[job.status]?.label}
                          </Badge>
                          {job.status === 'processing' && job.progress !== undefined && (
                            <span className="text-sm text-gray-500">{job.progress}%</span>
                          )}
                        </div>
                        {job.error && (
                          <p className="mt-1 text-xs text-red-500">{job.error}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {job.recordCount?.toLocaleString() || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">{formatFileSize(job.fileSize)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {job.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job)}
                          >
                            <Download className="mr-1 h-4 w-4" />
                            下载
                          </Button>
                        )}
                        {job.status === 'failed' && (
                          <Button variant="outline" size="sm">
                            <RefreshCw className="mr-1 h-4 w-4" />
                            重试
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无导出任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Export Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建导出任务</DialogTitle>
            <DialogDescription>选择要导出的数据类型和格式</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>数据类型</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择数据类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>导出格式</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="选择格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedType === 'analytics' || selectedType === 'invoices') && (
              <div className="space-y-2">
                <Label>日期范围 (可选)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    placeholder="开始日期"
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    placeholder="结束日期"
                  />
                </div>
              </div>
            )}

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                导出任务将在后台处理。大数据量导出可能需要几分钟时间，完成后可在任务列表中下载。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateExport} disabled={createExportMutation.isPending}>
              {createExportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  开始导出
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
