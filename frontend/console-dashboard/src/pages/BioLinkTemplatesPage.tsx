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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Layout,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Palette,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Briefcase,
  UtensilsCrossed,
  GraduationCap,
  ShoppingBag,
  Music,
  Dumbbell,
  Image,
  Heart,
  Stethoscope,
  Star,
  Copy,
} from 'lucide-react';
import { templatesService } from '@/lib/api';
import { toast } from 'sonner';

interface BioLinkTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  theme: {
    backgroundColor?: string;
    textColor?: string;
    buttonStyle?: string;
    fontFamily?: string;
    accentColor?: string;
  };
  defaultBlocks: any[];
  thumbnailUrl: string;
  isActive: boolean;
  usageCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const industries = [
  { value: 'influencer', label: '网红/博主', icon: Star },
  { value: 'business', label: '商业/企业', icon: Briefcase },
  { value: 'restaurant', label: '餐饮', icon: UtensilsCrossed },
  { value: 'education', label: '教育', icon: GraduationCap },
  { value: 'ecommerce', label: '电商', icon: ShoppingBag },
  { value: 'music', label: '音乐/艺术', icon: Music },
  { value: 'fitness', label: '健身/运动', icon: Dumbbell },
  { value: 'portfolio', label: '作品集', icon: Image },
  { value: 'nonprofit', label: '非营利', icon: Heart },
  { value: 'healthcare', label: '医疗健康', icon: Stethoscope },
];

const categories = [
  { value: 'theme', label: '主题风格' },
  { value: 'layout', label: '布局样式' },
  { value: 'industry', label: '行业模板' },
];

const buttonStyles = [
  { value: 'rounded', label: '圆角' },
  { value: 'pill', label: '药丸形' },
  { value: 'square', label: '方形' },
  { value: 'outline', label: '边框' },
  { value: 'shadow', label: '阴影' },
];

const fontFamilies = [
  { value: 'system', label: '系统默认' },
  { value: 'serif', label: '衬线体' },
  { value: 'sans-serif', label: '无衬线体' },
  { value: 'monospace', label: '等宽字体' },
];

export default function BioLinkTemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BioLinkTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'theme',
    industry: 'business',
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      buttonStyle: 'rounded',
      fontFamily: 'system',
      accentColor: '#3b82f6',
    },
    defaultBlocks: [] as any[],
    thumbnailUrl: '',
    isActive: true,
    sortOrder: 0,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['bio-link-templates', { page, search, industry: industryFilter, category: categoryFilter, status: statusFilter }],
    queryFn: () =>
      templatesService.getBioLinkTemplates({
        page,
        limit: 10,
        search: search || undefined,
        industry: industryFilter !== 'all' ? industryFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['bio-link-templates-stats'],
    queryFn: () => templatesService.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => templatesService.createBioLinkTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-link-templates'] });
      queryClient.invalidateQueries({ queryKey: ['bio-link-templates-stats'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Bio Link 模板创建成功');
    },
    onError: () => {
      toast.error('创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      templatesService.updateBioLinkTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-link-templates'] });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      resetForm();
      toast.success('模板更新成功');
    },
    onError: () => {
      toast.error('更新失败，请重试');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteBioLinkTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-link-templates'] });
      queryClient.invalidateQueries({ queryKey: ['bio-link-templates-stats'] });
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
      toast.success('模板删除成功');
    },
    onError: () => {
      toast.error('删除失败，请重试');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => templatesService.toggleBioLinkTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bio-link-templates'] });
      toast.success('状态已更新');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'theme',
      industry: 'business',
      theme: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        buttonStyle: 'rounded',
        fontFamily: 'system',
        accentColor: '#3b82f6',
      },
      defaultBlocks: [],
      thumbnailUrl: '',
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleEdit = (template: BioLinkTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      industry: template.industry,
      theme: {
        backgroundColor: template.theme?.backgroundColor || '#ffffff',
        textColor: template.theme?.textColor || '#000000',
        buttonStyle: template.theme?.buttonStyle || 'rounded',
        fontFamily: template.theme?.fontFamily || 'system',
        accentColor: template.theme?.accentColor || '#3b82f6',
      },
      defaultBlocks: template.defaultBlocks || [],
      thumbnailUrl: template.thumbnailUrl || '',
      isActive: template.isActive,
      sortOrder: template.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handlePreview = (template: BioLinkTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const handleDelete = (template: BioLinkTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const getIndustryIcon = (industry: string) => {
    const found = industries.find((i) => i.value === industry);
    return found?.icon || Briefcase;
  };

  const getIndustryLabel = (industry: string) => {
    return industries.find((i) => i.value === industry)?.label || industry;
  };

  const getCategoryLabel = (category: string) => {
    return categories.find((c) => c.value === category)?.label || category;
  };

  const templateList = templates?.data?.items || [];
  const totalPages = templates?.data?.pagination?.totalPages || 1;
  const bioLinkStats = stats?.data?.bioLinkTemplates || { total: 0, active: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bio Link 模板</h1>
          <p className="text-muted-foreground">管理个人主页模板预设</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建模板
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总模板数</CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bioLinkStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已启用</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bioLinkStats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">行业类型</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{industries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">模板分类</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索模板名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="行业" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部行业</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {/* Template List */}
      <Card>
        <CardHeader>
          <CardTitle>模板列表</CardTitle>
          <CardDescription>
            共 {templates?.data?.pagination?.total || 0} 个模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : templateList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layout className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">暂无模板</h3>
              <p className="text-muted-foreground">点击上方按钮创建第一个模板</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>预览</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>行业</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>主题</TableHead>
                    <TableHead>使用次数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateList.map((template: BioLinkTemplate) => {
                    const IndustryIcon = getIndustryIcon(template.industry);
                    return (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div
                            className="w-12 h-16 rounded border flex items-center justify-center"
                            style={{
                              backgroundColor: template.theme?.backgroundColor || '#f5f5f5',
                            }}
                          >
                            <div
                              className="w-8 h-2 rounded"
                              style={{
                                backgroundColor: template.theme?.accentColor || '#3b82f6',
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {template.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IndustryIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{getIndustryLabel(template.industry)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: template.theme?.backgroundColor }}
                              title="背景色"
                            />
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: template.theme?.accentColor }}
                              title="强调色"
                            />
                          </div>
                        </TableCell>
                        <TableCell>{template.usageCount || 0}</TableCell>
                        <TableCell>
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => toggleMutation.mutate(template.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePreview(template)}>
                                <Eye className="mr-2 h-4 w-4" />
                                预览
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(template)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(template.id);
                                  toast.success('ID 已复制');
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                复制 ID
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(template)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建 Bio Link 模板</DialogTitle>
            <DialogDescription>创建新的个人主页模板预设</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">模板名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：极简商务风格"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简要描述此模板的特点..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>行业</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => setFormData({ ...formData, industry: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Theme Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                主题设置
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>背景色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme.backgroundColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.theme.backgroundColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>文字色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme.textColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, textColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.theme.textColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, textColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>强调色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme.accentColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, accentColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.theme.accentColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, accentColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>按钮样式</Label>
                  <Select
                    value={formData.theme.buttonStyle}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        theme: { ...formData.theme, buttonStyle: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buttonStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>字体</Label>
                  <Select
                    value={formData.theme.fontFamily}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        theme: { ...formData.theme, fontFamily: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>缩略图 URL</Label>
              <Input
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://example.com/thumbnail.png"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>启用模板</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.name}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 Bio Link 模板</DialogTitle>
            <DialogDescription>修改模板配置</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">模板名称</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">排序</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>行业</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => setFormData({ ...formData, industry: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Theme Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                主题设置
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>背景色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme.backgroundColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.theme.backgroundColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>文字色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme.textColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, textColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.theme.textColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, textColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>强调色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme.accentColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, accentColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.theme.accentColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          theme: { ...formData.theme, accentColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>按钮样式</Label>
                  <Select
                    value={formData.theme.buttonStyle}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        theme: { ...formData.theme, buttonStyle: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buttonStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>字体</Label>
                  <Select
                    value={formData.theme.fontFamily}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        theme: { ...formData.theme, fontFamily: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>缩略图 URL</Label>
              <Input
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>启用模板</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() =>
                selectedTemplate && updateMutation.mutate({ id: selectedTemplate.id, data: formData })
              }
              disabled={!formData.name}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>模板预览</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="py-4">
              <div
                className="rounded-lg p-6 min-h-[300px] flex flex-col items-center"
                style={{
                  backgroundColor: selectedTemplate.theme?.backgroundColor || '#ffffff',
                  color: selectedTemplate.theme?.textColor || '#000000',
                  fontFamily: selectedTemplate.theme?.fontFamily || 'system-ui',
                }}
              >
                {/* Mock Bio Link Preview */}
                <div className="w-20 h-20 rounded-full bg-gray-300 mb-4" />
                <h3 className="font-bold text-lg mb-1">用户名</h3>
                <p className="text-sm opacity-70 mb-6">这里是个人简介</p>
                <div className="w-full space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-full py-3 px-4 text-center transition-colors"
                      style={{
                        backgroundColor: selectedTemplate.theme?.accentColor || '#3b82f6',
                        color: '#ffffff',
                        borderRadius:
                          selectedTemplate.theme?.buttonStyle === 'pill'
                            ? '9999px'
                            : selectedTemplate.theme?.buttonStyle === 'square'
                              ? '0px'
                              : '8px',
                        border:
                          selectedTemplate.theme?.buttonStyle === 'outline'
                            ? '2px solid currentColor'
                            : 'none',
                        boxShadow:
                          selectedTemplate.theme?.buttonStyle === 'shadow'
                            ? '0 4px 6px -1px rgba(0,0,0,0.1)'
                            : 'none',
                      }}
                    >
                      链接 {i}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">行业:</span>
                  <span>{getIndustryLabel(selectedTemplate.industry)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">分类:</span>
                  <span>{getCategoryLabel(selectedTemplate.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">使用次数:</span>
                  <span>{selectedTemplate.usageCount || 0}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除模板 "{selectedTemplate?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
