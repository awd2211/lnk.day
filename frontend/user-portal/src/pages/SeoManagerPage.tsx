import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Globe,
  Eye,
  ChevronRight,
  ChevronLeft,
  Copy,
  Settings2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Code2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { bioLinksService, pageService, seoService } from '@/lib/api';

interface SeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  robots?: string;
  noIndex?: boolean;
  favicon?: string;
}

interface PageSeoItem {
  id: string;
  name: string;
  type: 'bio-link' | 'page';
  slug: string;
  url: string;
  seo: SeoData;
  score: number;
  issues: string[];
  lastUpdated: string;
}

// Calculate SEO score based on filled fields
const calculateSeoScore = (seo: SeoData, name: string): { score: number; issues: string[] } => {
  let score = 0;
  const issues: string[] = [];

  // Title check (25 points)
  const title = seo.title || name;
  if (title && title.length >= 30 && title.length <= 60) {
    score += 25;
  } else if (title) {
    score += 15;
    if (title.length < 30) issues.push('标题过短，建议 30-60 字符');
    if (title.length > 60) issues.push('标题过长，建议 30-60 字符');
  } else {
    issues.push('缺少标题');
  }

  // Description check (25 points)
  const description = seo.description || '';
  if (description && description.length >= 120 && description.length <= 160) {
    score += 25;
  } else if (description && description.length > 0) {
    score += 15;
    if (description.length < 120) issues.push('描述过短，建议 120-160 字符');
    if (description.length > 160) issues.push('描述过长，建议 120-160 字符');
  } else {
    issues.push('缺少描述');
  }

  // Keywords check (20 points)
  const keywords = seo.keywords || [];
  if (keywords.length >= 3 && keywords.length <= 10) {
    score += 20;
  } else if (keywords.length > 0) {
    score += 10;
    if (keywords.length < 3) issues.push('关键词过少，建议 3-10 个');
    if (keywords.length > 10) issues.push('关键词过多，建议 3-10 个');
  } else {
    issues.push('缺少关键词');
  }

  // OG Image check (15 points)
  if (seo.ogImage) {
    score += 15;
  } else {
    issues.push('缺少 OG 图片');
  }

  // Canonical URL check (10 points)
  if (seo.canonicalUrl) {
    score += 10;
  }

  // OG Title and Description (5 points)
  if (seo.ogTitle || seo.ogDescription) {
    score += 5;
  }

  return { score, issues };
};

const scoreColors = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  fair: 'bg-yellow-500',
  poor: 'bg-red-500',
};

const getScoreColor = (score: number) => {
  if (score >= 90) return scoreColors.excellent;
  if (score >= 70) return scoreColors.good;
  if (score >= 50) return scoreColors.fair;
  return scoreColors.poor;
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '一般';
  return '需改进';
};

export default function SeoManagerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bio-link' | 'page'>('all');
  const [editingPage, setEditingPage] = useState<PageSeoItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState<PageSeoItem | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    keywords: '',
    ogImage: '',
    ogTitle: '',
    ogDescription: '',
    twitterCard: 'summary_large_image' as 'summary' | 'summary_large_image',
    canonicalUrl: '',
    robots: 'index, follow',
    noIndex: false,
  });

  // Fetch bio links
  const { data: bioLinksData, isLoading: bioLinksLoading } = useQuery({
    queryKey: ['bio-links-seo'],
    queryFn: async () => {
      const response = await bioLinksService.getAll({ limit: 1000 });
      return response.data;
    },
  });

  // Fetch pages
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['pages-seo'],
    queryFn: async () => {
      const response = await pageService.getAll({ limit: 1000 });
      return response.data;
    },
  });

  // Update bio link SEO mutation
  const updateBioLinkSeo = useMutation({
    mutationFn: async ({ id, seo }: { id: string; seo: SeoData }) => {
      return seoService.updateBioLinkSeo(id, seo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-links-seo'] });
      toast({ title: 'SEO 设置已保存' });
      setEditingPage(null);
    },
    onError: () => {
      toast({ title: '保存失败', variant: 'destructive' });
    },
  });

  // Update page SEO mutation
  const updatePageSeo = useMutation({
    mutationFn: async ({ id, seo }: { id: string; seo: SeoData }) => {
      return seoService.updatePageSeo(id, seo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages-seo'] });
      toast({ title: 'SEO 设置已保存' });
      setEditingPage(null);
    },
    onError: () => {
      toast({ title: '保存失败', variant: 'destructive' });
    },
  });

  // Transform data into unified format
  const pages = useMemo<PageSeoItem[]>(() => {
    const items: PageSeoItem[] = [];
    const baseUrl = 'https://lnk.day';

    // Add bio links
    if (bioLinksData?.items) {
      for (const bioLink of bioLinksData.items) {
        const seo = bioLink.seo || {};
        const { score, issues } = calculateSeoScore(seo, bioLink.profile?.name || bioLink.username);
        items.push({
          id: bioLink.id,
          name: bioLink.profile?.name || bioLink.username,
          type: 'bio-link',
          slug: bioLink.username,
          url: `${baseUrl}/u/${bioLink.username}`,
          seo: {
            title: seo.title,
            description: seo.description,
            keywords: seo.keywords,
            ogImage: seo.ogImage,
            canonicalUrl: seo.canonicalUrl,
            noIndex: seo.noIndex,
            favicon: seo.favicon,
          },
          score,
          issues,
          lastUpdated: bioLink.updatedAt,
        });
      }
    }

    // Add pages
    if (pagesData?.items) {
      for (const pageItem of pagesData.items) {
        const seo = pageItem.seo || {};
        const { score, issues } = calculateSeoScore(seo, pageItem.name);
        items.push({
          id: pageItem.id,
          name: pageItem.name,
          type: 'page',
          slug: pageItem.slug,
          url: `${baseUrl}/p/${pageItem.slug}`,
          seo: {
            title: seo.title,
            description: seo.description,
            keywords: seo.keywords,
            ogImage: seo.ogImage,
            noIndex: seo.noIndex,
            favicon: seo.favicon,
          },
          score,
          issues,
          lastUpdated: pageItem.updatedAt,
        });
      }
    }

    return items;
  }, [bioLinksData, pagesData]);

  // Filter pages
  const filteredPages = pages.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginatedPages = filteredPages.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredPages.length / limit);

  // Stats
  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((acc, p) => acc + p.score, 0) / pages.length)
    : 0;
  const issueCount = pages.reduce((acc, p) => acc + p.issues.length, 0);

  // Handlers
  const handleEdit = (p: PageSeoItem) => {
    setEditingPage(p);
    setFormData({
      title: p.seo.title || '',
      description: p.seo.description || '',
      keywords: p.seo.keywords?.join(', ') || '',
      ogImage: p.seo.ogImage || '',
      ogTitle: p.seo.ogTitle || '',
      ogDescription: p.seo.ogDescription || '',
      twitterCard: p.seo.twitterCard || 'summary_large_image',
      canonicalUrl: p.seo.canonicalUrl || '',
      robots: p.seo.robots || 'index, follow',
      noIndex: p.seo.noIndex || false,
    });
  };

  const handleSave = () => {
    if (!editingPage) return;

    const keywords = formData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k);

    const seoData: SeoData = {
      title: formData.title || undefined,
      description: formData.description || undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      ogImage: formData.ogImage || undefined,
      ogTitle: formData.ogTitle || undefined,
      ogDescription: formData.ogDescription || undefined,
      twitterCard: formData.twitterCard,
      canonicalUrl: formData.canonicalUrl || undefined,
      noIndex: formData.noIndex,
    };

    if (editingPage.type === 'bio-link') {
      updateBioLinkSeo.mutate({ id: editingPage.id, seo: seoData });
    } else {
      updatePageSeo.mutate({ id: editingPage.id, seo: seoData });
    }
  };

  const handlePreview = (p: PageSeoItem) => {
    setPreviewPage(p);
    setPreviewOpen(true);
  };

  const generateSuggestion = (field: 'title' | 'description') => {
    if (!editingPage) return;

    if (field === 'title') {
      setFormData((prev) => ({
        ...prev,
        title: `${editingPage.name} | lnk.day`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        description: `访问 ${editingPage.name}，发现更多精彩内容。立即查看！`,
      }));
    }

    toast({ title: '已生成建议内容' });
  };

  const isLoading = bioLinksLoading || pagesLoading;
  const isSaving = updateBioLinkSeo.isPending || updatePageSeo.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SEO 管理</h1>
            <p className="text-muted-foreground">优化页面在搜索引擎中的表现</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">平均 SEO 得分</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-3xl font-bold">{avgScore}</p>
                    <Badge className={cn('text-white', getScoreColor(avgScore))}>
                      {getScoreLabel(avgScore)}
                    </Badge>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待优化问题</p>
                  <p className="text-3xl font-bold">{issueCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已优化页面</p>
                  <p className="text-3xl font-bold">
                    {pages.filter((p) => p.score >= 70).length} / {pages.length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="搜索页面..."
                className="w-64 pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="bio-link">Bio Link</SelectItem>
                <SelectItem value="page">落地页</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pages List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y">
                {paginatedPages.length > 0 ? (
                  paginatedPages.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={cn(
                            'h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold',
                            getScoreColor(p.score)
                          )}
                        >
                          {p.score}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{p.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {p.type === 'bio-link' ? 'Bio Link' : '落地页'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{p.url}</p>
                        {p.issues.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                            <AlertCircle className="h-3 w-3" />
                            {p.issues.length} 个优化建议
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-sm text-muted-foreground">
                        {p.lastUpdated ? format(new Date(p.lastUpdated), 'MM-dd HH:mm', { locale: zhCN }) : '-'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>
                          <Settings2 className="mr-1 h-4 w-4" />
                          配置
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无页面</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {filteredPages.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {filteredPages.length} 个页面
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>SEO 配置 - {editingPage?.name}</DialogTitle>
              <DialogDescription>
                配置页面的搜索引擎优化设置
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本设置</TabsTrigger>
                <TabsTrigger value="social">社交媒体</TabsTrigger>
                <TabsTrigger value="advanced">高级设置</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">页面标题</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => generateSuggestion('title')}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      生成建议
                    </Button>
                  </div>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="页面标题（建议 30-60 字符）"
                    className="mt-1"
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">用于搜索结果标题</span>
                    <span className={cn(
                      formData.title.length >= 30 && formData.title.length <= 60
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    )}>
                      {formData.title.length}/60
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">页面描述</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => generateSuggestion('description')}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      生成建议
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="页面描述（建议 120-160 字符）"
                    className="mt-1"
                    rows={3}
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">用于搜索结果描述</span>
                    <span className={cn(
                      formData.description.length >= 120 && formData.description.length <= 160
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    )}>
                      {formData.description.length}/160
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="keywords">关键词</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="关键词，用逗号分隔"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    建议 3-10 个关键词
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="ogImage">OG 图片 URL</Label>
                  <Input
                    id="ogImage"
                    value={formData.ogImage}
                    onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    建议尺寸 1200x630 像素
                  </p>
                </div>

                <div>
                  <Label htmlFor="ogTitle">OG 标题（可选）</Label>
                  <Input
                    id="ogTitle"
                    value={formData.ogTitle}
                    onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                    placeholder="留空则使用页面标题"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="ogDescription">OG 描述（可选）</Label>
                  <Textarea
                    id="ogDescription"
                    value={formData.ogDescription}
                    onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                    placeholder="留空则使用页面描述"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Twitter 卡片类型</Label>
                  <Select
                    value={formData.twitterCard}
                    onValueChange={(v) => setFormData({ ...formData, twitterCard: v as any })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary（小图）</SelectItem>
                      <SelectItem value="summary_large_image">Summary Large Image（大图）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview */}
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-3">社交媒体预览</p>
                  <div className="space-y-4">
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-gray-100 h-32 flex items-center justify-center">
                        {formData.ogImage ? (
                          <img
                            src={formData.ogImage}
                            alt="OG Preview"
                            className="h-full w-full object-cover"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground">{editingPage?.url}</p>
                        <p className="font-medium text-sm mt-1">
                          {formData.ogTitle || formData.title || '页面标题'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {formData.ogDescription || formData.description || '页面描述'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="canonicalUrl">Canonical URL</Label>
                  <Input
                    id="canonicalUrl"
                    value={formData.canonicalUrl}
                    onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                    placeholder="https://example.com/canonical-page"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    指定页面的规范 URL，避免重复内容问题
                  </p>
                </div>

                <div>
                  <Label htmlFor="robots">Robots 指令</Label>
                  <Select
                    value={formData.robots}
                    onValueChange={(v) => setFormData({ ...formData, robots: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index, follow">index, follow（允许索引和跟踪）</SelectItem>
                      <SelectItem value="noindex, follow">noindex, follow（不索引但跟踪）</SelectItem>
                      <SelectItem value="index, nofollow">index, nofollow（索引但不跟踪）</SelectItem>
                      <SelectItem value="noindex, nofollow">noindex, nofollow（不索引不跟踪）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    生成的 Meta 标签预览
                  </Label>
                  <div className="mt-2 rounded-lg bg-gray-900 p-4 text-xs font-mono text-gray-100 overflow-x-auto">
                    <pre>{`<title>${formData.title || '页面标题'}</title>
<meta name="description" content="${formData.description || '页面描述'}">
<meta name="keywords" content="${formData.keywords || '关键词'}">
<link rel="canonical" href="${formData.canonicalUrl || editingPage?.url || ''}">
<meta name="robots" content="${formData.robots}">

<!-- Open Graph -->
<meta property="og:title" content="${formData.ogTitle || formData.title || '标题'}">
<meta property="og:description" content="${formData.ogDescription || formData.description || '描述'}">
<meta property="og:image" content="${formData.ogImage || ''}">
<meta property="og:url" content="${editingPage?.url || ''}">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="${formData.twitterCard}">
<meta name="twitter:title" content="${formData.ogTitle || formData.title || '标题'}">
<meta name="twitter:description" content="${formData.ogDescription || formData.description || '描述'}">
<meta name="twitter:image" content="${formData.ogImage || ''}">`}</pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setEditingPage(null)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存设置
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Sheet */}
        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>SEO 预览</SheetTitle>
              <SheetDescription>
                查看页面在不同平台的显示效果
              </SheetDescription>
            </SheetHeader>
            {previewPage && (
              <div className="mt-6 space-y-6">
                {/* Score */}
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl',
                      getScoreColor(previewPage.score)
                    )}
                  >
                    {previewPage.score}
                  </div>
                  <div>
                    <p className="font-medium">SEO 得分：{getScoreLabel(previewPage.score)}</p>
                    <p className="text-sm text-muted-foreground">
                      {previewPage.issues.length > 0
                        ? `${previewPage.issues.length} 个待优化项`
                        : '已完全优化'}
                    </p>
                  </div>
                </div>

                {/* Issues */}
                {previewPage.issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">优化建议</p>
                    <div className="space-y-1">
                      {previewPage.issues.map((issue, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Google Preview */}
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Google 搜索结果预览
                  </p>
                  <div className="rounded-lg border p-4">
                    <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                      {previewPage.seo.title || previewPage.name}
                    </p>
                    <p className="text-green-700 text-sm">{previewPage.url}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {previewPage.seo.description || '暂无描述'}
                    </p>
                  </div>
                </div>

                {/* Social Preview */}
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    社交媒体分享预览
                  </p>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-gray-100 h-40 flex items-center justify-center">
                      {previewPage.seo.ogImage ? (
                        <img
                          src={previewPage.seo.ogImage}
                          alt="OG"
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="p-3 bg-gray-50">
                      <p className="text-xs text-gray-500 uppercase">lnk.day</p>
                      <p className="font-medium">
                        {previewPage.seo.ogTitle || previewPage.seo.title || previewPage.name}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {previewPage.seo.ogDescription || previewPage.seo.description || ''}
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={() => { handleEdit(previewPage); setPreviewOpen(false); }}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  编辑 SEO 设置
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
