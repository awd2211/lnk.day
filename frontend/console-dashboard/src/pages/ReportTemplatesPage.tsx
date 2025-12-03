import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FileBarChart,
  RefreshCw,
  TrendingUp,
  Target,
  Activity,
  GitCompare,
  Settings,
  Calendar,
  Download,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { templatesService } from '@/lib/api';

type ReportCategory = 'traffic' | 'conversion' | 'engagement' | 'comparison' | 'custom';
type DateRangeType = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';
type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json';

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: ReportCategory;
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: {
    type: DateRangeType;
    startDate?: string;
    endDate?: string;
    compareWithPrevious?: boolean;
  };
  groupBy?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  limitResults?: number;
  format: ExportFormat;
  includeCharts: boolean;
  includeSummary: boolean;
  customBranding?: string;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    recipients: string[];
  };
  isActive: boolean;
  displayOrder: number;
  usageCount: number;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<ReportCategory, { label: string; color: string; icon: any }> = {
  traffic: { label: '流量分析', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
  conversion: { label: '转化跟踪', color: 'bg-green-100 text-green-700', icon: Target },
  engagement: { label: '互动分析', color: 'bg-purple-100 text-purple-700', icon: Activity },
  comparison: { label: '对比分析', color: 'bg-orange-100 text-orange-700', icon: GitCompare },
  custom: { label: '自定义', color: 'bg-slate-100 text-slate-700', icon: Settings },
};

const DEFAULT_CATEGORY_CONFIG = { label: '未知', color: 'bg-gray-100 text-gray-700', icon: FileBarChart };

const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG[category as ReportCategory] || DEFAULT_CATEGORY_CONFIG;
};

const DATE_RANGE_OPTIONS = [
  { value: 'last_7_days', label: '最近 7 天' },
  { value: 'last_30_days', label: '最近 30 天' },
  { value: 'last_90_days', label: '最近 90 天' },
  { value: 'last_12_months', label: '最近 12 个月' },
  { value: 'custom', label: '自定义范围' },
];

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'json', label: 'JSON' },
];

const AVAILABLE_METRICS = [
  { id: 'clicks', label: '点击量' },
  { id: 'unique_clicks', label: '独立访客' },
  { id: 'conversions', label: '转化次数' },
  { id: 'conversion_rate', label: '转化率' },
  { id: 'qr_scans', label: 'QR 扫描' },
  { id: 'page_views', label: '页面浏览' },
  { id: 'bounce_rate', label: '跳出率' },
  { id: 'avg_time_on_page', label: '平均停留时间' },
];

const AVAILABLE_DIMENSIONS = [
  { id: 'date', label: '日期' },
  { id: 'country', label: '国家' },
  { id: 'city', label: '城市' },
  { id: 'device', label: '设备类型' },
  { id: 'browser', label: '浏览器' },
  { id: 'os', label: '操作系统' },
  { id: 'referrer', label: '来源' },
  { id: 'utm_source', label: 'UTM Source' },
  { id: 'utm_medium', label: 'UTM Medium' },
  { id: 'utm_campaign', label: 'UTM Campaign' },
];

export default function ReportTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'traffic' as ReportCategory,
    metrics: ['clicks', 'unique_clicks'],
    dimensions: ['date'],
    dateRangeType: 'last_30_days' as DateRangeType,
    compareWithPrevious: false,
    groupBy: 'date',
    sortBy: 'clicks',
    sortOrder: 'desc' as 'asc' | 'desc',
    limitResults: 100,
    format: 'pdf' as ExportFormat,
    includeCharts: true,
    includeSummary: true,
    scheduleEnabled: false,
    scheduleFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    scheduleRecipients: '',
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-templates', page, search, category, status],
    queryFn: () =>
      templatesService.getReportTemplates({
        page,
        limit: 20,
        search: search || undefined,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
      }),
  });

  const templates: ReportTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createReportTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateReportTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteReportTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleReportTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'traffic',
      metrics: ['clicks', 'unique_clicks'],
      dimensions: ['date'],
      dateRangeType: 'last_30_days',
      compareWithPrevious: false,
      groupBy: 'date',
      sortBy: 'clicks',
      sortOrder: 'desc',
      limitResults: 100,
      format: 'pdf',
      includeCharts: true,
      includeSummary: true,
      scheduleEnabled: false,
      scheduleFrequency: 'weekly',
      scheduleRecipients: '',
      isActive: true,
    });
  };

  const openEditDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      metrics: template.metrics,
      dimensions: template.dimensions || [],
      dateRangeType: template.dateRange.type,
      compareWithPrevious: template.dateRange.compareWithPrevious || false,
      groupBy: template.groupBy || 'date',
      sortBy: template.sortBy || 'clicks',
      sortOrder: template.sortOrder,
      limitResults: template.limitResults || 100,
      format: template.format,
      includeCharts: template.includeCharts,
      includeSummary: template.includeSummary,
      scheduleEnabled: template.schedule?.enabled || false,
      scheduleFrequency: template.schedule?.frequency || 'weekly',
      scheduleRecipients: template.schedule?.recipients?.join(', ') || '',
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const preparePayload = () => {
    return {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      metrics: formData.metrics,
      dimensions: formData.dimensions.length > 0 ? formData.dimensions : undefined,
      dateRange: {
        type: formData.dateRangeType,
        compareWithPrevious: formData.compareWithPrevious,
      },
      groupBy: formData.groupBy || undefined,
      sortBy: formData.sortBy || undefined,
      sortOrder: formData.sortOrder,
      limitResults: formData.limitResults || undefined,
      format: formData.format,
      includeCharts: formData.includeCharts,
      includeSummary: formData.includeSummary,
      schedule: formData.scheduleEnabled ? {
        enabled: true,
        frequency: formData.scheduleFrequency,
        recipients: formData.scheduleRecipients.split(',').map(e => e.trim()).filter(Boolean),
      } : undefined,
      isActive: formData.isActive,
    };
  };

  const handleCreate = () => {
    createMutation.mutate(preparePayload());
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({ id: selectedTemplate.id, data: preparePayload() });
  };

  const toggleMetric = (metricId: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  const toggleDimension = (dimensionId: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.includes(dimensionId)
        ? prev.dimensions.filter(d => d !== dimensionId)
        : [...prev.dimensions, dimensionId],
    }));
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    const Icon = getCategoryConfig(category).icon;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报告模板</h1>
          <p className="text-gray-600 mt-1">管理分析报告预设模板，配置指标、维度、时间范围和导出格式</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索模板名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类别</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">已启用</SelectItem>
                <SelectItem value="inactive">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无模板</div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <CategoryIcon category={template.category} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge className={getCategoryConfig(template.category).color}>
                          {getCategoryConfig(template.category).label}
                        </Badge>
                        {!template.isActive && (
                          <Badge variant="outline" className="text-gray-500">已禁用</Badge>
                        )}
                        {template.schedule?.enabled && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            <Clock className="w-3 h-3 mr-1" />
                            定时
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {DATE_RANGE_OPTIONS.find(d => d.value === template.dateRange.type)?.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {template.format.toUpperCase()}
                        </span>
                        <span>{template.metrics.length} 个指标</span>
                        <span>使用: {template.usageCount} 次</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => toggleMutation.mutate(template.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建报告模板</DialogTitle>
            <DialogDescription>创建分析报告预设模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 每周流量报告"
                />
              </div>
              <div>
                <Label>类别</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ReportCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="模板用途说明"
              />
            </div>

            {/* Metrics Selection */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">选择指标 *</h4>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`metric-${metric.id}`}
                      checked={formData.metrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <label htmlFor={`metric-${metric.id}`} className="text-sm cursor-pointer">
                      {metric.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimensions Selection */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">选择维度</h4>
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_DIMENSIONS.map((dimension) => (
                  <div key={dimension.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`dimension-${dimension.id}`}
                      checked={formData.dimensions.includes(dimension.id)}
                      onCheckedChange={() => toggleDimension(dimension.id)}
                    />
                    <label htmlFor={`dimension-${dimension.id}`} className="text-sm cursor-pointer">
                      {dimension.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range & Export */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>时间范围</Label>
                <Select
                  value={formData.dateRangeType}
                  onValueChange={(v) => setFormData({ ...formData, dateRangeType: v as DateRangeType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>导出格式</Label>
                <Select
                  value={formData.format}
                  onValueChange={(v) => setFormData({ ...formData, format: v as ExportFormat })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>结果限制</Label>
                <Input
                  type="number"
                  value={formData.limitResults}
                  onChange={(e) => setFormData({ ...formData, limitResults: parseInt(e.target.value) || 100 })}
                  min={1}
                  max={10000}
                />
              </div>
            </div>

            {/* Sorting */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>分组依据</Label>
                <Select
                  value={formData.groupBy}
                  onValueChange={(v) => setFormData({ ...formData, groupBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_DIMENSIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>排序字段</Label>
                <Select
                  value={formData.sortBy}
                  onValueChange={(v) => setFormData({ ...formData, sortBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_METRICS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>排序方向</Label>
                <Select
                  value={formData.sortOrder}
                  onValueChange={(v) => setFormData({ ...formData, sortOrder: v as 'asc' | 'desc' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">降序</SelectItem>
                    <SelectItem value="asc">升序</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.compareWithPrevious}
                  onCheckedChange={(checked) => setFormData({ ...formData, compareWithPrevious: checked })}
                />
                <Label>对比上一周期</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeCharts}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeCharts: checked })}
                />
                <Label>包含图表</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeSummary}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeSummary: checked })}
                />
                <Label>包含摘要</Label>
              </div>
            </div>

            {/* Schedule */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Switch
                  checked={formData.scheduleEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, scheduleEnabled: checked })}
                />
                <h4 className="font-medium">启用定时发送</h4>
              </div>
              {formData.scheduleEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>发送频率</Label>
                    <Select
                      value={formData.scheduleFrequency}
                      onValueChange={(v) => setFormData({ ...formData, scheduleFrequency: v as 'daily' | 'weekly' | 'monthly' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">每天</SelectItem>
                        <SelectItem value="weekly">每周</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>收件人邮箱</Label>
                    <Input
                      value={formData.scheduleRecipients}
                      onChange={(e) => setFormData({ ...formData, scheduleRecipients: e.target.value })}
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>立即启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formData.name || formData.metrics.length === 0 || createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar structure to Create */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑报告模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>类别</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ReportCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">选择指标</h4>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-metric-${metric.id}`}
                      checked={formData.metrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <label htmlFor={`edit-metric-${metric.id}`} className="text-sm cursor-pointer">
                      {metric.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">选择维度</h4>
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_DIMENSIONS.map((dimension) => (
                  <div key={dimension.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-dimension-${dimension.id}`}
                      checked={formData.dimensions.includes(dimension.id)}
                      onCheckedChange={() => toggleDimension(dimension.id)}
                    />
                    <label htmlFor={`edit-dimension-${dimension.id}`} className="text-sm cursor-pointer">
                      {dimension.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>时间范围</Label>
                <Select
                  value={formData.dateRangeType}
                  onValueChange={(v) => setFormData({ ...formData, dateRangeType: v as DateRangeType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>导出格式</Label>
                <Select
                  value={formData.format}
                  onValueChange={(v) => setFormData({ ...formData, format: v as ExportFormat })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>结果限制</Label>
                <Input
                  type="number"
                  value={formData.limitResults}
                  onChange={(e) => setFormData({ ...formData, limitResults: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>分组依据</Label>
                <Select
                  value={formData.groupBy}
                  onValueChange={(v) => setFormData({ ...formData, groupBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_DIMENSIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>排序字段</Label>
                <Select
                  value={formData.sortBy}
                  onValueChange={(v) => setFormData({ ...formData, sortBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_METRICS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>排序方向</Label>
                <Select
                  value={formData.sortOrder}
                  onValueChange={(v) => setFormData({ ...formData, sortOrder: v as 'asc' | 'desc' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">降序</SelectItem>
                    <SelectItem value="asc">升序</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.compareWithPrevious}
                  onCheckedChange={(checked) => setFormData({ ...formData, compareWithPrevious: checked })}
                />
                <Label>对比上一周期</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeCharts}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeCharts: checked })}
                />
                <Label>包含图表</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeSummary}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeSummary: checked })}
                />
                <Label>包含摘要</Label>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Switch
                  checked={formData.scheduleEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, scheduleEnabled: checked })}
                />
                <h4 className="font-medium">启用定时发送</h4>
              </div>
              {formData.scheduleEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>发送频率</Label>
                    <Select
                      value={formData.scheduleFrequency}
                      onValueChange={(v) => setFormData({ ...formData, scheduleFrequency: v as 'daily' | 'weekly' | 'monthly' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">每天</SelectItem>
                        <SelectItem value="weekly">每周</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>收件人邮箱</Label>
                    <Input
                      value={formData.scheduleRecipients}
                      onChange={(e) => setFormData({ ...formData, scheduleRecipients: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.name || formData.metrics.length === 0 || updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除模板 "{selectedTemplate?.name}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
