import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder, Folder } from '@/hooks/useFolders';
import { EmptyState } from '@/components/EmptyState';
import {
  Folder as FolderIcon,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Link,
  ExternalLink,
  Loader2,
  Search,
  FolderOpen,
  ChevronRight,
  Star,
  StarOff,
} from 'lucide-react';

const colorOptions = [
  { value: 'gray', label: '灰色', class: 'bg-gray-500' },
  { value: 'red', label: '红色', class: 'bg-red-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'yellow', label: '黄色', class: 'bg-yellow-500' },
  { value: 'green', label: '绿色', class: 'bg-green-500' },
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
];

function FolderCard({
  folder,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  folder: Folder;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const colorClass = colorOptions.find(c => c.value === folder.color)?.class || 'bg-gray-500';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${colorClass} text-white`}>
              <FolderIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{folder.name}</h3>
                {folder.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              </div>
              {folder.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{folder.description}</p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.location.href = `/links?folder=${folder.id}`}>
                <FolderOpen className="h-4 w-4 mr-2" />
                查看链接
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                {folder.isFavorite ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    取消收藏
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    添加收藏
                  </>
                )}
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

        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link className="h-4 w-4" />
            <span>{folder.linkCount || 0} 个链接</span>
          </div>
          <div className="text-sm text-muted-foreground">
            更新于 {new Date(folder.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FoldersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'gray',
  });

  const { data: folders, isLoading } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const filteredFolders = folders?.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteFolders = filteredFolders?.filter(f => f.isFavorite);
  const regularFolders = filteredFolders?.filter(f => !f.isFavorite);

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入文件夹名称', variant: 'destructive' });
      return;
    }

    createFolder.mutate(formData, {
      onSuccess: () => {
        toast({ title: '文件夹已创建' });
        setIsCreateOpen(false);
        setFormData({ name: '', description: '', color: 'gray' });
      },
    });
  };

  const handleEdit = () => {
    if (!editingFolder || !formData.name.trim()) return;

    updateFolder.mutate({
      id: editingFolder.id,
      data: formData,
    }, {
      onSuccess: () => {
        toast({ title: '文件夹已更新' });
        setEditingFolder(null);
        setFormData({ name: '', description: '', color: 'gray' });
      },
    });
  };

  const handleDelete = () => {
    if (!deletingFolder) return;

    deleteFolder.mutate(deletingFolder.id, {
      onSuccess: () => {
        toast({ title: '文件夹已删除' });
        setDeletingFolder(null);
      },
    });
  };

  const handleToggleFavorite = (folder: Folder) => {
    updateFolder.mutate({
      id: folder.id,
      data: { isFavorite: !folder.isFavorite },
    }, {
      onSuccess: () => {
        toast({ title: folder.isFavorite ? '已取消收藏' : '已添加收藏' });
      },
    });
  };

  const openEditDialog = (folder: Folder) => {
    setFormData({
      name: folder.name,
      description: folder.description || '',
      color: folder.color || 'gray',
    });
    setEditingFolder(folder);
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
            <h1 className="text-3xl font-bold">文件夹管理</h1>
            <p className="text-muted-foreground mt-1">使用文件夹整理您的短链接</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="h-4 w-4 mr-2" />
                新建文件夹
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建文件夹</DialogTitle>
                <DialogDescription>创建一个新文件夹来整理您的链接</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入文件夹名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述（可选）</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入文件夹描述"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>颜色</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-8 h-8 rounded-full ${color.class} ${
                          formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createFolder.isPending}>
                  {createFolder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索文件夹..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {folders?.length === 0 ? (
          <EmptyState
            icon={FolderIcon}
            title="还没有文件夹"
            description="创建文件夹来整理您的短链接"
            action={{
              label: '创建第一个文件夹',
              onClick: () => setIsCreateOpen(true),
              icon: FolderPlus,
            }}
          />
        ) : (
          <div className="space-y-8">
            {/* 收藏的文件夹 */}
            {favoriteFolders && favoriteFolders.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  收藏
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {favoriteFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onEdit={() => openEditDialog(folder)}
                      onDelete={() => setDeletingFolder(folder)}
                      onToggleFavorite={() => handleToggleFavorite(folder)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 所有文件夹 */}
            {regularFolders && regularFolders.length > 0 && (
              <div className="space-y-4">
                {favoriteFolders && favoriteFolders.length > 0 && (
                  <h2 className="text-lg font-semibold">所有文件夹</h2>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {regularFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onEdit={() => openEditDialog(folder)}
                      onDelete={() => setDeletingFolder(folder)}
                      onToggleFavorite={() => handleToggleFavorite(folder)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredFolders?.length === 0 && searchQuery && (
              <EmptyState
                icon={Search}
                title="未找到匹配的文件夹"
                description={`没有找到包含 "${searchQuery}" 的文件夹`}
              />
            )}
          </div>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑文件夹</DialogTitle>
            <DialogDescription>修改文件夹信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入文件夹名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述（可选）</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入文件夹描述"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFolder(null)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={updateFolder.isPending}>
              {updateFolder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除文件夹？</AlertDialogTitle>
            <AlertDialogDescription>
              删除文件夹 "{deletingFolder?.name}" 后，其中的链接不会被删除，但会移出该文件夹。此操作无法撤销。
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
