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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Search,
  Star,
  Globe,
  Share2,
  Twitter,
  FileText,
} from 'lucide-react';
import {
  useSeoTemplates,
  useCreateSeoTemplate,
  useUpdateSeoTemplate,
  useDeleteSeoTemplate,
  useDuplicateSeoTemplate,
  useToggleSeoTemplateFavorite,
  type SeoTemplate,
  type CreateSeoTemplateDto,
} from '@/hooks/useSeoTemplates';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PresetTemplatesSection, PresetTemplateCard } from '@/components/shared';
import {
  usePresetSeoTemplates,
  type PresetSeoTemplate,
} from '@/hooks/usePresetTemplates';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'ecommerce', label: '电商' },
  { value: 'saas', label: 'SaaS' },
  { value: 'content', label: '内容' },
  { value: 'social', label: '社交' },
  { value: 'landing', label: '落地页' },
  { value: 'app', label: '应用' },
  { value: 'local', label: '本地商业' },
  { value: 'media', label: '媒体' },
];

const OG_TYPES = [
  { value: 'website', label: '网站' },
  { value: 'article', label: '文章' },
  { value: 'profile', label: '个人资料' },
  { value: 'product', label: '产品' },
];

const TWITTER_CARDS = [
  { value: 'summary', label: 'Summary' },
  { value: 'summary_large_image', label: 'Summary Large Image' },
  { value: 'app', label: 'App' },
  { value: 'player', label: 'Player' },
];

export default function SeoTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // 预设模板状态
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('');

  const { data: templates, isLoading } = useSeoTemplates({
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });

  // 预设模板查询
  const { data: presetTemplatesData, isLoading: presetLoading } = usePresetSeoTemplates({
    search: presetSearch || undefined,
    category: presetCategoryFilter || undefined,
  });

  const createTemplate = useCreateSeoTemplate();
  const updateTemplate = useUpdateSeoTemplate();
  const deleteTemplate = useDeleteSeoTemplate();
  const duplicateTemplate = useDuplicateSeoTemplate();
  const toggleFavorite = useToggleSeoTemplateFavorite();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SeoTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSeoTemplateDto>({
    name: '',
    description: '',
    category: 'content',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'content',
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

  const openEditDialog = (template: SeoTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      metaTitleTemplate: template.metaTitleTemplate,
      metaDescription: template.metaDescription,
      metaKeywords: template.metaKeywords,
      metaAuthor: template.metaAuthor,
      metaRobots: template.metaRobots,
      metaLanguage: template.metaLanguage,
      ogTitleTemplate: template.ogTitleTemplate,
      ogDescription: template.ogDescription,
      ogType: template.ogType,
      ogImage: template.ogImage,
      ogSiteName: template.ogSiteName,
      ogLocale: template.ogLocale,
      twitterCard: template.twitterCard,
      twitterSite: template.twitterSite,
      twitterCreator: template.twitterCreator,
      twitterTitleTemplate: template.twitterTitleTemplate,
      twitterDescription: template.twitterDescription,
      twitterImage: template.twitterImage,
      favicon: template.favicon,
      canonicalUrlPattern: template.canonicalUrlPattern,
    });
    setEditTemplate(template);
  };

  const getConfigCount = (template: SeoTemplate) => {
    let count = 0;
    if (template.metaTitleTemplate) count++;
    if (template.metaDescription) count++;
    if (template.ogTitleTemplate) count++;
    if (template.ogImage) count++;
    if (template.twitterCard) count++;
    return count;
  };

  // 使用预设模板
  const handleUsePresetTemplate = (preset: PresetSeoTemplate) => {
    setFormData({
      name: `${preset.name} (副本)`,
      description: preset.description || '',
      category: (preset.category as SeoTemplate['category']) || 'content',
      metaTitleTemplate: preset.config?.metaTitle,
      metaDescription: preset.config?.metaDescription,
      metaKeywords: preset.config?.metaKeywords,
      ogTitleTemplate: preset.config?.ogTitle,
      ogDescription: preset.config?.ogDescription,
      ogType: preset.config?.ogType as 'website' | 'article' | 'profile' | 'product' | undefined,
      ogImage: preset.config?.ogImage,
      twitterCard: preset.config?.twitterCard,
      twitterTitleTemplate: preset.config?.twitterTitle,
      twitterDescription: preset.config?.twitterDescription,
      twitterImage: preset.config?.twitterImage,
      favicon: preset.config?.favicon,
      canonicalUrlPattern: preset.config?.canonicalUrl,
      metaRobots: preset.config?.robots,
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
            <h1 className="text-2xl font-bold">SEO 模板</h1>
            <p className="text-muted-foreground">
              保存 Meta 标签、Open Graph、Twitter Card 等 SEO 配置
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
                <DialogTitle>创建 SEO 模板</DialogTitle>
                <DialogDescription>
                  保存 SEO 配置供页面复用
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
        <PresetTemplatesSection<PresetSeoTemplate>
          title="平台预设 SEO 模板"
          description="使用平台提供的预设 SEO 配置，快速创建您自己的模板"
          templates={presetTemplatesData?.data}
          isLoading={presetLoading}
          categories={CATEGORIES}
          categoryFilter={presetCategoryFilter}
          onCategoryChange={setPresetCategoryFilter}
          searchQuery={presetSearch}
          onSearchChange={setPresetSearch}
          emptyMessage="暂无预设 SEO 模板"
          defaultOpen={!templates || templates.length === 0}
          renderTemplate={(preset) => (
            <PresetTemplateCard
              name={preset.name}
              description={preset.description}
              category={CATEGORIES.find((c) => c.value === preset.category)?.label}
              tags={[
                ...(preset.config?.ogTitle ? ['OG'] : []),
                ...(preset.config?.twitterCard ? ['Twitter'] : []),
              ]}
              icon={<Globe className="h-5 w-5" />}
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
                    {template.ogType && (
                      <Badge variant="secondary" className="text-xs">
                        <Share2 className="mr-1 h-3 w-3" />
                        OG
                      </Badge>
                    )}
                    {template.twitterCard && (
                      <Badge variant="secondary" className="text-xs">
                        <Twitter className="mr-1 h-3 w-3" />
                        Twitter
                      </Badge>
                    )}
                  </div>

                  {template.metaTitleTemplate && (
                    <p className="text-xs text-muted-foreground truncate">
                      标题: {template.metaTitleTemplate}
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
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery ? '未找到匹配的模板' : '还没有 SEO 模板'}
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
  formData: CreateSeoTemplateDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateSeoTemplateDto>>;
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
            placeholder="例如: 产品页 SEO"
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

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="meta">
            <FileText className="mr-2 h-4 w-4" />
            Meta 标签
          </TabsTrigger>
          <TabsTrigger value="og">
            <Share2 className="mr-2 h-4 w-4" />
            Open Graph
          </TabsTrigger>
          <TabsTrigger value="twitter">
            <Twitter className="mr-2 h-4 w-4" />
            Twitter Card
          </TabsTrigger>
        </TabsList>

        {/* Meta Tags */}
        <TabsContent value="meta" className="space-y-4 p-4 border rounded-lg mt-4">
          <div className="space-y-2">
            <Label>标题模板</Label>
            <Input
              value={formData.metaTitleTemplate || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, metaTitleTemplate: e.target.value }))}
              placeholder="{{title}} | 我的网站"
            />
            <p className="text-xs text-muted-foreground">支持变量: {'{{title}}'}, {'{{siteName}}'}</p>
          </div>

          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={formData.metaDescription || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
              placeholder="页面描述..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>关键词</Label>
              <Input
                value={formData.metaKeywords?.join(', ') || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    metaKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="关键词1, 关键词2"
              />
            </div>
            <div className="space-y-2">
              <Label>作者</Label>
              <Input
                value={formData.metaAuthor || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, metaAuthor: e.target.value }))}
                placeholder="作者名称"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Robots</Label>
              <Input
                value={formData.metaRobots || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, metaRobots: e.target.value }))}
                placeholder="index, follow"
              />
            </div>
            <div className="space-y-2">
              <Label>语言</Label>
              <Input
                value={formData.metaLanguage || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, metaLanguage: e.target.value }))}
                placeholder="zh-CN"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Favicon</Label>
              <Input
                value={formData.favicon || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, favicon: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Canonical URL 模式</Label>
              <Input
                value={formData.canonicalUrlPattern || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, canonicalUrlPattern: e.target.value }))}
                placeholder="https://example.com/{{path}}"
              />
            </div>
          </div>
        </TabsContent>

        {/* Open Graph */}
        <TabsContent value="og" className="space-y-4 p-4 border rounded-lg mt-4">
          <div className="space-y-2">
            <Label>OG 标题模板</Label>
            <Input
              value={formData.ogTitleTemplate || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, ogTitleTemplate: e.target.value }))}
              placeholder="{{title}}"
            />
          </div>

          <div className="space-y-2">
            <Label>OG 描述</Label>
            <Textarea
              value={formData.ogDescription || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, ogDescription: e.target.value }))}
              placeholder="Open Graph 描述..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OG 类型</Label>
              <Select
                value={formData.ogType || ''}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, ogType: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {OG_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>站点名称</Label>
              <Input
                value={formData.ogSiteName || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ogSiteName: e.target.value }))}
                placeholder="我的网站"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OG 图片</Label>
              <Input
                value={formData.ogImage || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ogImage: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <Input
                value={formData.ogLocale || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ogLocale: e.target.value }))}
                placeholder="zh_CN"
              />
            </div>
          </div>
        </TabsContent>

        {/* Twitter Card */}
        <TabsContent value="twitter" className="space-y-4 p-4 border rounded-lg mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Card 类型</Label>
              <Select
                value={formData.twitterCard || ''}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, twitterCard: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {TWITTER_CARDS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>站点账号</Label>
              <Input
                value={formData.twitterSite || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, twitterSite: e.target.value }))}
                placeholder="@username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Twitter 标题模板</Label>
            <Input
              value={formData.twitterTitleTemplate || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, twitterTitleTemplate: e.target.value }))}
              placeholder="{{title}}"
            />
          </div>

          <div className="space-y-2">
            <Label>Twitter 描述</Label>
            <Textarea
              value={formData.twitterDescription || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, twitterDescription: e.target.value }))}
              placeholder="Twitter 描述..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Twitter 图片</Label>
              <Input
                value={formData.twitterImage || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, twitterImage: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>创作者账号</Label>
              <Input
                value={formData.twitterCreator || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, twitterCreator: e.target.value }))}
                placeholder="@creator"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
