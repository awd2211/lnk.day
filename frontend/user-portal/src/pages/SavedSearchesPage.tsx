import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useSavedSearches,
  useCreateSavedSearch,
  useUpdateSavedSearch,
  useDeleteSavedSearch,
  useApplySavedSearch,
  useSetDefaultSearch,
  useDuplicateSavedSearch,
  SavedSearch,
  SearchFilter,
} from '@/hooks/useSavedSearches';
import { EmptyState } from '@/components/EmptyState';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Star,
  Play,
  Filter,
  Loader2,
  Clock,
  Users,
  SortAsc,
  X,
} from 'lucide-react';

const filterFields = [
  { value: 'title', label: '标题' },
  { value: 'destination', label: '目标URL' },
  { value: 'shortCode', label: '短码' },
  { value: 'tags', label: '标签' },
  { value: 'folderId', label: '文件夹' },
  { value: 'clicks', label: '点击数' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'status', label: '状态' },
];

const operatorOptions: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'contains', label: '包含' },
  ],
  number: [
    { value: 'eq', label: '等于' },
    { value: 'gt', label: '大于' },
    { value: 'lt', label: '小于' },
    { value: 'gte', label: '大于等于' },
    { value: 'lte', label: '小于等于' },
    { value: 'between', label: '介于' },
  ],
  array: [
    { value: 'in', label: '包含任一' },
    { value: 'eq', label: '等于' },
  ],
};

function getOperators(field: string) {
  if (['clicks'].includes(field)) return operatorOptions.number;
  if (['tags'].includes(field)) return operatorOptions.array;
  return operatorOptions.string;
}

function FilterBuilder({
  filters,
  onChange,
}: {
  filters: SearchFilter[];
  onChange: (filters: SearchFilter[]) => void;
}) {
  const addFilter = () => {
    onChange([...filters, { field: 'title', operator: 'contains', value: '' }]);
  };

  const updateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {filters.map((filter, index) => (
        <div key={index} className="flex gap-2 items-start">
          <Select
            value={filter.field}
            onValueChange={(value) => updateFilter(index, { field: value })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterFields.map((field) => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.operator}
            onValueChange={(value) => updateFilter(index, { operator: value as any })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getOperators(filter.field).map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="flex-1"
            placeholder="输入值"
            value={String(filter.value)}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
          />

          <Button variant="ghost" size="icon" onClick={() => removeFilter(index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addFilter}>
        <Plus className="h-4 w-4 mr-2" />
        添加筛选条件
      </Button>
    </div>
  );
}

function SavedSearchCard({
  search,
  onEdit,
  onDelete,
  onApply,
  onSetDefault,
  onDuplicate,
}: {
  search: SavedSearch;
  onEdit: () => void;
  onDelete: () => void;
  onApply: () => void;
  onSetDefault: () => void;
  onDuplicate: () => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{search.name}</h3>
              {search.isDefault && (
                <Badge variant="default" className="bg-yellow-500">
                  <Star className="h-3 w-3 mr-1" />
                  默认
                </Badge>
              )}
              {search.isShared && (
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  共享
                </Badge>
              )}
            </div>
            {search.description && (
              <p className="text-sm text-muted-foreground mt-1">{search.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onApply}>
                <Play className="h-4 w-4 mr-2" />
                应用搜索
              </DropdownMenuItem>
              {!search.isDefault && (
                <DropdownMenuItem onClick={onSetDefault}>
                  <Star className="h-4 w-4 mr-2" />
                  设为默认
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                复制
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {search.filters.slice(0, 3).map((filter, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {filterFields.find(f => f.value === filter.field)?.label || filter.field}
              </Badge>
            ))}
            {search.filters.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{search.filters.length - 3} 更多
              </Badge>
            )}
          </div>

          {search.sortBy && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <SortAsc className="h-3 w-3" />
              按 {filterFields.find(f => f.value === search.sortBy)?.label || search.sortBy}
              {search.sortOrder === 'desc' ? ' 降序' : ' 升序'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span>使用 {search.useCount} 次</span>
          {search.lastUsedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              最后使用 {new Date(search.lastUsedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SavedSearchesPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [deletingSearch, setDeletingSearch] = useState<SavedSearch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    filters: [] as SearchFilter[],
    sortBy: '',
    sortOrder: 'asc' as 'asc' | 'desc',
    isShared: false,
  });

  const { data: searches, isLoading } = useSavedSearches();
  const createSearch = useCreateSavedSearch();
  const updateSearch = useUpdateSavedSearch();
  const deleteSearch = useDeleteSavedSearch();
  const applySearch = useApplySavedSearch();
  const setDefaultSearch = useSetDefaultSearch();
  const duplicateSearch = useDuplicateSavedSearch();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      filters: [],
      sortBy: '',
      sortOrder: 'asc',
      isShared: false,
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入搜索名称', variant: 'destructive' });
      return;
    }
    if (formData.filters.length === 0) {
      toast({ title: '请至少添加一个筛选条件', variant: 'destructive' });
      return;
    }

    createSearch.mutate(formData, {
      onSuccess: () => {
        toast({ title: '搜索已保存' });
        setIsCreateOpen(false);
        resetForm();
      },
    });
  };

  const handleEdit = () => {
    if (!editingSearch || !formData.name.trim()) return;

    updateSearch.mutate({
      id: editingSearch.id,
      data: formData,
    }, {
      onSuccess: () => {
        toast({ title: '搜索已更新' });
        setEditingSearch(null);
        resetForm();
      },
    });
  };

  const handleDelete = () => {
    if (!deletingSearch) return;

    deleteSearch.mutate(deletingSearch.id, {
      onSuccess: () => {
        toast({ title: '搜索已删除' });
        setDeletingSearch(null);
      },
    });
  };

  const handleApply = (search: SavedSearch) => {
    applySearch.mutate(search.id, {
      onSuccess: () => {
        window.location.href = `/links?savedSearch=${search.id}`;
      },
    });
  };

  const handleSetDefault = (search: SavedSearch) => {
    setDefaultSearch.mutate(search.id, {
      onSuccess: () => {
        toast({ title: '已设为默认搜索' });
      },
    });
  };

  const handleDuplicate = (search: SavedSearch) => {
    duplicateSearch.mutate(search.id, {
      onSuccess: () => {
        toast({ title: '搜索已复制' });
      },
    });
  };

  const openEditDialog = (search: SavedSearch) => {
    setFormData({
      name: search.name,
      description: search.description || '',
      filters: search.filters,
      sortBy: search.sortBy || '',
      sortOrder: search.sortOrder || 'asc',
      isShared: search.isShared,
    });
    setEditingSearch(search);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">保存的搜索</h1>
            <p className="text-muted-foreground mt-1">保存常用的搜索条件以便快速访问</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                保存新搜索
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>保存搜索</DialogTitle>
                <DialogDescription>创建一个可重复使用的搜索条件</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名称</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：本周热门链接"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>共享设置</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        checked={formData.isShared}
                        onCheckedChange={(checked) => setFormData({ ...formData, isShared: checked })}
                      />
                      <span className="text-sm text-muted-foreground">与团队成员共享</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述（可选）</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述这个搜索的用途"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>筛选条件</Label>
                  <FilterBuilder
                    filters={formData.filters}
                    onChange={(filters) => setFormData({ ...formData, filters })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>排序字段</Label>
                    <Select
                      value={formData.sortBy}
                      onValueChange={(value) => setFormData({ ...formData, sortBy: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择排序字段" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">不排序</SelectItem>
                        {filterFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>排序方向</Label>
                    <Select
                      value={formData.sortOrder}
                      onValueChange={(value) => setFormData({ ...formData, sortOrder: value as 'asc' | 'desc' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">升序</SelectItem>
                        <SelectItem value="desc">降序</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createSearch.isPending}>
                  {createSearch.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {searches?.length === 0 ? (
          <EmptyState
            icon={Search}
            title="还没有保存的搜索"
            description="保存常用的搜索条件以便快速访问"
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                保存第一个搜索
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {searches?.map((search) => (
              <SavedSearchCard
                key={search.id}
                search={search}
                onEdit={() => openEditDialog(search)}
                onDelete={() => setDeletingSearch(search)}
                onApply={() => handleApply(search)}
                onSetDefault={() => handleSetDefault(search)}
                onDuplicate={() => handleDuplicate(search)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editingSearch} onOpenChange={() => { setEditingSearch(null); resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑搜索</DialogTitle>
            <DialogDescription>修改保存的搜索条件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">名称</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>共享设置</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={formData.isShared}
                    onCheckedChange={(checked) => setFormData({ ...formData, isShared: checked })}
                  />
                  <span className="text-sm text-muted-foreground">与团队成员共享</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">描述（可选）</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>筛选条件</Label>
              <FilterBuilder
                filters={formData.filters}
                onChange={(filters) => setFormData({ ...formData, filters })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>排序字段</Label>
                <Select
                  value={formData.sortBy}
                  onValueChange={(value) => setFormData({ ...formData, sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择排序字段" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不排序</SelectItem>
                    {filterFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>排序方向</Label>
                <Select
                  value={formData.sortOrder}
                  onValueChange={(value) => setFormData({ ...formData, sortOrder: value as 'asc' | 'desc' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">升序</SelectItem>
                    <SelectItem value="desc">降序</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSearch(null)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={updateSearch.isPending}>
              {updateSearch.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingSearch} onOpenChange={() => setDeletingSearch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除搜索？</AlertDialogTitle>
            <AlertDialogDescription>
              删除 "{deletingSearch?.name}" 后将无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
