import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Globe,
  FileText,
  Image,
  Link2,
  Settings,
  Save,
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Code,
  Share2,
  Facebook,
  Twitter,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface SeoSettings {
  defaultTitle: string;
  titleSuffix: string;
  defaultDescription: string;
  defaultKeywords: string[];
  defaultOgImage: string;
  twitterCard: 'summary' | 'summary_large_image';
  twitterSite: string;
  googleVerification: string;
  bingVerification: string;
  robotsTxt: string;
  sitemapEnabled: boolean;
  canonicalEnabled: boolean;
  noindexByDefault: boolean;
  schemaMarkupEnabled: boolean;
}

interface PageSeo {
  id: string;
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  pageType: 'link' | 'bio-link' | 'landing';
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
  schemaType: string;
  lastModified: string;
  score: number;
}

interface SeoIssue {
  id: string;
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  type: 'error' | 'warning' | 'info';
  category: 'title' | 'description' | 'image' | 'structure' | 'performance';
  message: string;
  suggestion: string;
  createdAt: string;
}

export default function SeoManagerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingPage, setEditingPage] = useState<PageSeo | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // 获取 SEO 设置
  const { data: settings } = useQuery<SeoSettings>({
    queryKey: ['seo-settings'],
    queryFn: () => api.get('/proxy/seo/settings').then((r) => r.data),
  });

  // 获取页面 SEO 列表
  const { data: pagesData, isLoading } = useQuery({
    queryKey: ['seo-pages', searchQuery, typeFilter],
    queryFn: () =>
      api.get('/proxy/seo/pages', {
        params: {
          search: searchQuery || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        },
      }).then((r) => r.data),
  });

  // 获取 SEO 问题
  const { data: issuesData } = useQuery({
    queryKey: ['seo-issues'],
    queryFn: () => api.get('/proxy/seo/issues').then((r) => r.data),
  });

  // 获取 SEO 统计
  const { data: stats } = useQuery({
    queryKey: ['seo-stats'],
    queryFn: () => api.get('/proxy/seo/stats').then((r) => r.data),
  });

  const pages: PageSeo[] = pagesData?.items || pagesData?.pages || [];
  const issues: SeoIssue[] = issuesData?.items || issuesData?.issues || [];

  // 保存设置
  const saveSettingsMutation = useMutation({
    mutationFn: (data: Partial<SeoSettings>) => api.put('/proxy/seo/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-settings'] });
      toast({ title: '成功', description: '设置已保存' });
    },
    onError: () => {
      toast({ title: '错误', description: '保存失败', variant: 'destructive' });
    },
  });

  // 更新页面 SEO
  const updatePageSeoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PageSeo> }) =>
      api.put(`/proxy/seo/pages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
      queryClient.invalidateQueries({ queryKey: ['seo-issues'] });
      toast({ title: '成功', description: 'SEO 信息已更新' });
      setShowEditDialog(false);
      setEditingPage(null);
    },
    onError: () => {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' });
    },
  });

  // 批量优化
  const batchOptimizeMutation = useMutation({
    mutationFn: () => api.post('/proxy/seo/optimize'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
      queryClient.invalidateQueries({ queryKey: ['seo-issues'] });
      toast({ title: '成功', description: '批量优化完成' });
    },
    onError: () => {
      toast({ title: '错误', description: '优化失败', variant: 'destructive' });
    },
  });

  // 设置表单状态
  const [settingsForm, setSettingsForm] = useState<Partial<SeoSettings>>({});

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-700">优秀</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-700">良好</Badge>;
    return <Badge className="bg-red-100 text-red-700">需优化</Badge>;
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SEO 管理</h2>
          <p className="text-muted-foreground">优化页面搜索引擎表现</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => batchOptimizeMutation.mutate()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            批量优化
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总页面数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPages || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SEO 优秀</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.excellentPages || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">需要改进</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.needsImprovementPages || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">问题数</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.issuesCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均评分</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats?.averageScore || 0)}`}>
              {stats?.averageScore || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">页面列表</TabsTrigger>
          <TabsTrigger value="issues">问题诊断</TabsTrigger>
          <TabsTrigger value="settings">全局设置</TabsTrigger>
        </TabsList>

        {/* 页面列表 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索页面..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="页面类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="link">短链接</SelectItem>
                      <SelectItem value="bio-link">Bio Link</SelectItem>
                      <SelectItem value="landing">落地页</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>页面</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>评分</TableHead>
                    <TableHead>索引</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : pages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无页面
                      </TableCell>
                    </TableRow>
                  ) : (
                    pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{page.pageTitle}</p>
                            <p className="text-xs text-muted-foreground">{page.pageUrl}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {page.pageType === 'link' ? '短链接' : page.pageType === 'bio-link' ? 'Bio Link' : '落地页'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="text-sm truncate">{page.title || '-'}</p>
                            <p className="text-xs text-muted-foreground">
                              {page.title?.length || 0} 字符
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="text-sm truncate">{page.description || '-'}</p>
                            <p className="text-xs text-muted-foreground">
                              {page.description?.length || 0} 字符
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${getScoreColor(page.score)}`}>
                              {page.score}
                            </span>
                            {getScoreBadge(page.score)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {page.noindex ? (
                            <Badge variant="outline" className="text-red-600">
                              Noindex
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">
                              Index
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingPage(page); setShowEditDialog(true); }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                编辑 SEO
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(page.pageUrl, '_blank')}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                预览页面
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 问题诊断 */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO 问题诊断</CardTitle>
              <CardDescription>发现的 SEO 问题和优化建议</CardDescription>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>太棒了！没有发现 SEO 问题</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{issue.pageTitle}</span>
                          <Badge variant="outline">{issue.category}</Badge>
                        </div>
                        <p className="text-sm">{issue.message}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          建议: {issue.suggestion}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        修复
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 全局设置 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>默认 SEO 设置</CardTitle>
              <CardDescription>为新页面设置默认的 SEO 配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基础设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">基础设置</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>默认标题</Label>
                    <Input
                      placeholder="网站默认标题"
                      defaultValue={settings?.defaultTitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>标题后缀</Label>
                    <Input
                      placeholder="| 品牌名"
                      defaultValue={settings?.titleSuffix}
                      onChange={(e) => setSettingsForm({ ...settingsForm, titleSuffix: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>默认描述</Label>
                  <Textarea
                    placeholder="网站默认描述..."
                    defaultValue={settings?.defaultDescription}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultDescription: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>默认关键词</Label>
                  <Input
                    placeholder="关键词1, 关键词2, ..."
                    defaultValue={settings?.defaultKeywords?.join(', ')}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      defaultKeywords: e.target.value.split(',').map(k => k.trim()),
                    })}
                  />
                </div>
              </div>

              <Separator />

              {/* 社交媒体 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">社交媒体</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>默认 OG 图片 URL</Label>
                    <Input
                      placeholder="https://..."
                      defaultValue={settings?.defaultOgImage}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultOgImage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter Card 类型</Label>
                    <Select
                      defaultValue={settings?.twitterCard}
                      onValueChange={(v) => setSettingsForm({ ...settingsForm, twitterCard: v as 'summary' | 'summary_large_image' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter @username</Label>
                    <Input
                      placeholder="@username"
                      defaultValue={settings?.twitterSite}
                      onChange={(e) => setSettingsForm({ ...settingsForm, twitterSite: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 搜索引擎验证 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">搜索引擎验证</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Google 验证码</Label>
                    <Input
                      placeholder="google-site-verification"
                      defaultValue={settings?.googleVerification}
                      onChange={(e) => setSettingsForm({ ...settingsForm, googleVerification: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bing 验证码</Label>
                    <Input
                      placeholder="msvalidate.01"
                      defaultValue={settings?.bingVerification}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bingVerification: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 高级设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">高级设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>启用 Sitemap</Label>
                      <p className="text-sm text-muted-foreground">自动生成网站地图</p>
                    </div>
                    <Switch
                      defaultChecked={settings?.sitemapEnabled}
                      onCheckedChange={(v) => setSettingsForm({ ...settingsForm, sitemapEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>启用 Canonical URL</Label>
                      <p className="text-sm text-muted-foreground">自动设置规范链接</p>
                    </div>
                    <Switch
                      defaultChecked={settings?.canonicalEnabled}
                      onCheckedChange={(v) => setSettingsForm({ ...settingsForm, canonicalEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>启用 Schema Markup</Label>
                      <p className="text-sm text-muted-foreground">添加结构化数据</p>
                    </div>
                    <Switch
                      defaultChecked={settings?.schemaMarkupEnabled}
                      onCheckedChange={(v) => setSettingsForm({ ...settingsForm, schemaMarkupEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>默认 Noindex</Label>
                      <p className="text-sm text-muted-foreground">新页面默认不被搜索引擎收录</p>
                    </div>
                    <Switch
                      defaultChecked={settings?.noindexByDefault}
                      onCheckedChange={(v) => setSettingsForm({ ...settingsForm, noindexByDefault: v })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Robots.txt */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Robots.txt</h3>
                <Textarea
                  placeholder="User-agent: *&#10;Allow: /"
                  className="font-mono text-sm"
                  rows={8}
                  defaultValue={settings?.robotsTxt}
                  onChange={(e) => setSettingsForm({ ...settingsForm, robotsTxt: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => saveSettingsMutation.mutate(settingsForm)}>
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑页面 SEO 对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 SEO 设置</DialogTitle>
            <DialogDescription>{editingPage?.pageTitle}</DialogDescription>
          </DialogHeader>
          {editingPage && (
            <div className="space-y-4">
              {/* 基本 Meta */}
              <div className="space-y-4">
                <h4 className="font-medium">基本 Meta 信息</h4>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    defaultValue={editingPage.title}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingPage.title?.length || 0}/60 字符 (建议 50-60)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    defaultValue={editingPage.description}
                    onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingPage.description?.length || 0}/160 字符 (建议 120-160)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <Input
                    defaultValue={editingPage.keywords?.join(', ')}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      keywords: e.target.value.split(',').map(k => k.trim()),
                    })}
                  />
                </div>
              </div>

              <Separator />

              {/* Open Graph */}
              <div className="space-y-4">
                <h4 className="font-medium">Open Graph (社交分享)</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>OG Title</Label>
                    <Input
                      defaultValue={editingPage.ogTitle}
                      onChange={(e) => setEditingPage({ ...editingPage, ogTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>OG Image URL</Label>
                    <Input
                      defaultValue={editingPage.ogImage}
                      onChange={(e) => setEditingPage({ ...editingPage, ogImage: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>OG Description</Label>
                  <Textarea
                    defaultValue={editingPage.ogDescription}
                    onChange={(e) => setEditingPage({ ...editingPage, ogDescription: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* 高级选项 */}
              <div className="space-y-4">
                <h4 className="font-medium">高级选项</h4>
                <div className="space-y-2">
                  <Label>Canonical URL</Label>
                  <Input
                    defaultValue={editingPage.canonicalUrl}
                    onChange={(e) => setEditingPage({ ...editingPage, canonicalUrl: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Noindex</Label>
                    <p className="text-sm text-muted-foreground">阻止搜索引擎收录此页</p>
                  </div>
                  <Switch
                    checked={editingPage.noindex}
                    onCheckedChange={(v) => setEditingPage({ ...editingPage, noindex: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Nofollow</Label>
                    <p className="text-sm text-muted-foreground">阻止搜索引擎跟踪链接</p>
                  </div>
                  <Switch
                    checked={editingPage.nofollow}
                    onCheckedChange={(v) => setEditingPage({ ...editingPage, nofollow: v })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => updatePageSeoMutation.mutate({ id: editingPage.id, data: editingPage })}>
                  保存
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
