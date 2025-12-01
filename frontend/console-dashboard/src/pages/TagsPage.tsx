import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tag,
  Search,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  TrendingUp,
  Hash,
  Palette,
} from 'lucide-react';
import { api } from '@/lib/api';

interface PlatformTag {
  id: string;
  name: string;
  color: string;
  category: string;
  description?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TagStats {
  totalTags: number;
  totalUsage: number;
  categoriesCount: number;
  recentlyCreated: number;
}

const tagCategories = [
  { value: 'marketing', label: '营销' },
  { value: 'product', label: '产品' },
  { value: 'campaign', label: '活动' },
  { value: 'channel', label: '渠道' },
  { value: 'region', label: '地区' },
  { value: 'other', label: '其他' },
];

const tagColors = [
  { value: '#3b82f6', label: '蓝色' },
  { value: '#ef4444', label: '红色' },
  { value: '#22c55e', label: '绿色' },
  { value: '#f59e0b', label: '橙色' },
  { value: '#8b5cf6', label: '紫色' },
  { value: '#ec4899', label: '粉色' },
  { value: '#06b6d4', label: '青色' },
  { value: '#6b7280', label: '灰色' },
];

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<PlatformTag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    category: 'marketing',
    description: '',
  });

  const { data: stats } = useQuery<TagStats>({
    queryKey: ['tags', 'stats'],
    queryFn: () => api.get('/proxy/tags/stats').then((r) => r.data),
  });

  const { data: popularTags } = useQuery<PlatformTag[]>({
    queryKey: ['tags', 'popular'],
    queryFn: () => api.get('/proxy/tags/popular?limit=10').then((r) => r.data),
  });

  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['tags', page, search, category],
    queryFn: () =>
      api
        .get('/proxy/tags', {
          params: {
            page,
            limit: 15,
            search: search || undefined,
            category: category !== 'all' ? category : undefined,
          },
        })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/proxy/tags', data),
    onSuccess: () => {
      toast.success('标签创建成功');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      api.put(`/proxy/tags/${id}`, data),
    onSuccess: () => {
      toast.success('标签更新成功');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setIsEditDialogOpen(false);
      setSelectedTag(null);
      resetForm();
    },
    onError: () => toast.error('更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proxy/tags/${id}`),
    onSuccess: () => {
      toast.success('标签删除成功');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: () => toast.error('删除失败'),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3b82f6',
      category: 'marketing',
      description: '',
    });
  };

  const handleEdit = (tag: PlatformTag) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      category: tag.category,
      description: tag.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const tags = tagsData?.data || [];
  const total = tagsData?.total || 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总标签数</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTags || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总使用次数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsage?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分类数量</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.categoriesCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">近期新增</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentlyCreated || 0}</div>
            <p className="text-xs text-muted-foreground">最近 7 天</p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Tags */}
      {popularTags && popularTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              热门标签
            </CardTitle>
            <CardDescription>使用频率最高的标签</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => handleEdit(tag)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <span className="ml-2 text-muted-foreground">({tag.usageCount})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>标签管理</CardTitle>
              <CardDescription>管理平台全局标签</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建标签
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索标签..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {tagCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签名称</TableHead>
                  <TableHead>颜色</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>使用次数</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无标签
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag: PlatformTag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm text-muted-foreground">{tag.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tagCategories.find((c) => c.value === tag.category)?.label || tag.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{tag.usageCount?.toLocaleString() || 0}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tag.description || '-'}
                      </TableCell>
                      <TableCell>{new Date(tag.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tag)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('确定删除此标签？')) {
                                deleteMutation.mutate(tag.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {total} 条记录
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建标签</DialogTitle>
            <DialogDescription>创建一个新的平台标签</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标签名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入标签名称"
              />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.color}
                  onValueChange={(v) => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: formData.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {tagColors.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
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
                  {tagCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入标签描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>修改标签信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标签名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入标签名称"
              />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <Select
                value={formData.color}
                onValueChange={(v) => setFormData({ ...formData, color: v })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: formData.color }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {tagColors.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
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
                  {tagCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入标签描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() =>
                selectedTag && updateMutation.mutate({ id: selectedTag.id, data: formData })
              }
              disabled={!formData.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
