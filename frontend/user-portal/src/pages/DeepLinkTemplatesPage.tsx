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
  Smartphone,
  Apple,
} from 'lucide-react';
import {
  useDeepLinkTemplates,
  useCreateDeepLinkTemplate,
  useUpdateDeepLinkTemplate,
  useDeleteDeepLinkTemplate,
  useDuplicateDeepLinkTemplate,
  useToggleDeepLinkTemplateFavorite,
  type DeepLinkTemplate,
  type CreateDeepLinkTemplateDto,
} from '@/hooks/useDeepLinkTemplates';
import {
  usePresetDeepLinkTemplates,
  type PresetDeepLinkTemplate,
} from '@/hooks/usePresetTemplates';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PresetTemplatesSection, PresetTemplateCard } from '@/components/shared';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'social', label: '社交' },
  { value: 'commerce', label: '电商' },
  { value: 'media', label: '媒体' },
  { value: 'utility', label: '工具' },
  { value: 'custom', label: '自定义' },
];

export default function DeepLinkTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // 预设模板状态
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('');

  const { data: templates, isLoading } = useDeepLinkTemplates({
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });

  // 预设模板查询
  const { data: presetTemplatesData, isLoading: presetLoading } = usePresetDeepLinkTemplates({
    search: presetSearch || undefined,
    category: presetCategoryFilter || undefined,
  });

  const createTemplate = useCreateDeepLinkTemplate();
  const updateTemplate = useUpdateDeepLinkTemplate();
  const deleteTemplate = useDeleteDeepLinkTemplate();
  const duplicateTemplate = useDuplicateDeepLinkTemplate();
  const toggleFavorite = useToggleDeepLinkTemplateFavorite();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<DeepLinkTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDeepLinkTemplateDto>({
    name: '',
    description: '',
    category: 'custom',
    ios: {},
    android: {},
    fallbackUrl: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      ios: {},
      android: {},
      fallbackUrl: '',
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

  const openEditDialog = (template: DeepLinkTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      ios: template.ios || {},
      android: template.android || {},
      fallbackUrl: template.fallbackUrl || '',
    });
    setEditTemplate(template);
  };

  // 使用预设模板
  const handleUsePresetTemplate = (preset: PresetDeepLinkTemplate) => {
    // Convert preset android config - appLinks may be string in preset but needs to be string[] in DTO
    const androidConfig = preset.android
      ? {
          ...preset.android,
          appLinks: preset.android.appLinks
            ? [preset.android.appLinks]
            : undefined,
        }
      : {};
    setFormData({
      name: `${preset.name} (副本)`,
      description: preset.description || '',
      category: preset.category || 'custom',
      ios: preset.ios || {},
      android: androidConfig,
      fallbackUrl: preset.fallbackUrl || '',
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
            <h1 className="text-2xl font-bold">Deep Link 模板</h1>
            <p className="text-muted-foreground">
              保存常用的应用深度链接配置
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                创建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建 Deep Link 模板</DialogTitle>
                <DialogDescription>
                  保存 iOS 和 Android 深度链接配置供复用
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
        <PresetTemplatesSection<PresetDeepLinkTemplate>
          title="平台预设 Deep Link 模板"
          description="使用平台提供的预设深度链接配置，快速创建您自己的模板"
          templates={presetTemplatesData?.data}
          isLoading={presetLoading}
          categories={CATEGORIES}
          categoryFilter={presetCategoryFilter}
          onCategoryChange={setPresetCategoryFilter}
          searchQuery={presetSearch}
          onSearchChange={setPresetSearch}
          emptyMessage="暂无预设 Deep Link 模板"
          defaultOpen={!templates || templates.length === 0}
          renderTemplate={(preset) => (
            <PresetTemplateCard
              name={preset.name}
              description={preset.description}
              category={CATEGORIES.find((c) => c.value === preset.category)?.label}
              tags={[
                ...(preset.ios?.bundleId ? ['iOS'] : []),
                ...(preset.android?.packageName ? ['Android'] : []),
              ]}
              icon={<Smartphone className="h-5 w-5" />}
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
              <SelectValue placeholder="所有分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分类</SelectItem>
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
                    <Badge variant="outline">
                      {CATEGORIES.find((c) => c.value === template.category)?.label}
                    </Badge>
                    {template.ios?.bundleId && (
                      <Badge variant="secondary" className="text-xs">
                        <Apple className="mr-1 h-3 w-3" />
                        iOS
                      </Badge>
                    )}
                    {template.android?.packageName && (
                      <Badge variant="secondary" className="text-xs">
                        <Smartphone className="mr-1 h-3 w-3" />
                        Android
                      </Badge>
                    )}
                  </div>

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
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery ? '未找到匹配的模板' : '还没有 Deep Link 模板'}
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
          <DialogContent className="max-w-2xl">
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
  formData: CreateDeepLinkTemplateDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateDeepLinkTemplateDto>>;
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
            placeholder="例如: 我的 App 深度链接"
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

      {/* iOS Config */}
      <div className="space-y-3 p-4 rounded-lg border">
        <h4 className="font-medium flex items-center gap-2">
          <Apple className="h-4 w-4" />
          iOS 配置
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bundle ID</Label>
            <Input
              value={formData.ios?.bundleId || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  ios: { ...prev.ios, bundleId: e.target.value },
                }))
              }
              placeholder="com.example.app"
            />
          </div>
          <div className="space-y-2">
            <Label>App Store ID</Label>
            <Input
              value={formData.ios?.appStoreId || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  ios: { ...prev.ios, appStoreId: e.target.value },
                }))
              }
              placeholder="123456789"
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Scheme</Label>
            <Input
              value={formData.ios?.customScheme || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  ios: { ...prev.ios, customScheme: e.target.value },
                }))
              }
              placeholder="myapp://"
            />
          </div>
          <div className="space-y-2">
            <Label>Fallback URL</Label>
            <Input
              value={formData.ios?.fallbackUrl || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  ios: { ...prev.ios, fallbackUrl: e.target.value },
                }))
              }
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Android Config */}
      <div className="space-y-3 p-4 rounded-lg border">
        <h4 className="font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Android 配置
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Package Name</Label>
            <Input
              value={formData.android?.packageName || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  android: { ...prev.android, packageName: e.target.value },
                }))
              }
              placeholder="com.example.app"
            />
          </div>
          <div className="space-y-2">
            <Label>Play Store URL</Label>
            <Input
              value={formData.android?.playStoreUrl || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  android: { ...prev.android, playStoreUrl: e.target.value },
                }))
              }
              placeholder="https://play.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Scheme</Label>
            <Input
              value={formData.android?.customScheme || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  android: { ...prev.android, customScheme: e.target.value },
                }))
              }
              placeholder="myapp://"
            />
          </div>
          <div className="space-y-2">
            <Label>Fallback URL</Label>
            <Input
              value={formData.android?.fallbackUrl || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  android: { ...prev.android, fallbackUrl: e.target.value },
                }))
              }
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>通用 Fallback URL</Label>
        <Input
          value={formData.fallbackUrl}
          onChange={(e) => setFormData((prev) => ({ ...prev, fallbackUrl: e.target.value }))}
          placeholder="https://..."
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
