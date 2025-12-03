import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Smartphone,
  Eye,
  EyeOff,
  RefreshCw,
  Apple,
  PlayCircle,
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

type DeepLinkCategory = 'social' | 'commerce' | 'media' | 'utility' | 'custom';

interface DeepLinkTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: DeepLinkCategory;
  ios?: {
    bundleId?: string;
    appStoreId?: string;
    customScheme?: string;
    universalLink?: string;
    fallbackUrl?: string;
  };
  android?: {
    packageName?: string;
    playStoreUrl?: string;
    customScheme?: string;
    appLinks?: string[];
    fallbackUrl?: string;
  };
  fallbackUrl?: string;
  enableDeferred?: boolean;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<DeepLinkCategory, { label: string; color: string }> = {
  social: { label: '社交平台', color: 'bg-blue-100 text-blue-700' },
  commerce: { label: '电商应用', color: 'bg-green-100 text-green-700' },
  media: { label: '媒体应用', color: 'bg-purple-100 text-purple-700' },
  utility: { label: '工具应用', color: 'bg-orange-100 text-orange-700' },
  custom: { label: '自定义', color: 'bg-slate-100 text-slate-700' },
};

const DEFAULT_CATEGORY_CONFIG = { label: '未知', color: 'bg-gray-100 text-gray-700' };

const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG[category as DeepLinkCategory] || DEFAULT_CATEGORY_CONFIG;
};

export default function DeepLinkTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DeepLinkTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as DeepLinkCategory,
    ios: {
      bundleId: '',
      appStoreId: '',
      customScheme: '',
      universalLink: '',
      fallbackUrl: '',
    },
    android: {
      packageName: '',
      playStoreUrl: '',
      customScheme: '',
      fallbackUrl: '',
    },
    fallbackUrl: '',
    enableDeferred: false,
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['deeplink-templates', page, search, category, status],
    queryFn: () =>
      templatesService.getDeepLinkTemplates({
        page,
        limit: 20,
        search: search || undefined,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
      }),
  });

  const templates: DeepLinkTemplate[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (data: any) => templatesService.createDeepLinkTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplink-templates'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      templatesService.updateDeepLinkTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplink-templates'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteDeepLinkTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplink-templates'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleDeepLinkTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplink-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      ios: { bundleId: '', appStoreId: '', customScheme: '', universalLink: '', fallbackUrl: '' },
      android: { packageName: '', playStoreUrl: '', customScheme: '', fallbackUrl: '' },
      fallbackUrl: '',
      enableDeferred: false,
      isActive: true,
    });
  };

  const openEditDialog = (template: DeepLinkTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      ios: {
        bundleId: template.ios?.bundleId || '',
        appStoreId: template.ios?.appStoreId || '',
        customScheme: template.ios?.customScheme || '',
        universalLink: template.ios?.universalLink || '',
        fallbackUrl: template.ios?.fallbackUrl || '',
      },
      android: {
        packageName: template.android?.packageName || '',
        playStoreUrl: template.android?.playStoreUrl || '',
        customScheme: template.android?.customScheme || '',
        fallbackUrl: template.android?.fallbackUrl || '',
      },
      fallbackUrl: template.fallbackUrl || '',
      enableDeferred: template.enableDeferred || false,
      isActive: template.isActive,
    });
    setShowEditDialog(true);
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({ id: selectedTemplate.id, data: formData });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DeepLink 模板</h1>
          <p className="text-gray-600 mt-1">管理应用深度链接预设模板，支持 iOS 和 Android</p>
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
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-indigo-600" />
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
                        {template.ios?.bundleId && (
                          <span className="flex items-center gap-1">
                            <Apple className="w-3 h-3" /> iOS
                          </span>
                        )}
                        {template.android?.packageName && (
                          <span className="flex items-center gap-1">
                            <PlayCircle className="w-3 h-3" /> Android
                          </span>
                        )}
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
            <DialogTitle>创建 DeepLink 模板</DialogTitle>
            <DialogDescription>创建应用深度链接预设模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>模板名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 微信小程序"
                />
              </div>
              <div>
                <Label>类别</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as DeepLinkCategory })}
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

            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Apple className="w-4 h-4" /> iOS 配置
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bundle ID</Label>
                  <Input
                    value={formData.ios.bundleId}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, bundleId: e.target.value }
                    })}
                    placeholder="com.example.app"
                  />
                </div>
                <div>
                  <Label>App Store ID</Label>
                  <Input
                    value={formData.ios.appStoreId}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, appStoreId: e.target.value }
                    })}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label>Custom Scheme</Label>
                  <Input
                    value={formData.ios.customScheme}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, customScheme: e.target.value }
                    })}
                    placeholder="myapp://"
                  />
                </div>
                <div>
                  <Label>Universal Link</Label>
                  <Input
                    value={formData.ios.universalLink}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, universalLink: e.target.value }
                    })}
                    placeholder="https://example.com/app"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <PlayCircle className="w-4 h-4" /> Android 配置
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Package Name</Label>
                  <Input
                    value={formData.android.packageName}
                    onChange={(e) => setFormData({
                      ...formData,
                      android: { ...formData.android, packageName: e.target.value }
                    })}
                    placeholder="com.example.app"
                  />
                </div>
                <div>
                  <Label>Play Store URL</Label>
                  <Input
                    value={formData.android.playStoreUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      android: { ...formData.android, playStoreUrl: e.target.value }
                    })}
                    placeholder="https://play.google.com/store/apps/..."
                  />
                </div>
                <div>
                  <Label>Custom Scheme</Label>
                  <Input
                    value={formData.android.customScheme}
                    onChange={(e) => setFormData({
                      ...formData,
                      android: { ...formData.android, customScheme: e.target.value }
                    })}
                    placeholder="myapp://"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>通用 Fallback URL</Label>
              <Input
                value={formData.fallbackUrl}
                onChange={(e) => setFormData({ ...formData, fallbackUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.enableDeferred}
                  onCheckedChange={(checked) => setFormData({ ...formData, enableDeferred: checked })}
                />
                <Label>启用延迟深度链接</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>立即启用</Label>
              </div>
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

      {/* Edit Dialog - Similar to Create */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 DeepLink 模板</DialogTitle>
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
                  onValueChange={(v) => setFormData({ ...formData, category: v as DeepLinkCategory })}
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
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Apple className="w-4 h-4" /> iOS 配置
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bundle ID</Label>
                  <Input
                    value={formData.ios.bundleId}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, bundleId: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>App Store ID</Label>
                  <Input
                    value={formData.ios.appStoreId}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, appStoreId: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Custom Scheme</Label>
                  <Input
                    value={formData.ios.customScheme}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, customScheme: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Universal Link</Label>
                  <Input
                    value={formData.ios.universalLink}
                    onChange={(e) => setFormData({
                      ...formData,
                      ios: { ...formData.ios, universalLink: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <PlayCircle className="w-4 h-4" /> Android 配置
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Package Name</Label>
                  <Input
                    value={formData.android.packageName}
                    onChange={(e) => setFormData({
                      ...formData,
                      android: { ...formData.android, packageName: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Play Store URL</Label>
                  <Input
                    value={formData.android.playStoreUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      android: { ...formData.android, playStoreUrl: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Custom Scheme</Label>
                  <Input
                    value={formData.android.customScheme}
                    onChange={(e) => setFormData({
                      ...formData,
                      android: { ...formData.android, customScheme: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>通用 Fallback URL</Label>
              <Input
                value={formData.fallbackUrl}
                onChange={(e) => setFormData({ ...formData, fallbackUrl: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enableDeferred}
                onCheckedChange={(checked) => setFormData({ ...formData, enableDeferred: checked })}
              />
              <Label>启用延迟深度链接</Label>
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
