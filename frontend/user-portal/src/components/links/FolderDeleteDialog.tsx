import { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Trash2,
  Link,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  useFolders,
  useDeleteFolder,
  Folder,
  FOLDER_COLORS,
} from '@/hooks/useFolders';

interface FolderDeleteDialogProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FolderDeleteDialog({
  folder,
  open,
  onOpenChange,
  onSuccess,
}: FolderDeleteDialogProps) {
  const { toast } = useToast();
  const { data: folders } = useFolders();
  const deleteFolder = useDeleteFolder();

  const [deleteAction, setDeleteAction] = useState<'transfer' | 'confirm'>('transfer');
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [confirmFolderName, setConfirmFolderName] = useState('');

  // 重置状态
  useEffect(() => {
    if (open) {
      setDeleteAction('transfer');
      setTransferTargetId('');
      setConfirmFolderName('');
    }
  }, [open]);

  // 获取可转移到的文件夹列表（排除当前要删除的文件夹）
  const availableFolders = useMemo(() => {
    if (!folders || !folder) return [];
    return folders.filter(f => f.id !== folder.id);
  }, [folders, folder]);

  const hasLinks = folder ? (folder.linkCount || 0) > 0 : false;

  const handleDelete = () => {
    if (!folder) return;

    // 如果有链接且选择转移但没选择目标文件夹
    if (hasLinks && deleteAction === 'transfer' && !transferTargetId) {
      toast({ title: '请选择要转移到的文件夹', variant: 'destructive' });
      return;
    }

    // 如果有链接且选择确认删除但名称不匹配
    if (hasLinks && deleteAction === 'confirm' && confirmFolderName !== folder.name) {
      toast({ title: '文件夹名称不匹配', variant: 'destructive' });
      return;
    }

    // 确定转移目标：如果选择转移则使用目标文件夹ID，否则使用 null（链接变为未分类）
    const transferToFolderId = hasLinks
      ? (deleteAction === 'transfer' ? transferTargetId : null)
      : undefined;

    deleteFolder.mutate({ id: folder.id, transferToFolderId }, {
      onSuccess: () => {
        toast({ title: '文件夹已删除' });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: () => {
        toast({ title: '删除失败', variant: 'destructive' });
      },
    });
  };

  const isDeleteDisabled =
    deleteFolder.isPending ||
    (hasLinks && deleteAction === 'transfer' && !transferTargetId) ||
    (hasLinks && deleteAction === 'confirm' && confirmFolderName !== folder?.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            删除文件夹
          </DialogTitle>
          <DialogDescription>
            您即将删除文件夹 "<span className="font-medium text-foreground">{folder?.name}</span>"
          </DialogDescription>
        </DialogHeader>

        {/* 如果文件夹有链接，显示选项 */}
        {hasLinks ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Link className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                该文件夹包含 <strong>{folder?.linkCount}</strong> 个链接
              </span>
            </div>

            <div className="space-y-3">
              <Label>请选择如何处理这些链接：</Label>
              <RadioGroup
                value={deleteAction}
                onValueChange={(value) => setDeleteAction(value as 'transfer' | 'confirm')}
                className="space-y-3"
              >
                <div
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setDeleteAction('transfer')}
                >
                  <RadioGroupItem value="transfer" id="sidebar-transfer" className="mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="sidebar-transfer" className="font-medium cursor-pointer flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      转移到其他文件夹
                    </Label>
                    {deleteAction === 'transfer' && (
                      <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择目标文件夹" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFolders.map((f) => {
                            const colorObj = FOLDER_COLORS.find(c => c.value === f.color);
                            return (
                              <SelectItem key={f.id} value={f.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: f.color || '#6b7280' }}
                                  />
                                  {f.name}
                                  <span className="text-muted-foreground">({f.linkCount || 0})</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setDeleteAction('confirm')}
                >
                  <RadioGroupItem value="confirm" id="sidebar-confirm" className="mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="sidebar-confirm" className="font-medium cursor-pointer flex items-center gap-2 text-red-600">
                      <Trash2 className="h-4 w-4" />
                      直接删除（链接变为未分类）
                    </Label>
                    {deleteAction === 'confirm' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          请输入文件夹名称 "<strong>{folder?.name}</strong>" 以确认删除
                        </p>
                        <Input
                          value={confirmFolderName}
                          onChange={(e) => setConfirmFolderName(e.target.value)}
                          placeholder="输入文件夹名称"
                          className={confirmFolderName === folder?.name ? 'border-green-500' : ''}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            该文件夹是空的，可以直接删除。此操作无法撤销。
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleteDisabled}
          >
            {deleteFolder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
