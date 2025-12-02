import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Search,
  Star,
  FileBarChart,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  useReportTemplates,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useDeleteReportTemplate,
  useDuplicateReportTemplate,
  useToggleReportTemplateFavorite,
  useGenerateReport,
  type ReportTemplate,
  type CreateReportTemplateDto,
} from '@/hooks/useReportTemplates';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'traffic', label: '流量分析', icon: TrendingUp },
  { value: 'conversion', label: '转化分析', icon: BarChart3 },
  { value: 'engagement', label: '参与度', icon: PieChart },
  { value: 'comparison', label: '对比分析', icon: BarChart3 },
  { value: 'custom', label: '自定义', icon: FileBarChart },
];

const DATE_RANGES = [
  { value: 'last_7_days', label: '最近 7 天' },
  { value: 'last_30_days', label: '最近 30 天' },
  { value: 'last_90_days', label: '最近 90 天' },
  { value: 'last_12_months', label: '最近 12 个月' },
  { value: 'custom', label: '自定义范围' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'json', label: 'JSON' },
];

const METRICS = [
  { value: 'clicks', label: '点击数' },
  { value: 'unique_visitors', label: '独立访客' },
  { value: 'conversions', label: '转化数' },
  { value: 'conversion_rate', label: '转化率' },
  { value: 'bounce_rate', label: '跳出率' },
  { value: 'avg_time', label: '平均访问时长' },
  { value: 'referrers', label: '来源分布' },
  { value: 'devices', label: '设备分布' },
  { value: 'countries', label: '地区分布' },
  { value: 'browsers', label: '浏览器分布' },
];

const DIMENSIONS = [
  { value: 'date', label: '日期' },
  { value: 'hour', label: '小时' },
  { value: 'country', label: '国家' },
  { value: 'city', label: '城市' },
  { value: 'device', label: '设备' },
  { value: 'browser', label: '浏览器' },
  { value: 'os', label: '操作系统' },
  { value: 'referrer', label: '来源' },
  { value: 'utm_source', label: 'UTM 来源' },
  { value: 'utm_medium', label: 'UTM 媒介' },
  { value: 'utm_campaign', label: 'UTM 活动' },
];

export default function ReportTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { data: templates, isLoading } = useReportTemplates({
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const createTemplate = useCreateReportTemplate();
  const updateTemplate = useUpdateReportTemplate();
  const deleteTemplate = useDeleteReportTemplate();
  const duplicateTemplate = useDuplicateReportTemplate();
  const toggleFavorite = useToggleReportTemplateFavorite();
  const generateReport = useGenerateReport();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ReportTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateReportTemplateDto>({
    name: '',
    description: '',
    category: 'custom',
    metrics: ['clicks', 'unique_visitors'],
    dimensions: ['date'],
    dateRange: {
      type: 'last_30_days',
    },
    format: 'pdf',
    includeCharts: true,
    includeSummary: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      metrics: ['clicks', 'unique_visitors'],
      dimensions: ['date'],
      dateRange: {
        type: 'last_30_days',
      },
      format: 'pdf',
      includeCharts: true,
      includeSummary: true,
    });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({ title: '请填写模板名称', variant: 'destructive' });
      return;
    }

    try {
      await createTemplate.mutateAsync(formData);
      toast({ title: '模板已创建' });
      setCreateDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editTemplate) return;

    try {
      await updateTemplate.mutateAsync({ id: editTemplate.id, data: formData });
      toast({ title: '模板已更新' });
      setEditTemplate(null);
      resetForm();
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplateId) return;

    try {
      await deleteTemplate.mutateAsync(deletingTemplateId);
      setDeletingTemplateId(null);
      toast({ title: '模板已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateTemplate.mutateAsync(id);
      toast({ title: '模板已复制' });
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite.mutateAsync(id);
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleGenerateReport = async (id: string) => {
    try {
      await generateReport.mutateAsync(id);
      toast({ title: '报告生成中，完成后将发送通知' });
    } catch {
      toast({ title: '生成失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (template: ReportTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      metrics: template.metrics,
      dimensions: template.dimensions,
      filters: template.filters,
      dateRange: template.dateRange,
      groupBy: template.groupBy,
      sortBy: template.sortBy,
      sortOrder: template.sortOrder,
      limitResults: template.limitResults,
      format: template.format,
      includeCharts: template.includeCharts,
      includeSummary: template.includeSummary,
      customBranding: template.customBranding,
      schedule: template.schedule,
    });
    setEditTemplate(template);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    const Icon = cat?.icon || FileBarChart;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">报告模板</h1>
            <p className="text-muted-foreground">
              保存分析报告的指标、格式和时间范围配置
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                创建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建报告模板</DialogTitle>
                <DialogDescription>
                  保存报告配置供定期生成使用
                </DialogDescription>
              </DialogHeader>
              <TemplateForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreate}
                isSubmitting={createTemplate.isPending}
                submitLabel="创建模板"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板..."
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="所有分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">所有分类</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Grid */}
        {templates && templates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base line-clamp-1">
                          {template.name}
                        </CardTitle>
                        <button
                          onClick={() => handleToggleFavorite(template.id)}
                          className="text-muted-foreground hover:text-yellow-500"
                        >
                          <Star
                            className={`h-4 w-4 ${template.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`}
                          />
                        </button>
                      </div>
                      {template.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleGenerateReport(template.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          生成报告
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingTemplateId(template.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getCategoryIcon(template.category)}
                      {CATEGORIES.find((c) => c.value === template.category)?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {FORMATS.find((f) => f.value === template.format)?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="mr-1 h-3 w-3" />
                      {DATE_RANGES.find((d) => d.value === template.dateRange.type)?.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {template.metrics.length} 个指标 · {template.dimensions?.length || 0} 个维度
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>使用 {template.usageCount} 次</span>
                    <span>
                      {formatDistanceToNow(new Date(template.updatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGenerateReport(template.id)}
                    disabled={generateReport.isPending}
                  >
                    {generateReport.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    生成报告
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery ? '未找到匹配的模板' : '还没有报告模板'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? '尝试使用其他关键词搜索' : '创建您的第一个模板'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建模板
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editTemplate}
          onOpenChange={() => {
            setEditTemplate(null);
            resetForm();
          }}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑模板</DialogTitle>
            </DialogHeader>
            <TemplateForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleUpdate}
              isSubmitting={updateTemplate.isPending}
              submitLabel="保存"
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          open={!!deletingTemplateId}
          onOpenChange={(open) => !open && setDeletingTemplateId(null)}
          title="删除模板"
          description="确定要删除此模板吗？删除后无法恢复。"
          confirmText="删除"
          onConfirm={handleDelete}
          isLoading={deleteTemplate.isPending}
          variant="destructive"
        />
      </div>
    </Layout>
  );
}

// Template Form Component
function TemplateForm({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  formData: CreateReportTemplateDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateReportTemplateDto>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const toggleMetric = (metric: string) => {
    setFormData((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter((m) => m !== metric)
        : [...prev.metrics, metric],
    }));
  };

  const toggleDimension = (dimension: string) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: prev.dimensions?.includes(dimension)
        ? prev.dimensions.filter((d) => d !== dimension)
        : [...(prev.dimensions || []), dimension],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>模板名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例如: 周度流量报告"
          />
        </div>
        <div className="space-y-2">
          <Label>分类</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="模板用途说明..."
          rows={2}
        />
      </div>

      {/* Metrics */}
      <div className="space-y-3 p-4 rounded-lg border">
        <h4 className="font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          指标选择
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {METRICS.map((metric) => (
            <div key={metric.value} className="flex items-center space-x-2">
              <Checkbox
                id={`metric-${metric.value}`}
                checked={formData.metrics.includes(metric.value)}
                onCheckedChange={() => toggleMetric(metric.value)}
              />
              <label
                htmlFor={`metric-${metric.value}`}
                className="text-sm cursor-pointer"
              >
                {metric.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-3 p-4 rounded-lg border">
        <h4 className="font-medium flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          维度选择
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {DIMENSIONS.map((dim) => (
            <div key={dim.value} className="flex items-center space-x-2">
              <Checkbox
                id={`dim-${dim.value}`}
                checked={formData.dimensions?.includes(dim.value)}
                onCheckedChange={() => toggleDimension(dim.value)}
              />
              <label
                htmlFor={`dim-${dim.value}`}
                className="text-sm cursor-pointer"
              >
                {dim.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range & Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>时间范围</Label>
          <Select
            value={formData.dateRange.type}
            onValueChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                dateRange: { ...prev.dateRange, type: v as any },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>导出格式</Label>
          <Select
            value={formData.format}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, format: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((fmt) => (
                <SelectItem key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3 p-4 rounded-lg border">
        <h4 className="font-medium">报告选项</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCharts"
              checked={formData.includeCharts}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, includeCharts: !!checked }))
              }
            />
            <label htmlFor="includeCharts" className="text-sm cursor-pointer">
              包含图表
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeSummary"
              checked={formData.includeSummary}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, includeSummary: !!checked }))
              }
            />
            <label htmlFor="includeSummary" className="text-sm cursor-pointer">
              包含摘要
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="compareWithPrevious"
              checked={formData.dateRange.compareWithPrevious}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, compareWithPrevious: !!checked },
                }))
              }
            />
            <label htmlFor="compareWithPrevious" className="text-sm cursor-pointer">
              与上一时段对比
            </label>
          </div>
        </div>
      </div>

      {/* Limit Results */}
      <div className="space-y-2">
        <Label>结果数量限制</Label>
        <Input
          type="number"
          value={formData.limitResults || ''}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              limitResults: e.target.value ? parseInt(e.target.value) : undefined,
            }))
          }
          placeholder="不限制"
          min={1}
        />
      </div>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
