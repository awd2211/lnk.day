import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tags,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Link2,
  Palette,
  Hash,
  Filter,
  ArrowUpDown,
  CheckCircle,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}

const TAG_COLORS = [
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '黄色', value: '#eab308' },
  { name: '绿色', value: '#22c55e' },
  { name: '青色', value: '#06b6d4' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '粉色', value: '#ec4899' },
  { name: '灰色', value: '#6b7280' },
];

function TagsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'linkCount' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  // Fetch tags
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['tags', searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      const response = await api.get('/api/v1/tags', {
        params: {
          search: searchQuery || undefined,
          sortBy,
          sortOrder,
        },
      });
      return response.data;
    },
  });

  const tags: Tag[] = tagsData?.data || [];

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/api/v1/tags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: '成功', description: '标签创建成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '标签创建失败', variant: 'destructive' });
    },
  });

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/api/v1/tags/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setEditingTag(null);
      resetForm();
      toast({ title: '成功', description: '标签更新成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '标签更新失败', variant: 'destructive' });
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setDeleteDialogOpen(false);
      setTagToDelete(null);
      toast({ title: '成功', description: '标签删除成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '标签删除失败', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#3b82f6' });
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
    });
    setEditingTag(tag);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入标签名称', variant: 'destructive' });
      return;
    }

    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, data: formData });
    } else {
      createTagMutation.mutate(formData);
    }
  };

  const handleDelete = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tagToDelete) {
      deleteTagMutation.mutate(tagToDelete.id);
    }
  };

  // Stats
  const totalTags = tags.length;
  const totalLinksTagged = tags.reduce((sum, tag) => sum + tag.linkCount, 0);
  const mostUsedTag = tags.reduce((max, tag) => tag.linkCount > (max?.linkCount || 0) ? tag : max, tags[0]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">标签管理</h1>
            <p className="text-muted-foreground">
              使用标签来组织和分类您的链接
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            创建标签
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">标签总数</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTags}</div>
              <p className="text-xs text-muted-foreground">
                用于分类链接
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已标记链接</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLinksTagged}</div>
              <p className="text-xs text-muted-foreground">
                链接标签关联数
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">热门标签</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mostUsedTag ? (
                  <Badge
                    style={{ backgroundColor: mostUsedTag.color }}
                    className="text-white"
                  >
                    {mostUsedTag.name}
                  </Badge>
                ) : (
                  '-'
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {mostUsedTag ? `${mostUsedTag.linkCount} 个链接` : '暂无数据'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">名称</SelectItem>
                    <SelectItem value="linkCount">链接数</SelectItem>
                    <SelectItem value="createdAt">创建时间</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-24 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tags className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无标签</h3>
              <p className="text-muted-foreground text-center mb-4">
                创建标签来更好地组织您的链接
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                创建第一个标签
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tags.map((tag) => (
              <Card key={tag.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <CardTitle className="text-lg">{tag.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(tag)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(tag)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {tag.description && (
                    <CardDescription className="line-clamp-2">
                      {tag.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <Link2 className="inline h-4 w-4 mr-1" />
                      {tag.linkCount} 个链接
                    </span>
                    <Badge variant="outline" className="text-xs">
                      #{tag.slug}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog
          open={createDialogOpen || !!editingTag}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingTag(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTag ? '编辑标签' : '创建标签'}
              </DialogTitle>
              <DialogDescription>
                {editingTag ? '修改标签信息' : '创建一个新标签来组织您的链接'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">标签名称</Label>
                <Input
                  id="name"
                  placeholder="例如: 营销活动"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述 (可选)</Label>
                <Textarea
                  id="description"
                  placeholder="标签的用途说明..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>标签颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-primary scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-8 p-0 border-0"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
              {/* Preview */}
              <div className="space-y-2">
                <Label>预览</Label>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <Badge
                    style={{ backgroundColor: formData.color }}
                    className="text-white"
                  >
                    {formData.name || '标签名称'}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingTag(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTagMutation.isPending || updateTagMutation.isPending}
              >
                {createTagMutation.isPending || updateTagMutation.isPending
                  ? '保存中...'
                  : editingTag
                  ? '保存'
                  : '创建'}
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
                确定要删除标签 "{tagToDelete?.name}" 吗？此操作无法撤销。
                {tagToDelete && tagToDelete.linkCount > 0 && (
                  <span className="block mt-2 text-destructive">
                    注意：该标签关联了 {tagToDelete.linkCount} 个链接，删除后这些链接将失去此标签。
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteTagMutation.isPending}
              >
                {deleteTagMutation.isPending ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default TagsPage;
