import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  Folder as FolderType,
  FOLDER_COLORS,
} from '@/hooks/useFolders';

interface FolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  className?: string;
}

export function FolderSidebar({
  selectedFolderId,
  onSelectFolder,
  className,
}: FolderSidebarProps) {
  const { toast } = useToast();
  const { data: folders, isLoading } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6b7280' });

  const handleCreateFolder = async () => {
    if (!formData.name.trim()) return;

    try {
      await createFolder.mutateAsync({
        name: formData.name.trim(),
        color: formData.color,
      });
      setFormData({ name: '', color: '#6b7280' });
      setIsCreateDialogOpen(false);
      toast({ title: '文件夹创建成功' });
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !formData.name.trim()) return;

    try {
      await updateFolder.mutateAsync({
        id: editingFolder.id,
        data: {
          name: formData.name.trim(),
          color: formData.color,
        },
      });
      setEditingFolder(null);
      toast({ title: '文件夹更新成功' });
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folder: FolderType) => {
    if (!confirm(`确定要删除文件夹 "${folder.name}" 吗？\n链接不会被删除，只会移出文件夹。`)) {
      return;
    }

    try {
      await deleteFolder.mutateAsync(folder.id);
      if (selectedFolderId === folder.id) {
        onSelectFolder(null);
      }
      toast({ title: '文件夹已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const openEditDialog = (folder: FolderType) => {
    setFormData({ name: folder.name, color: folder.color || '#6b7280' });
    setEditingFolder(folder);
  };

  const totalLinks = folders?.reduce((sum, f) => sum + (f.linkCount || 0), 0) || 0;

  return (
    <div className={cn('flex h-full flex-col border-r bg-muted/30', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold text-sm">文件夹</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setFormData({ name: '', color: '#6b7280' });
            setIsCreateDialogOpen(true);
          }}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All Links */}
        <button
          onClick={() => onSelectFolder(null)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            selectedFolderId === null
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          <Link2 className="h-4 w-4" />
          <span className="flex-1 text-left">所有链接</span>
          <span className="text-xs opacity-70">{totalLinks}</span>
        </button>

        {/* Divider */}
        <div className="my-2 border-t" />

        {/* Folders */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : folders && folders.length > 0 ? (
          <div className="space-y-1">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={cn(
                  'group flex items-center gap-2 rounded-md pr-1 transition-colors',
                  selectedFolderId === folder.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex flex-1 items-center gap-2 px-3 py-2 text-sm"
                >
                  {selectedFolderId === folder.id ? (
                    <FolderOpen
                      className="h-4 w-4"
                      style={{ color: folder.color || undefined }}
                    />
                  ) : (
                    <Folder
                      className="h-4 w-4"
                      style={{ color: folder.color || undefined }}
                    />
                  )}
                  <span className="flex-1 truncate text-left">{folder.name}</span>
                  <span className="text-xs opacity-70">{folder.linkCount || 0}</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100',
                        selectedFolderId === folder.id && 'opacity-100'
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteFolder(folder)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            暂无文件夹
          </p>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="folder-name">名称</Label>
              <Input
                id="folder-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入文件夹名称"
                className="mt-1"
              />
            </div>
            <div>
              <Label>颜色</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      formData.color === color.value
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!formData.name.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-folder-name">名称</Label>
              <Input
                id="edit-folder-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入文件夹名称"
                className="mt-1"
              />
            </div>
            <div>
              <Label>颜色</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      formData.color === color.value
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFolder(null)}>
              取消
            </Button>
            <Button
              onClick={handleUpdateFolder}
              disabled={!formData.name.trim() || updateFolder.isPending}
            >
              {updateFolder.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
