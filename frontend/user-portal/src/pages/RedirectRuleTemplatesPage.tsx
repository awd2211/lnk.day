import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Split,
  Globe,
  Smartphone,
  Clock,
} from 'lucide-react';
import {
  useRedirectRuleTemplates,
  useCreateRedirectRuleTemplate,
  useUpdateRedirectRuleTemplate,
  useDeleteRedirectRuleTemplate,
  useDuplicateRedirectRuleTemplate,
  useToggleRedirectRuleTemplateFavorite,
  type RedirectRuleTemplate,
  type CreateRedirectRuleTemplateDto,
} from '@/hooks/useRedirectRuleTemplates';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PresetTemplatesSection, PresetTemplateCard } from '@/components/shared';
import {
  usePresetRedirectRuleTemplates,
  type PresetRedirectRuleTemplate,
} from '@/hooks/usePresetTemplates';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'ab_test', label: 'A/B 测试', icon: Split },
  { value: 'geo', label: '地理位置', icon: Globe },
  { value: 'device', label: '设备类型', icon: Smartphone },
  { value: 'time', label: '时间规则', icon: Clock },
  { value: 'custom', label: '自定义', icon: Split },
];

export default function RedirectRuleTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // 预设模板状态
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('');

  const { data: templates, isLoading } = useRedirectRuleTemplates({
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });

  // 预设模板查询
  const { data: presetTemplatesData, isLoading: presetLoading } = usePresetRedirectRuleTemplates({
    search: presetSearch || undefined,
    category: presetCategoryFilter || undefined,
  });

  const createTemplate = useCreateRedirectRuleTemplate();
  const updateTemplate = useUpdateRedirectRuleTemplate();
  const deleteTemplate = useDeleteRedirectRuleTemplate();
  const duplicateTemplate = useDuplicateRedirectRuleTemplate();
  const toggleFavorite = useToggleRedirectRuleTemplateFavorite();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RedirectRuleTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateRedirectRuleTemplateDto>({
    name: '',
    description: '',
    category: 'custom',
    defaultUrl: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      defaultUrl: '',
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

  const openEditDialog = (template: RedirectRuleTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      abTestVariants: template.abTestVariants,
      geoPresets: template.geoPresets,
      devicePresets: template.devicePresets,
      timePresets: template.timePresets,
      defaultUrl: template.defaultUrl || '',
    });
    setEditTemplate(template);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    const Icon = cat?.icon || Split;
    return <Icon className="h-4 w-4" />;
  };

  const getRuleCount = (template: RedirectRuleTemplate) => {
    let count = 0;
    if (template.abTestVariants?.length) count += template.abTestVariants.length;
    if (template.geoPresets?.length) count += template.geoPresets.length;
    if (template.devicePresets?.length) count += template.devicePresets.length;
    if (template.timePresets?.length) count += template.timePresets.length;
    return count;
  };

  const getPresetRuleCount = (preset: PresetRedirectRuleTemplate) => {
    let count = 0;
    if (preset.config?.variants?.length) count += preset.config.variants.length;
    if (preset.config?.geoRules?.length) count += preset.config.geoRules.length;
    if (preset.config?.deviceRules?.length) count += preset.config.deviceRules.length;
    if (preset.config?.timeRules?.length) count += preset.config.timeRules.length;
    return count;
  };

  // 使用预设模板
  const handleUsePresetTemplate = (preset: PresetRedirectRuleTemplate) => {
    setFormData({
      name: `${preset.name} (副本)`,
      description: preset.description || '',
      category: preset.category || 'custom',
      abTestVariants: preset.config?.variants?.map((v) => ({
        name: v.name,
        url: v.url,
        weight: v.weight,
      })),
      geoPresets: preset.config?.geoRules?.map((r) => ({
        name: '',
        countries: r.countries || [],
        regions: r.regions,
        url: r.url,
      })),
      devicePresets: preset.config?.deviceRules?.map((r) => ({
        name: '',
        devices: r.devices || [],
        os: r.os,
        browsers: r.browsers,
        url: r.url,
      })),
      timePresets: preset.config?.timeRules?.map((r) => ({
        name: '',
        startTime: r.startTime || '09:00',
        endTime: r.endTime || '18:00',
        days: r.days?.map((d) => parseInt(d)) || [1, 2, 3, 4, 5],
        timezone: r.timezone || 'Asia/Shanghai',
        url: r.url,
      })),
      defaultUrl: preset.config?.defaultUrl || '',
    });
    setCreateDialogOpen(true);
    toast({ title: '已加载预设模板配置，可自行修改后保存' });
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
            <h1 className="text-2xl font-bold">重定向规则模板</h1>
            <p className="text-muted-foreground">
              保存 A/B 测试、地理位置、设备类型等重定向规则配置
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                创建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建重定向规则模板</DialogTitle>
                <DialogDescription>
                  保存重定向规则配置供复用
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

        {/* 预设模板区域 */}
        <PresetTemplatesSection<PresetRedirectRuleTemplate>
          title="平台预设重定向规则模板"
          description="使用平台提供的预设规则配置，快速创建您自己的模板"
          templates={presetTemplatesData?.data}
          isLoading={presetLoading}
          categories={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          categoryFilter={presetCategoryFilter}
          onCategoryChange={setPresetCategoryFilter}
          searchQuery={presetSearch}
          onSearchChange={setPresetSearch}
          emptyMessage="暂无预设重定向规则模板"
          defaultOpen={!templates || templates.length === 0}
          renderTemplate={(preset) => (
            <PresetTemplateCard
              name={preset.name}
              description={preset.description}
              category={CATEGORIES.find((c) => c.value === preset.category)?.label}
              tags={[`${getPresetRuleCount(preset)} 条规则`]}
              icon={<Split className="h-5 w-5" />}
              onUse={() => handleUsePresetTemplate(preset)}
            />
          )}
        />

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
          <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="所有类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类型</SelectItem>
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
                      {getRuleCount(template)} 条规则
                    </Badge>
                  </div>

                  {template.defaultUrl && (
                    <p className="text-xs text-muted-foreground truncate">
                      默认: {template.defaultUrl}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>使用 {template.usageCount} 次</span>
                    <span>
                      {formatDistanceToNow(new Date(template.updatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Split className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery ? '未找到匹配的模板' : '还没有重定向规则模板'}
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
  formData: CreateRedirectRuleTemplateDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateRedirectRuleTemplateDto>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>模板名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例如: 中国地区重定向"
          />
        </div>
        <div className="space-y-2">
          <Label>类型</Label>
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

      <div className="space-y-2">
        <Label>默认跳转 URL</Label>
        <Input
          value={formData.defaultUrl || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, defaultUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      {/* A/B Test Config */}
      {formData.category === 'ab_test' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium flex items-center gap-2">
            <Split className="h-4 w-4" />
            A/B 测试变体
          </h4>
          <p className="text-sm text-muted-foreground">
            配置 A/B 测试的变体和权重分配
          </p>
          <ABTestVariantEditor
            variants={formData.abTestVariants || []}
            onChange={(variants) => setFormData((prev) => ({ ...prev, abTestVariants: variants }))}
          />
        </div>
      )}

      {/* Geo Config */}
      {formData.category === 'geo' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            地理位置规则
          </h4>
          <p className="text-sm text-muted-foreground">
            根据访问者地理位置重定向到不同 URL
          </p>
          <GeoPresetEditor
            presets={formData.geoPresets || []}
            onChange={(presets) => setFormData((prev) => ({ ...prev, geoPresets: presets }))}
          />
        </div>
      )}

      {/* Device Config */}
      {formData.category === 'device' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            设备类型规则
          </h4>
          <p className="text-sm text-muted-foreground">
            根据访问设备类型重定向到不同 URL
          </p>
          <DevicePresetEditor
            presets={formData.devicePresets || []}
            onChange={(presets) => setFormData((prev) => ({ ...prev, devicePresets: presets }))}
          />
        </div>
      )}

      {/* Time Config */}
      {formData.category === 'time' && (
        <div className="space-y-3 p-4 rounded-lg border">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            时间规则
          </h4>
          <p className="text-sm text-muted-foreground">
            根据时间段重定向到不同 URL
          </p>
          <TimePresetEditor
            presets={formData.timePresets || []}
            onChange={(presets) => setFormData((prev) => ({ ...prev, timePresets: presets }))}
          />
        </div>
      )}

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// A/B Test Variant Editor
function ABTestVariantEditor({
  variants,
  onChange,
}: {
  variants: Array<{ name: string; url: string; weight: number }>;
  onChange: (variants: Array<{ name: string; url: string; weight: number }>) => void;
}) {
  const addVariant = () => {
    onChange([...variants, { name: `变体 ${variants.length + 1}`, url: '', weight: 50 }]);
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const newVariants = [...variants];
    const current = newVariants[index];
    if (current) {
      newVariants[index] = { ...current, [field]: value } as typeof current;
      onChange(newVariants);
    }
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {variants.map((variant, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={variant.name}
            onChange={(e) => updateVariant(index, 'name', e.target.value)}
            placeholder="变体名称"
            className="w-32"
          />
          <Input
            value={variant.url}
            onChange={(e) => updateVariant(index, 'url', e.target.value)}
            placeholder="https://..."
            className="flex-1"
          />
          <Input
            type="number"
            value={variant.weight}
            onChange={(e) => updateVariant(index, 'weight', parseInt(e.target.value) || 0)}
            placeholder="权重"
            className="w-20"
            min={0}
            max={100}
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button variant="ghost" size="icon" onClick={() => removeVariant(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addVariant}>
        <Plus className="mr-2 h-4 w-4" />
        添加变体
      </Button>
    </div>
  );
}

// Geo Preset Editor
function GeoPresetEditor({
  presets,
  onChange,
}: {
  presets: Array<{ name: string; countries: string[]; regions?: string[]; url: string }>;
  onChange: (presets: Array<{ name: string; countries: string[]; regions?: string[]; url: string }>) => void;
}) {
  const addPreset = () => {
    onChange([...presets, { name: '', countries: [], url: '' }]);
  };

  const updatePreset = (index: number, field: string, value: any) => {
    const newPresets = [...presets];
    const current = newPresets[index];
    if (current) {
      if (field === 'countries') {
        newPresets[index] = { ...current, countries: value.split(',').map((s: string) => s.trim()).filter(Boolean) } as typeof current;
      } else {
        newPresets[index] = { ...current, [field]: value } as typeof current;
      }
      onChange(newPresets);
    }
  };

  const removePreset = (index: number) => {
    onChange(presets.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {presets.map((preset, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={preset.name}
            onChange={(e) => updatePreset(index, 'name', e.target.value)}
            placeholder="规则名称"
            className="w-32"
          />
          <Input
            value={preset.countries.join(', ')}
            onChange={(e) => updatePreset(index, 'countries', e.target.value)}
            placeholder="CN, US, JP"
            className="w-32"
          />
          <Input
            value={preset.url}
            onChange={(e) => updatePreset(index, 'url', e.target.value)}
            placeholder="https://..."
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => removePreset(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addPreset}>
        <Plus className="mr-2 h-4 w-4" />
        添加地区规则
      </Button>
    </div>
  );
}

// Device Preset Editor
function DevicePresetEditor({
  presets,
  onChange,
}: {
  presets: Array<{ name: string; devices: string[]; os?: string[]; browsers?: string[]; url: string }>;
  onChange: (presets: Array<{ name: string; devices: string[]; os?: string[]; browsers?: string[]; url: string }>) => void;
}) {
  const addPreset = () => {
    onChange([...presets, { name: '', devices: [], url: '' }]);
  };

  const updatePreset = (index: number, field: string, value: any) => {
    const newPresets = [...presets];
    const current = newPresets[index];
    if (current) {
      if (field === 'devices') {
        newPresets[index] = { ...current, devices: value.split(',').map((s: string) => s.trim()).filter(Boolean) } as typeof current;
      } else {
        newPresets[index] = { ...current, [field]: value } as typeof current;
      }
      onChange(newPresets);
    }
  };

  const removePreset = (index: number) => {
    onChange(presets.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {presets.map((preset, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={preset.name}
            onChange={(e) => updatePreset(index, 'name', e.target.value)}
            placeholder="规则名称"
            className="w-32"
          />
          <Input
            value={preset.devices.join(', ')}
            onChange={(e) => updatePreset(index, 'devices', e.target.value)}
            placeholder="mobile, tablet, desktop"
            className="w-44"
          />
          <Input
            value={preset.url}
            onChange={(e) => updatePreset(index, 'url', e.target.value)}
            placeholder="https://..."
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => removePreset(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addPreset}>
        <Plus className="mr-2 h-4 w-4" />
        添加设备规则
      </Button>
    </div>
  );
}

// Time Preset Editor
function TimePresetEditor({
  presets,
  onChange,
}: {
  presets: Array<{ name: string; startTime: string; endTime: string; days: number[]; timezone: string; url: string }>;
  onChange: (presets: Array<{ name: string; startTime: string; endTime: string; days: number[]; timezone: string; url: string }>) => void;
}) {
  const addPreset = () => {
    onChange([...presets, { name: '', startTime: '09:00', endTime: '18:00', days: [1, 2, 3, 4, 5], timezone: 'Asia/Shanghai', url: '' }]);
  };

  const updatePreset = (index: number, field: string, value: any) => {
    const newPresets = [...presets];
    const current = newPresets[index];
    if (current) {
      newPresets[index] = { ...current, [field]: value } as typeof current;
      onChange(newPresets);
    }
  };

  const removePreset = (index: number) => {
    onChange(presets.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {presets.map((preset, index) => (
        <div key={index} className="space-y-2 p-3 border rounded">
          <div className="flex items-center gap-2">
            <Input
              value={preset.name}
              onChange={(e) => updatePreset(index, 'name', e.target.value)}
              placeholder="规则名称"
              className="w-32"
            />
            <Input
              type="time"
              value={preset.startTime}
              onChange={(e) => updatePreset(index, 'startTime', e.target.value)}
              className="w-28"
            />
            <span>-</span>
            <Input
              type="time"
              value={preset.endTime}
              onChange={(e) => updatePreset(index, 'endTime', e.target.value)}
              className="w-28"
            />
            <Button variant="ghost" size="icon" onClick={() => removePreset(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={preset.url}
            onChange={(e) => updatePreset(index, 'url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addPreset}>
        <Plus className="mr-2 h-4 w-4" />
        添加时间规则
      </Button>
    </div>
  );
}
