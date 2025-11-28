import { useState } from 'react';
import {
  Plus,
  Search,
  Star,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Link2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { EmptyState, NoSearchResultsEmptyState } from '@/components/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useLinkTemplates,
  useMostUsedTemplates,
  useRecentlyUsedTemplates,
  useCreateLinkTemplate,
  useUpdateLinkTemplate,
  useDeleteLinkTemplate,
  useToggleTemplateFavorite,
  useCreateLinkFromTemplate,
  LinkTemplate,
  CreateLinkTemplateData,
} from '@/hooks/useLinkTemplates';
import { cn } from '@/lib/utils';

export default function TemplatesPage() {
  const { toast } = useToast();

  // State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LinkTemplate | null>(null);
  const [createFromTemplateData, setCreateFromTemplateData] = useState<{
    template: LinkTemplate;
    url: string;
    customSlug: string;
    title: string;
  } | null>(null);

  // Queries
  const { data: templatesData, isLoading } = useLinkTemplates({
    page,
    limit: 12,
    search: search || undefined,
    favoritesOnly: showFavorites || undefined,
  });
  const { data: mostUsed } = useMostUsedTemplates(5);
  const { data: recentlyUsed } = useRecentlyUsedTemplates(5);

  // Mutations
  const createTemplate = useCreateLinkTemplate();
  const updateTemplate = useUpdateLinkTemplate();
  const deleteTemplate = useDeleteLinkTemplate();
  const toggleFavorite = useToggleTemplateFavorite();
  const createLinkFromTemplate = useCreateLinkFromTemplate();

  const templates = templatesData?.items || [];
  const totalPages = templatesData ? Math.ceil(templatesData.total / 12) : 1;

  // Form state
  const [formData, setFormData] = useState<CreateLinkTemplateData>({
    name: '',
    description: '',
    slugPrefix: '',
    slugSuffix: '',
    defaultRedirectType: 'temporary',
    utmParams: {},
    passwordEnabled: false,
    tags: [],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      slugPrefix: '',
      slugSuffix: '',
      defaultRedirectType: 'temporary',
      utmParams: {},
      passwordEnabled: false,
      tags: [],
    });
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim()) return;

    try {
      await createTemplate.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: '模板创建成功' });
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formData.name.trim()) return;

    try {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        data: formData,
      });
      setEditingTemplate(null);
      resetForm();
      toast({ title: '模板更新成功' });
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (template: LinkTemplate) => {
    if (!confirm(`确定要删除模板 "${template.name}" 吗？`)) return;

    try {
      await deleteTemplate.mutateAsync(template.id);
      toast({ title: '模板已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (template: LinkTemplate) => {
    try {
      await toggleFavorite.mutateAsync(template.id);
      toast({
        title: template.isFavorite ? '已取消收藏' : '已添加到收藏',
      });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (template: LinkTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      slugPrefix: template.slugPrefix || '',
      slugSuffix: template.slugSuffix || '',
      defaultRedirectType: template.defaultRedirectType,
      utmParams: template.utmParams || {},
      passwordEnabled: template.passwordEnabled,
      expirationDays: template.expirationDays,
      tags: template.tags,
    });
    setEditingTemplate(template);
  };

  const handleCreateLink = async () => {
    if (!createFromTemplateData || !createFromTemplateData.url) return;

    try {
      await createLinkFromTemplate.mutateAsync({
        templateId: createFromTemplateData.template.id,
        originalUrl: createFromTemplateData.url,
        customSlug: createFromTemplateData.customSlug || undefined,
        title: createFromTemplateData.title || undefined,
      });
      setCreateFromTemplateData(null);
      toast({ title: '链接创建成功' });
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const TemplateCard = ({ template }: { template: LinkTemplate }) => (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {template.name}
              {template.isFavorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </CardTitle>
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
              <DropdownMenuItem onClick={() => handleToggleFavorite(template)}>
                <Star className={cn('mr-2 h-4 w-4', template.isFavorite && 'fill-current')} />
                {template.isFavorite ? '取消收藏' : '添加收藏'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setCreateFromTemplateData({
                    template,
                    url: '',
                    customSlug: '',
                    title: '',
                  })
                }
              >
                <Link2 className="mr-2 h-4 w-4" />
                使用此模板
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteTemplate(template)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Template config preview */}
          <div className="flex flex-wrap gap-2">
            {template.slugPrefix && (
              <Badge variant="secondary" className="text-xs">
                前缀: {template.slugPrefix}
              </Badge>
            )}
            {template.slugSuffix && (
              <Badge variant="secondary" className="text-xs">
                后缀: {template.slugSuffix}
              </Badge>
            )}
            {template.passwordEnabled && (
              <Badge variant="secondary" className="text-xs">
                🔒 密码保护
              </Badge>
            )}
            {template.expirationDays && (
              <Badge variant="secondary" className="text-xs">
                ⏱️ {template.expirationDays}天过期
              </Badge>
            )}
          </div>

          {/* UTM params preview */}
          {template.utmParams && Object.keys(template.utmParams).length > 0 && (
            <div className="text-xs text-muted-foreground">
              UTM: {Object.entries(template.utmParams)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}
            </div>
          )}

          {/* Tags */}
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>使用 {template.usageCount} 次</span>
            <span>
              {template.lastUsedAt
                ? `上次使用: ${format(new Date(template.lastUsedAt), 'MM/dd', { locale: zhCN })}`
                : '从未使用'}
            </span>
          </div>
        </div>

        {/* Quick use button */}
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() =>
            setCreateFromTemplateData({
              template,
              url: '',
              customSlug: '',
              title: '',
            })
          }
        >
          <Link2 className="mr-2 h-4 w-4" />
          使用此模板
        </Button>
      </CardContent>
    </Card>
  );

  const QuickTemplateCard = ({ template, type }: { template: LinkTemplate; type: 'recent' | 'popular' }) => (
    <button
      onClick={() =>
        setCreateFromTemplateData({
          template,
          url: '',
          customSlug: '',
          title: '',
        })
      }
      className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        {type === 'recent' ? (
          <Clock className="h-5 w-5 text-primary" />
        ) : (
          <TrendingUp className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium text-sm">{template.name}</p>
        <p className="text-xs text-muted-foreground">
          使用 {template.usageCount} 次
        </p>
      </div>
    </button>
  );

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">链接模板</h1>
            <p className="text-muted-foreground">创建可复用的链接配置模板</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>

        {/* Quick access cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recently used */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                最近使用
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentlyUsed && recentlyUsed.length > 0 ? (
                <div className="space-y-2">
                  {recentlyUsed.slice(0, 3).map((template) => (
                    <QuickTemplateCard key={template.id} template={template} type="recent" />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  暂无使用记录
                </p>
              )}
            </CardContent>
          </Card>

          {/* Most used */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                常用模板
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mostUsed && mostUsed.length > 0 ? (
                <div className="space-y-2">
                  {mostUsed.slice(0, 3).map((template) => (
                    <QuickTemplateCard key={template.id} template={template} type="popular" />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  暂无模板
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="搜索模板..."
              className="pl-9"
            />
          </div>
          <Button
            variant={showFavorites ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowFavorites(!showFavorites);
              setPage(1);
            }}
          >
            <Star className={cn('mr-2 h-4 w-4', showFavorites && 'fill-current')} />
            收藏
          </Button>
        </div>

        {/* Templates grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>

            {/* Pagination */}
            {templatesData && templatesData.total > 12 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  共 {templatesData.total} 个模板
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    下一页
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-4">
              {search ? (
                <NoSearchResultsEmptyState
                  searchTerm={search}
                  onClear={() => setSearch('')}
                />
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="创建你的第一个模板"
                  description="模板可以帮助你快速创建具有相同配置的链接"
                  action={{
                    label: '新建模板',
                    onClick: () => setIsCreateDialogOpen(true),
                    icon: Plus,
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog
          open={isCreateDialogOpen || !!editingTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingTemplate(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? '编辑模板' : '新建模板'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? '修改模板配置'
                  : '创建可复用的链接配置模板'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">模板名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 营销活动链接"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="模板用途说明..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Slug prefix/suffix */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="slugPrefix">短码前缀</Label>
                  <Input
                    id="slugPrefix"
                    value={formData.slugPrefix}
                    onChange={(e) => setFormData({ ...formData, slugPrefix: e.target.value })}
                    placeholder="例如: promo-"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="slugSuffix">短码后缀</Label>
                  <Input
                    id="slugSuffix"
                    value={formData.slugSuffix}
                    onChange={(e) => setFormData({ ...formData, slugSuffix: e.target.value })}
                    placeholder="例如: -2024"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Redirect type */}
              <div>
                <Label>重定向类型</Label>
                <Select
                  value={formData.defaultRedirectType}
                  onValueChange={(value: 'temporary' | 'permanent') =>
                    setFormData({ ...formData, defaultRedirectType: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temporary">临时重定向 (302)</SelectItem>
                    <SelectItem value="permanent">永久重定向 (301)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* UTM params */}
              <div className="space-y-3 rounded-lg border p-4">
                <Label>UTM 参数</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="utm_source" className="text-xs text-muted-foreground">
                      utm_source
                    </Label>
                    <Input
                      id="utm_source"
                      value={formData.utmParams?.source || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          utmParams: { ...formData.utmParams, source: e.target.value },
                        })
                      }
                      placeholder="例如: newsletter"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="utm_medium" className="text-xs text-muted-foreground">
                      utm_medium
                    </Label>
                    <Input
                      id="utm_medium"
                      value={formData.utmParams?.medium || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          utmParams: { ...formData.utmParams, medium: e.target.value },
                        })
                      }
                      placeholder="例如: email"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="utm_campaign" className="text-xs text-muted-foreground">
                      utm_campaign
                    </Label>
                    <Input
                      id="utm_campaign"
                      value={formData.utmParams?.campaign || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          utmParams: { ...formData.utmParams, campaign: e.target.value },
                        })
                      }
                      placeholder="例如: spring_sale"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="utm_content" className="text-xs text-muted-foreground">
                      utm_content
                    </Label>
                    <Input
                      id="utm_content"
                      value={formData.utmParams?.content || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          utmParams: { ...formData.utmParams, content: e.target.value },
                        })
                      }
                      placeholder="例如: header_link"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 rounded-lg border p-4">
                <Label>选项</Label>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">密码保护</p>
                    <p className="text-xs text-muted-foreground">需要密码才能访问链接</p>
                  </div>
                  <Switch
                    checked={formData.passwordEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, passwordEnabled: checked })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="expirationDays" className="text-sm">
                    过期天数
                  </Label>
                  <Input
                    id="expirationDays"
                    type="number"
                    min="1"
                    value={formData.expirationDays || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expirationDays: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="留空表示永不过期"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                disabled={
                  !formData.name.trim() ||
                  createTemplate.isPending ||
                  updateTemplate.isPending
                }
              >
                {createTemplate.isPending || updateTemplate.isPending
                  ? '保存中...'
                  : editingTemplate
                  ? '保存'
                  : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Link from Template Dialog */}
        <Dialog
          open={!!createFromTemplateData}
          onOpenChange={(open) => !open && setCreateFromTemplateData(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>使用模板创建链接</DialogTitle>
              <DialogDescription>
                使用模板 "{createFromTemplateData?.template.name}" 创建新链接
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="originalUrl">目标链接 *</Label>
                <Input
                  id="originalUrl"
                  value={createFromTemplateData?.url || ''}
                  onChange={(e) =>
                    setCreateFromTemplateData(
                      createFromTemplateData
                        ? { ...createFromTemplateData, url: e.target.value }
                        : null
                    )
                  }
                  placeholder="https://example.com/page"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customSlug">自定义短码（可选）</Label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {createFromTemplateData?.template.slugPrefix || ''}lnk.day/
                  </span>
                  <Input
                    id="customSlug"
                    value={createFromTemplateData?.customSlug || ''}
                    onChange={(e) =>
                      setCreateFromTemplateData(
                        createFromTemplateData
                          ? { ...createFromTemplateData, customSlug: e.target.value }
                          : null
                      )
                    }
                    placeholder="自动生成"
                    className="rounded-l-none rounded-r-none"
                  />
                  {createFromTemplateData?.template.slugSuffix && (
                    <span className="rounded-r border border-l-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {createFromTemplateData.template.slugSuffix}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="title">标题（可选）</Label>
                <Input
                  id="title"
                  value={createFromTemplateData?.title || ''}
                  onChange={(e) =>
                    setCreateFromTemplateData(
                      createFromTemplateData
                        ? { ...createFromTemplateData, title: e.target.value }
                        : null
                    )
                  }
                  placeholder="链接标题"
                  className="mt-1"
                />
              </div>

              {/* Template config preview */}
              {createFromTemplateData?.template && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    模板配置预览
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {createFromTemplateData.template.passwordEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        🔒 密码保护
                      </Badge>
                    )}
                    {createFromTemplateData.template.expirationDays && (
                      <Badge variant="secondary" className="text-xs">
                        ⏱️ {createFromTemplateData.template.expirationDays}天过期
                      </Badge>
                    )}
                    {createFromTemplateData.template.utmParams?.source && (
                      <Badge variant="secondary" className="text-xs">
                        UTM: {createFromTemplateData.template.utmParams.source}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateFromTemplateData(null)}>
                取消
              </Button>
              <Button
                onClick={handleCreateLink}
                disabled={!createFromTemplateData?.url || createLinkFromTemplate.isPending}
              >
                {createLinkFromTemplate.isPending ? '创建中...' : '创建链接'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
