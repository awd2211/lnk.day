import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Link2,
  Eye,
  EyeOff,
  GripVertical,
  RefreshCw,
  Tag,
  Settings2,
  BarChart3,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { templatesService } from '@/lib/api';

type LinkTemplateCategory = 'marketing' | 'social' | 'email' | 'qr' | 'ecommerce' | 'general';

interface LinkTemplate {
  id: string;
  name: string;
  description?: string;
  category: LinkTemplateCategory;
  defaults: {
    shortCodePrefix?: string;
    redirectType?: string;
    utmParams?: Record<string, string>;
    expiresInDays?: number;
  };
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface LinkTemplateStats {
  total: number;
  active: number;
  inactive: number;
  totalUsage: number;
  byCategory: { category: string; count: string }[];
}

const CATEGORY_CONFIG: Record<LinkTemplateCategory, { label: string; color: string }> = {
  marketing: { label: '营销推广', color: 'bg-purple-100 text-purple-700' },
  social: { label: '社交媒体', color: 'bg-blue-100 text-blue-700' },
  email: { label: '邮件营销', color: 'bg-indigo-100 text-indigo-700' },
  qr: { label: '二维码', color: 'bg-teal-100 text-teal-700' },
  ecommerce: { label: '电商', color: 'bg-green-100 text-green-700' },
  general: { label: '通用', color: 'bg-slate-100 text-slate-700' },
};

const REDIRECT_TYPES = [
  { value: '301', label: '301 永久重定向' },
  { value: '302', label: '302 临时重定向' },
  { value: '307', label: '307 临时重定向(保留方法)' },
  { value: 'meta', label: 'Meta 刷新' },
  { value: 'js', label: 'JavaScript 跳转' },
];

export default function LinkTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LinkTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as LinkTemplateCategory,
    defaults: {
      shortCodePrefix: '',
      redirectType: '302',
      expiresInDays: 0,
      utmParams: {} as Record<string, string>,
    },
    isActive: true,
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['link-templates', page, search, category, status],
    queryFn: () =>
      templatesService.getLinkTemplates({
        page,
        limit: 20,
        search: search || undefined,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status as 'active' | 'inactive' : undefined,
      }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['link-template-stats'],
    queryFn: () => templatesService.getLinkTemplateStats(),
  });

  const templates: LinkTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const stats: LinkTemplateStats | null = statsData?.data || null;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createLinkTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
      queryClient.invalidateQueries({ queryKey: ['link-template-stats'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateLinkTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteLinkTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
      queryClient.invalidateQueries({ queryKey: ['link-template-stats'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleLinkTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'general',
      defaults: {
        shortCodePrefix: '',
        redirectType: '302',
        expiresInDays: 0,
        utmParams: {},
      },
      isActive: true,
    });
  };

  const openEditDialog = (template: LinkTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      defaults: {
        shortCodePrefix: template.defaults.shortCodePrefix || '',
        redirectType: template.defaults.redirectType || '302',
        expiresInDays: template.defaults.expiresInDays || 0,
        utmParams: template.defaults.utmParams || {},
      },
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      defaults: {
        ...formData.defaults,
        expiresInDays: formData.defaults.expiresInDays || undefined,
        shortCodePrefix: formData.defaults.shortCodePrefix || undefined,
      },
    });
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        ...formData,
        defaults: {
          ...formData.defaults,
          expiresInDays: formData.defaults.expiresInDays || undefined,
          shortCodePrefix: formData.defaults.shortCodePrefix || undefined,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">链接模板</h1>
          <p className="text-gray-600 mt-1">管理平台预设链接模板，用户可在创建链接时选择使用</p>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总模板数</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已启用</CardTitle>
              <Eye className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已禁用</CardTitle>
              <EyeOff className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总使用次数</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsage}</div>
            </CardContent>
          </Card>
        </div>
      )}

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
            <div className="text-center py-8 text-gray-500">暂无模板</div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="cursor-move text-gray-400">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge className={CATEGORY_CONFIG[template.category].color}>
                          {CATEGORY_CONFIG[template.category].label}
                        </Badge>
                        {!template.isActive && (
                          <Badge variant="outline" className="text-gray-500">已禁用</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {template.defaults.shortCodePrefix && (
                          <span>前缀: {template.defaults.shortCodePrefix}</span>
                        )}
                        <span>跳转: {template.defaults.redirectType || '302'}</span>
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
            <DialogTitle>创建链接模板</DialogTitle>
            <DialogDescription>
              创建一个新的链接模板，用户创建链接时可选择使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 营销活动链接"
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
            <div>
              <Label>类别</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as LinkTemplateCategory })}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>短码前缀</Label>
                <Input
                  value={formData.defaults.shortCodePrefix}
                  onChange={(e) => setFormData({
                    ...formData,
                    defaults: { ...formData.defaults, shortCodePrefix: e.target.value }
                  })}
                  placeholder="例如: mkt-"
                />
              </div>
              <div>
                <Label>跳转类型</Label>
                <Select
                  value={formData.defaults.redirectType}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    defaults: { ...formData.defaults, redirectType: v }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REDIRECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>默认有效期 (天，0表示永久)</Label>
              <Input
                type="number"
                value={formData.defaults.expiresInDays}
                onChange={(e) => setFormData({
                  ...formData,
                  defaults: { ...formData.defaults, expiresInDays: parseInt(e.target.value) || 0 }
                })}
                min={0}
              />
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
            <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑链接模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div>
              <Label>类别</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as LinkTemplateCategory })}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>短码前缀</Label>
                <Input
                  value={formData.defaults.shortCodePrefix}
                  onChange={(e) => setFormData({
                    ...formData,
                    defaults: { ...formData.defaults, shortCodePrefix: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label>跳转类型</Label>
                <Select
                  value={formData.defaults.redirectType}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    defaults: { ...formData.defaults, redirectType: v }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REDIRECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>默认有效期 (天)</Label>
              <Input
                type="number"
                value={formData.defaults.expiresInDays}
                onChange={(e) => setFormData({
                  ...formData,
                  defaults: { ...formData.defaults, expiresInDays: parseInt(e.target.value) || 0 }
                })}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
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
