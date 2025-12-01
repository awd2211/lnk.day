import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Tag,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Globe,
  Share2,
  Mail,
  ShoppingCart,
  Megaphone,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface UTMTemplate {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  category?: string;
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  google_ads: { label: 'Google Ads', icon: Globe, color: 'bg-blue-100 text-blue-700' },
  facebook: { label: 'Facebook', icon: Share2, color: 'bg-indigo-100 text-indigo-700' },
  instagram: { label: 'Instagram', icon: Share2, color: 'bg-pink-100 text-pink-700' },
  twitter: { label: 'Twitter/X', icon: Share2, color: 'bg-sky-100 text-sky-700' },
  linkedin: { label: 'LinkedIn', icon: Share2, color: 'bg-blue-100 text-blue-700' },
  tiktok: { label: 'TikTok', icon: Share2, color: 'bg-gray-100 text-gray-700' },
  youtube: { label: 'YouTube', icon: Share2, color: 'bg-red-100 text-red-700' },
  email: { label: '邮件营销', icon: Mail, color: 'bg-green-100 text-green-700' },
  affiliate: { label: '联盟营销', icon: ShoppingCart, color: 'bg-orange-100 text-orange-700' },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  advertising: { label: '广告投放', color: 'bg-purple-100 text-purple-700' },
  social: { label: '社交媒体', color: 'bg-blue-100 text-blue-700' },
  email: { label: '邮件营销', color: 'bg-green-100 text-green-700' },
  content: { label: '内容营销', color: 'bg-orange-100 text-orange-700' },
  affiliate: { label: '联盟推广', color: 'bg-yellow-100 text-yellow-700' },
  other: { label: '其他', color: 'bg-gray-100 text-gray-700' },
};

export default function UtmTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UTMTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: '',
    category: 'other',
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
    isActive: true,
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['utm-templates', page, search, category, platform, status],
    queryFn: () =>
      templatesService.getUtmTemplates({
        page,
        limit: 20,
        search: search || undefined,
        category: category !== 'all' ? category : undefined,
        platform: platform !== 'all' ? platform : undefined,
        status: status !== 'all' ? status as 'active' | 'inactive' : undefined,
      }),
  });

  // Fetch platforms
  const { data: platformsData } = useQuery({
    queryKey: ['utm-platforms'],
    queryFn: () => templatesService.getUtmPlatforms(),
  });

  const templates: UTMTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const platforms: string[] = platformsData?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createUtmTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      queryClient.invalidateQueries({ queryKey: ['utm-platforms'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateUtmTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteUtmTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => templatesService.seedUtmPlatforms(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      queryClient.invalidateQueries({ queryKey: ['utm-platforms'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      platform: '',
      category: 'other',
      source: '',
      medium: '',
      campaign: '',
      term: '',
      content: '',
      isActive: true,
    });
  };

  const openEditDialog = (template: UTMTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      platform: template.platform || '',
      category: template.category || 'other',
      source: template.source,
      medium: template.medium,
      campaign: template.campaign || '',
      term: template.term || '',
      content: template.content || '',
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      platform: formData.platform || undefined,
      campaign: formData.campaign || undefined,
      term: formData.term || undefined,
      content: formData.content || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        ...formData,
        platform: formData.platform || undefined,
        campaign: formData.campaign || undefined,
        term: formData.term || undefined,
        content: formData.content || undefined,
      },
    });
  };

  const getPreviewUrl = () => {
    const params = new URLSearchParams();
    if (formData.source) params.set('utm_source', formData.source);
    if (formData.medium) params.set('utm_medium', formData.medium);
    if (formData.campaign) params.set('utm_campaign', formData.campaign);
    if (formData.term) params.set('utm_term', formData.term);
    if (formData.content) params.set('utm_content', formData.content);
    return `https://example.com/?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UTM 模板</h1>
          <p className="text-gray-600 mt-1">管理平台预设UTM参数模板，帮助用户快速添加追踪参数</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <Sparkles className="w-4 h-4 mr-2" />
            {seedMutation.isPending ? '初始化中...' : '初始化平台模板'}
          </Button>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总模板数</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">支持平台</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{platforms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">广告模板</CardTitle>
            <Megaphone className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {templates.filter(t => t.category === 'advertising').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">社交模板</CardTitle>
            <Share2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.category === 'social').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_CONFIG[p]?.label || p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Templates List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无模板</p>
              <Button variant="link" onClick={() => seedMutation.mutate()}>
                点击初始化默认平台模板
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const platformConfig = PLATFORM_CONFIG[template.platform || ''];
                const categoryConfig = CATEGORY_CONFIG[template.category || 'other'];
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{template.name}</span>
                        {template.platform && platformConfig && (
                          <Badge className={platformConfig.color}>
                            {platformConfig.label}
                          </Badge>
                        )}
                        {template.category && categoryConfig && (
                          <Badge variant="outline" className={categoryConfig.color}>
                            {categoryConfig.label}
                          </Badge>
                        )}
                        {!template.isActive && (
                          <Badge variant="outline" className="text-gray-500">已禁用</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-mono">
                        <span>source: {template.source}</span>
                        <span>medium: {template.medium}</span>
                        {template.campaign && <span>campaign: {template.campaign}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建 UTM 模板</DialogTitle>
            <DialogDescription>
              创建一个新的UTM参数模板，用户可在添加链接时快速应用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: Google Ads 广告"
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="模板用途说明"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>平台</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择平台" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>类别</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>utm_source *</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="例如: google"
                />
              </div>
              <div>
                <Label>utm_medium *</Label>
                <Input
                  value={formData.medium}
                  onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                  placeholder="例如: cpc"
                />
              </div>
            </div>
            <div>
              <Label>utm_campaign</Label>
              <Input
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                placeholder="例如: spring_sale"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>utm_term</Label>
                <Input
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  placeholder="关键词"
                />
              </div>
              <div>
                <Label>utm_content</Label>
                <Input
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="内容标识"
                />
              </div>
            </div>
            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500">URL 预览</Label>
              <p className="text-sm font-mono break-all mt-1">{getPreviewUrl()}</p>
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || !formData.source || !formData.medium || createMutation.isPending}
            >
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑 UTM 模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>平台</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择平台" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>类别</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>utm_source *</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
              </div>
              <div>
                <Label>utm_medium *</Label>
                <Input
                  value={formData.medium}
                  onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>utm_campaign</Label>
              <Input
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>utm_term</Label>
                <Input
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                />
              </div>
              <div>
                <Label>utm_content</Label>
                <Input
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500">URL 预览</Label>
              <p className="text-sm font-mono break-all mt-1">{getPreviewUrl()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name || !formData.source || !formData.medium || updateMutation.isPending}
            >
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
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
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
