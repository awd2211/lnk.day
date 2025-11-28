import { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileSpreadsheet,
  Archive,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBatchQR, BatchQROptions } from '@/hooks/useBatchQR';
import { cn } from '@/lib/utils';

export default function BatchQRGenerator() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newUrl, setNewUrl] = useState('');
  const [options, setOptions] = useState<BatchQROptions>({
    size: 300,
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
    margin: 2,
    errorCorrectionLevel: 'M',
  });

  const {
    items,
    isGenerating,
    progress,
    addFromCSV,
    addItem,
    removeItem,
    clearAll,
    generateAll,
    downloadZip,
    retryFailed,
    successCount,
    errorCount,
    pendingCount,
  } = useBatchQR();

  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast({ title: '请上传 CSV 或 TXT 文件', variant: 'destructive' });
      return;
    }

    try {
      const count = await addFromCSV(file);
      toast({ title: `已添加 ${count} 个 URL` });
    } catch {
      toast({ title: '文件解析失败', variant: 'destructive' });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    addItem(newUrl.trim());
    setNewUrl('');
  };

  const handleGenerate = async () => {
    if (items.length === 0) {
      toast({ title: '请先添加 URL', variant: 'destructive' });
      return;
    }
    await generateAll(options);
    toast({ title: '批量生成完成' });
  };

  const handleDownload = async () => {
    if (successCount === 0) {
      toast({ title: '没有可下载的二维码', variant: 'destructive' });
      return;
    }
    await downloadZip();
    toast({ title: 'ZIP 下载已开始' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <div className="rounded-lg border-2 border-dashed p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 font-medium">上传 CSV 文件</h3>
          <p className="mt-1 text-sm text-gray-500">
            支持 CSV 格式：每行一个 URL，或 URL,文件名
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            <Upload className="mr-2 h-4 w-4" />
            选择文件
          </Button>
        </div>
      </div>

      {/* 手动添加 */}
      <div className="flex gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="输入 URL 后按回车或点击添加"
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
        />
        <Button onClick={handleAddUrl} disabled={!newUrl.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          添加
        </Button>
      </div>

      {/* 生成选项 */}
      {items.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-4 font-medium">生成选项</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm">尺寸: {options.size}px</Label>
              <Slider
                min={100}
                max={1000}
                step={50}
                value={[options.size || 300]}
                onValueChange={([v]) => setOptions({ ...options, size: v })}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm">前景色</Label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={options.foregroundColor}
                  onChange={(e) =>
                    setOptions({ ...options, foregroundColor: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border"
                />
                <span className="text-sm text-gray-500">{options.foregroundColor}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm">背景色</Label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={options.backgroundColor}
                  onChange={(e) =>
                    setOptions({ ...options, backgroundColor: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border"
                />
                <span className="text-sm text-gray-500">{options.backgroundColor}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm">纠错级别</Label>
              <Select
                value={options.errorCorrectionLevel}
                onValueChange={(v) =>
                  setOptions({
                    ...options,
                    errorCorrectionLevel: v as 'L' | 'M' | 'Q' | 'H',
                  })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">低 (7%)</SelectItem>
                  <SelectItem value="M">中 (15%)</SelectItem>
                  <SelectItem value="Q">较高 (25%)</SelectItem>
                  <SelectItem value="H">高 (30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* 项目列表 */}
      {items.length > 0 && (
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-4">
              <h4 className="font-medium">URL 列表 ({items.length})</h4>
              <div className="flex items-center gap-2 text-sm">
                {pendingCount > 0 && (
                  <span className="text-gray-500">{pendingCount} 待处理</span>
                )}
                {successCount > 0 && (
                  <span className="text-green-600">{successCount} 成功</span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600">{errorCount} 失败</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {errorCount > 0 && (
                <Button variant="outline" size="sm" onClick={retryFailed}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试失败
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="mr-2 h-4 w-4" />
                清空
              </Button>
            </div>
          </div>

          {/* 进度条 */}
          {isGenerating && (
            <div className="border-b p-4">
              <div className="flex items-center justify-between text-sm">
                <span>生成进度</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress
                value={(progress.current / progress.total) * 100}
                className="mt-2"
              />
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 border-b p-3 last:border-b-0',
                  item.status === 'error' && 'bg-red-50'
                )}
              >
                {getStatusIcon(item.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.url}</p>
                  <p className="text-xs text-gray-500">{item.filename}</p>
                  {item.error && (
                    <p className="text-xs text-red-500">{item.error}</p>
                  )}
                </div>
                {item.dataUrl && (
                  <img
                    src={item.dataUrl}
                    alt="QR"
                    className="h-10 w-10 rounded border"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  disabled={isGenerating}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {items.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || pendingCount === 0}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中 ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                生成二维码 ({pendingCount})
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isGenerating || successCount === 0}
          >
            <Archive className="mr-2 h-4 w-4" />
            下载 ZIP ({successCount})
          </Button>
        </div>
      )}

      {/* 示例格式 */}
      {items.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-4 text-sm">
          <h4 className="font-medium">CSV 文件格式示例</h4>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
{`url,filename
https://example.com,example
https://google.com,google
https://github.com,github`}
          </pre>
          <p className="mt-2 text-gray-500">
            也支持每行只有 URL 的简单格式，文件名会自动生成。
          </p>
        </div>
      )}
    </div>
  );
}
