import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { exportData, ExportColumn } from '@/lib/export';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: any[];
  columns: ExportColumn[];
  defaultFilename: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  title,
  description,
  data,
  columns,
  defaultFilename,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.map((c) => c.key)
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(columns.map((c) => c.key));
    }
  };

  const handleExport = () => {
    if (selectedColumns.length === 0) return;

    setIsExporting(true);
    try {
      const filteredColumns = columns.filter((c) =>
        selectedColumns.includes(c.key)
      );
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${defaultFilename}_${timestamp}`;

      exportData({
        filename,
        columns: filteredColumns,
        data,
        format,
      });

      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>导出格式</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">CSV</p>
                  <p className="text-xs text-gray-500">适用于 Excel</p>
                </div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  format === 'json'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileJson className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">JSON</p>
                  <p className="text-xs text-gray-500">适用于开发</p>
                </div>
              </button>
            </div>
          </div>

          {/* Column Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>选择导出字段</Label>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedColumns.length === columns.length ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                >
                  <Checkbox
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => handleToggleColumn(col.key)}
                  />
                  <span className="text-sm">{col.header}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">导出数据量</span>
              <span className="font-medium">{data.length} 条记录</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-gray-500">选择字段</span>
              <span className="font-medium">
                {selectedColumns.length} / {columns.length} 个
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.length === 0 || isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? '导出中...' : '导出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple export button with dialog
 */
interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ExportButton({
  data,
  columns,
  filename,
  title = '导出数据',
  description = '选择导出格式和字段',
  variant = 'outline',
  size = 'default',
  className,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        disabled={data.length === 0}
      >
        <Download className="mr-2 h-4 w-4" />
        导出
      </Button>
      <ExportDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        data={data}
        columns={columns}
        defaultFilename={filename}
      />
    </>
  );
}
