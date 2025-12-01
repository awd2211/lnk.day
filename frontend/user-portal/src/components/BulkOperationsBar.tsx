import { useState } from 'react';
import { Trash2, Tag, FolderInput, Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export interface FolderOption {
  id: string;
  name: string;
}

interface BulkOperationsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => Promise<void>;
  onAddTags: (tags: string[]) => Promise<void>;
  onMoveToFolder?: (folderId: string | null) => Promise<void>;
  onExport: () => void;
  isOperating?: boolean;
  folders?: FolderOption[];
}

export function BulkOperationsBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onAddTags,
  onMoveToFolder,
  onExport,
  isOperating,
  folders = [],
}: BulkOperationsBarProps) {
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAddTags = async () => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 0) {
      await onAddTags(tags);
      setTagInput('');
      setShowTagDialog(false);
    }
  };

  const handleDelete = async () => {
    await onDelete();
    setShowDeleteConfirm(false);
  };

  const handleMoveToFolder = async () => {
    if (onMoveToFolder) {
      await onMoveToFolder(selectedFolderId);
      setSelectedFolderId(null);
      setShowFolderDialog(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">已选择 {selectedCount} 个链接</span>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7">
            <X className="mr-1 h-3 w-3" />
            取消选择
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagDialog(true)}
            disabled={isOperating}
          >
            <Tag className="mr-1 h-4 w-4" />
            添加标签
          </Button>

          {onMoveToFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFolderDialog(true)}
              disabled={isOperating}
            >
              <FolderInput className="mr-1 h-4 w-4" />
              移动到文件夹
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onExport} disabled={isOperating}>
            <Download className="mr-1 h-4 w-4" />
            导出
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isOperating}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量添加标签</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="tags">标签（多个标签用逗号分隔）</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="例如：marketing, social, campaign"
              className="mt-1"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              将为所选的 {selectedCount} 个链接添加这些标签
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddTags} disabled={!tagInput.trim() || isOperating}>
              {isOperating ? '处理中...' : '添加标签'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移动到文件夹</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder">选择目标文件夹</Label>
            <Select
              value={selectedFolderId ?? 'root'}
              onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择文件夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">根目录（无文件夹）</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              将把所选的 {selectedCount} 个链接移动到此文件夹
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              取消
            </Button>
            <Button onClick={handleMoveToFolder} disabled={isOperating}>
              {isOperating ? '处理中...' : '移动'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="批量删除链接"
        description={`确定要删除 ${selectedCount} 个链接吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
        isLoading={isOperating}
        variant="destructive"
      />
    </>
  );
}
