import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Link2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Tag,
  Target,
  Radio,
  FileText,
  Hash,
  Download,
  Upload,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface UtmTemplate {
  id: string;
  name: string;
  description?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const UTM_PRESETS = {
  sources: ['google', 'facebook', 'twitter', 'instagram', 'linkedin', 'email', 'newsletter', 'wechat', 'weibo', 'douyin'],
  mediums: ['cpc', 'organic', 'social', 'email', 'referral', 'display', 'affiliate', 'video', 'banner'],
};

function UtmTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UtmTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<UtmTemplate | null>(null);
  const [previewUrl, setPreviewUrl] = useState('https://example.com');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['utm-templates', searchQuery],
    queryFn: async () => {
      const response = await api.get('/api/v1/utm-templates', {
        params: { search: searchQuery || undefined },
      });
      return response.data;
    },
  });

  const templates: UtmTemplate[] = templatesData?.data || [];

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/api/v1/utm-templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: '成功', description: 'UTM 模板创建成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '创建失败', variant: 'destructive' });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/api/v1/utm-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      setEditingTemplate(null);
      resetForm();
      toast({ title: '成功', description: '模板更新成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/utm-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-templates'] });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      toast({ title: '成功', description: '模板删除成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmTerm: '',
      utmContent: '',
      tags: [],
    });
    setTagInput('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (template: UtmTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      utmSource: template.utmSource,
      utmMedium: template.utmMedium,
      utmCampaign: template.utmCampaign,
      utmTerm: template.utmTerm || '',
      utmContent: template.utmContent || '',
      tags: template.tags || [],
    });
    setEditingTemplate(template);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入模板名称', variant: 'destructive' });
      return;
    }
    if (!formData.utmSource.trim() || !formData.utmMedium.trim() || !formData.utmCampaign.trim()) {
      toast({ title: '错误', description: '请填写必填的 UTM 参数', variant: 'destructive' });
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (template: UtmTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const buildUtmUrl = (baseUrl: string, template: typeof formData) => {
    try {
      const url = new URL(baseUrl);
      if (template.utmSource) url.searchParams.set('utm_source', template.utmSource);
      if (template.utmMedium) url.searchParams.set('utm_medium', template.utmMedium);
      if (template.utmCampaign) url.searchParams.set('utm_campaign', template.utmCampaign);
      if (template.utmTerm) url.searchParams.set('utm_term', template.utmTerm);
      if (template.utmContent) url.searchParams.set('utm_content', template.utmContent);
      return url.toString();
    } catch {
      return baseUrl;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '已复制', description: '已复制到剪贴板' });
  };

  // Stats
  const totalTemplates = templates.length;
  const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
  const allTags = [...new Set(templates.flatMap((t) => t.tags))];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">UTM 模板</h1>
            <p className="text-muted-foreground">
              创建和管理可复用的 UTM 参数模板
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              导入
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              创建模板
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">模板总数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTemplates}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总使用次数</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsage}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">标签分类</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allTags.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>模板列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无模板</h3>
                <p className="text-muted-foreground text-center mb-4">
                  创建您的第一个 UTM 模板来简化链接追踪
                </p>
                <Button onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建模板
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模板名称</TableHead>
                    <TableHead>来源 (Source)</TableHead>
                    <TableHead>媒介 (Medium)</TableHead>
                    <TableHead>活动 (Campaign)</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead className="text-right">使用次数</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.utmSource}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.utmMedium}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{template.utmCampaign}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{template.usageCount}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(buildUtmUrl('https://example.com', {
                                ...formData,
                                utmSource: template.utmSource,
                                utmMedium: template.utmMedium,
                                utmCampaign: template.utmCampaign,
                                utmTerm: template.utmTerm || '',
                                utmContent: template.utmContent || '',
                              }))}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              复制 UTM 参数
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(template)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog
          open={createDialogOpen || !!editingTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingTemplate(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? '编辑 UTM 模板' : '创建 UTM 模板'}
              </DialogTitle>
              <DialogDescription>
                配置可复用的 UTM 追踪参数
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">基本信息</TabsTrigger>
                <TabsTrigger value="preview">预览</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">模板名称 *</Label>
                    <Input
                      id="name"
                      placeholder="例如: Google 广告"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">描述</Label>
                    <Input
                      id="description"
                      placeholder="模板用途说明"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="utmSource">
                      <Target className="inline h-4 w-4 mr-1" />
                      来源 (utm_source) *
                    </Label>
                    <Input
                      id="utmSource"
                      placeholder="google"
                      value={formData.utmSource}
                      onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                      list="source-presets"
                    />
                    <datalist id="source-presets">
                      {UTM_PRESETS.sources.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmMedium">
                      <Radio className="inline h-4 w-4 mr-1" />
                      媒介 (utm_medium) *
                    </Label>
                    <Input
                      id="utmMedium"
                      placeholder="cpc"
                      value={formData.utmMedium}
                      onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                      list="medium-presets"
                    />
                    <datalist id="medium-presets">
                      {UTM_PRESETS.mediums.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmCampaign">
                      <Hash className="inline h-4 w-4 mr-1" />
                      活动 (utm_campaign) *
                    </Label>
                    <Input
                      id="utmCampaign"
                      placeholder="spring_sale"
                      value={formData.utmCampaign}
                      onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="utmTerm">关键词 (utm_term)</Label>
                    <Input
                      id="utmTerm"
                      placeholder="running+shoes"
                      value={formData.utmTerm}
                      onChange={(e) => setFormData({ ...formData, utmTerm: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utmContent">内容 (utm_content)</Label>
                    <Input
                      id="utmContent"
                      placeholder="banner_top"
                      value={formData.utmContent}
                      onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>标签</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加标签"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      添加
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="space-y-2">
                  <Label>测试 URL</Label>
                  <Input
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>生成的完整 URL</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-sm break-all">
                      {buildUtmUrl(previewUrl, formData)}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(buildUtmUrl(previewUrl, formData))}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    复制 URL
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>参数预览</Label>
                  <div className="grid gap-2 text-sm">
                    {formData.utmSource && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">utm_source</span>
                        <span className="font-mono">{formData.utmSource}</span>
                      </div>
                    )}
                    {formData.utmMedium && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">utm_medium</span>
                        <span className="font-mono">{formData.utmMedium}</span>
                      </div>
                    )}
                    {formData.utmCampaign && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">utm_campaign</span>
                        <span className="font-mono">{formData.utmCampaign}</span>
                      </div>
                    )}
                    {formData.utmTerm && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">utm_term</span>
                        <span className="font-mono">{formData.utmTerm}</span>
                      </div>
                    )}
                    {formData.utmContent && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">utm_content</span>
                        <span className="font-mono">{formData.utmContent}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {editingTemplate ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除模板 "{templateToDelete?.name}" 吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default UtmTemplatesPage;
