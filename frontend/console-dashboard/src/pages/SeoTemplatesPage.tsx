import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FileSearch,
  RefreshCw,
  Globe,
  Twitter,
  Image,
  FileText,
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
import { templatesService } from '@/lib/api';

type SeoCategory = 'ecommerce' | 'saas' | 'content' | 'social' | 'landing' | 'app' | 'local' | 'media';

interface SeoTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: SeoCategory;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  favicon?: string;
  canonicalUrl?: string;
  robots?: string;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<SeoCategory, { label: string; color: string }> = {
  ecommerce: { label: '电商', color: 'bg-orange-100 text-orange-700' },
  saas: { label: 'SaaS', color: 'bg-blue-100 text-blue-700' },
  content: { label: '内容', color: 'bg-purple-100 text-purple-700' },
  social: { label: '社交', color: 'bg-pink-100 text-pink-700' },
  landing: { label: '落地页', color: 'bg-green-100 text-green-700' },
  app: { label: '应用', color: 'bg-cyan-100 text-cyan-700' },
  local: { label: '本地商业', color: 'bg-amber-100 text-amber-700' },
  media: { label: '媒体', color: 'bg-slate-100 text-slate-700' },
};

const DEFAULT_CATEGORY_CONFIG = { label: '未知', color: 'bg-gray-100 text-gray-700' };

const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG[category as SeoCategory] || DEFAULT_CATEGORY_CONFIG;
};

const TWITTER_CARD_OPTIONS = [
  { value: 'summary', label: 'Summary (小图)' },
  { value: 'summary_large_image', label: 'Summary Large Image (大图)' },
];

const OG_TYPE_OPTIONS = [
  { value: 'website', label: '网站' },
  { value: 'article', label: '文章' },
  { value: 'product', label: '产品' },
  { value: 'profile', label: '个人资料' },
];

export default function SeoTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SeoTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'content' as SeoCategory,
    // Open Graph
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website',
    // Twitter Card
    twitterCard: 'summary_large_image' as 'summary' | 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    // Meta
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    favicon: '',
    canonicalUrl: '',
    robots: 'index, follow',
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['seo-templates', page, search, category, status],
    queryFn: () =>
      templatesService.getSeoTemplates({
        page,
        limit: 20,
        search: search || undefined,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
      }),
  });

  const templates: SeoTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createSeoTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-templates'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateSeoTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteSeoTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleSeoTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'content',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      ogType: 'website',
      twitterCard: 'summary_large_image',
      twitterTitle: '',
      twitterDescription: '',
      twitterImage: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      favicon: '',
      canonicalUrl: '',
      robots: 'index, follow',
      isActive: true,
    });
  };

  const openEditDialog = (template: SeoTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      ogTitle: template.ogTitle || '',
      ogDescription: template.ogDescription || '',
      ogImage: template.ogImage || '',
      ogType: template.ogType || 'website',
      twitterCard: template.twitterCard || 'summary_large_image',
      twitterTitle: template.twitterTitle || '',
      twitterDescription: template.twitterDescription || '',
      twitterImage: template.twitterImage || '',
      metaTitle: template.metaTitle || '',
      metaDescription: template.metaDescription || '',
      metaKeywords: template.metaKeywords?.join(', ') || '',
      favicon: template.favicon || '',
      canonicalUrl: template.canonicalUrl || '',
      robots: template.robots || 'index, follow',
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const preparePayload = () => {
    return {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      ogTitle: formData.ogTitle || undefined,
      ogDescription: formData.ogDescription || undefined,
      ogImage: formData.ogImage || undefined,
      ogType: formData.ogType || undefined,
      twitterCard: formData.twitterCard,
      twitterTitle: formData.twitterTitle || undefined,
      twitterDescription: formData.twitterDescription || undefined,
      twitterImage: formData.twitterImage || undefined,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
      metaKeywords: formData.metaKeywords ? formData.metaKeywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
      favicon: formData.favicon || undefined,
      canonicalUrl: formData.canonicalUrl || undefined,
      robots: formData.robots || undefined,
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

  const getConfigSummary = (template: SeoTemplate) => {
    const parts = [];
    if (template.ogTitle) parts.push('OG');
    if (template.twitterCard) parts.push('Twitter');
    if (template.metaTitle || template.metaDescription) parts.push('Meta');
    return parts.join(' + ') || '未配置';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO 模板</h1>
          <p className="text-gray-600 mt-1">管理 Open Graph、Twitter Card、Meta 标签等 SEO 预设模板</p>
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
                      <FileSearch className="w-5 h-5" />
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
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {getConfigSummary(template)}
                        </span>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建 SEO 模板</DialogTitle>
            <DialogDescription>创建搜索引擎优化预设模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 博客文章 SEO"
                />
              </div>
              <div>
                <Label>类别</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as SeoCategory })}
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

            {/* Open Graph */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" /> Open Graph
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>OG Title</Label>
                    <Input
                      value={formData.ogTitle}
                      onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                      placeholder="分享标题"
                    />
                  </div>
                  <div>
                    <Label>OG Type</Label>
                    <Select
                      value={formData.ogType}
                      onValueChange={(v) => setFormData({ ...formData, ogType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OG_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>OG Description</Label>
                  <Textarea
                    value={formData.ogDescription}
                    onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                    placeholder="分享描述"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>OG Image URL</Label>
                  <Input
                    value={formData.ogImage}
                    onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Twitter Card */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Twitter className="w-4 h-4" /> Twitter Card
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Card Type</Label>
                    <Select
                      value={formData.twitterCard}
                      onValueChange={(v) => setFormData({ ...formData, twitterCard: v as 'summary' | 'summary_large_image' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TWITTER_CARD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Twitter Title</Label>
                    <Input
                      value={formData.twitterTitle}
                      onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                      placeholder="留空则使用 OG Title"
                    />
                  </div>
                </div>
                <div>
                  <Label>Twitter Description</Label>
                  <Input
                    value={formData.twitterDescription}
                    onChange={(e) => setFormData({ ...formData, twitterDescription: e.target.value })}
                    placeholder="留空则使用 OG Description"
                  />
                </div>
                <div>
                  <Label>Twitter Image URL</Label>
                  <Input
                    value={formData.twitterImage}
                    onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                    placeholder="留空则使用 OG Image"
                  />
                </div>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" /> Meta 标签
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>Meta Title</Label>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder="页面标题"
                  />
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    placeholder="页面描述 (建议 150-160 字符)"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Meta Keywords</Label>
                    <Input
                      value={formData.metaKeywords}
                      onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                      placeholder="关键词1, 关键词2, ..."
                    />
                  </div>
                  <div>
                    <Label>Robots</Label>
                    <Input
                      value={formData.robots}
                      onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                      placeholder="index, follow"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Favicon URL</Label>
                    <Input
                      value={formData.favicon}
                      onChange={(e) => setFormData({ ...formData, favicon: e.target.value })}
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                  <div>
                    <Label>Canonical URL</Label>
                    <Input
                      value={formData.canonicalUrl}
                      onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                      placeholder="https://example.com/page"
                    />
                  </div>
                </div>
              </div>
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
            <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 SEO 模板</DialogTitle>
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
                  onValueChange={(v) => setFormData({ ...formData, category: v as SeoCategory })}
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

            {/* Open Graph */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Open Graph</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>OG Title</Label>
                    <Input
                      value={formData.ogTitle}
                      onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>OG Type</Label>
                    <Select
                      value={formData.ogType}
                      onValueChange={(v) => setFormData({ ...formData, ogType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OG_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>OG Description</Label>
                  <Textarea
                    value={formData.ogDescription}
                    onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>OG Image URL</Label>
                  <Input
                    value={formData.ogImage}
                    onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Twitter Card */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Twitter Card</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Card Type</Label>
                    <Select
                      value={formData.twitterCard}
                      onValueChange={(v) => setFormData({ ...formData, twitterCard: v as 'summary' | 'summary_large_image' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TWITTER_CARD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Twitter Title</Label>
                    <Input
                      value={formData.twitterTitle}
                      onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Twitter Description</Label>
                  <Input
                    value={formData.twitterDescription}
                    onChange={(e) => setFormData({ ...formData, twitterDescription: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Twitter Image URL</Label>
                  <Input
                    value={formData.twitterImage}
                    onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Meta 标签</h4>
              <div className="space-y-3">
                <div>
                  <Label>Meta Title</Label>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Meta Keywords</Label>
                    <Input
                      value={formData.metaKeywords}
                      onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Robots</Label>
                    <Input
                      value={formData.robots}
                      onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Favicon URL</Label>
                    <Input
                      value={formData.favicon}
                      onChange={(e) => setFormData({ ...formData, favicon: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Canonical URL</Label>
                    <Input
                      value={formData.canonicalUrl}
                      onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.name || updateMutation.isPending}>
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
