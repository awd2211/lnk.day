import { useState } from 'react';
import { Trash2, Tag, FolderInput, Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BulkOperationsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => Promise<void>;
  onAddTags: (tags: string[]) => Promise<void>;
  onExport: () => void;
  isOperating?: boolean;
}

export function BulkOperationsBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onAddTags,
  onExport,
  isOperating,
}: BulkOperationsBarProps) {
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');

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
    if (confirm(`确定要删除 ${selectedCount} 个链接吗？此操作不可撤销。`)) {
      await onDelete();
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

          <Button variant="outline" size="sm" onClick={onExport} disabled={isOperating}>
            <Download className="mr-1 h-4 w-4" />
            导出
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
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
    </>
  );
}
