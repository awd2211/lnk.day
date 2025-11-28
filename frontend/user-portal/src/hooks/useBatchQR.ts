import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { qrService } from '@/lib/api';

export interface BatchQRItem {
  id: string;
  url: string;
  filename: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  dataUrl?: string;
  error?: string;
}

export interface BatchQROptions {
  size?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export function useBatchQR() {
  const [items, setItems] = useState<BatchQRItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 解析 CSV 文本
  const parseCSV = useCallback((csvText: string): BatchQRItem[] => {
    const lines = csvText.split('\n').filter((line) => line.trim());
    const result: BatchQRItem[] = [];

    // 跳过标题行（如果是 URL 开头的话就不跳过）
    const firstLine = lines[0];
    const startIndex = firstLine?.toLowerCase().includes('url') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      const line = rawLine.trim();
      if (!line) continue;

      // 支持两种格式：纯 URL 或 URL,filename
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const url = parts[0];
      const filename = parts[1] || `qr_${i + 1 - startIndex}`;

      if (url && url.length > 0) {
        result.push({
          id: `${Date.now()}-${i}`,
          url,
          filename: filename.endsWith('.png') ? filename : `${filename}.png`,
          status: 'pending',
        });
      }
    }

    return result;
  }, []);

  // 添加项目
  const addItems = useCallback((newItems: BatchQRItem[]) => {
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  // 从 CSV 文件添加
  const addFromCSV = useCallback(
    async (file: File): Promise<number> => {
      const text = await file.text();
      const parsed = parseCSV(text);
      addItems(parsed);
      return parsed.length;
    },
    [parseCSV, addItems]
  );

  // 手动添加单个
  const addItem = useCallback((url: string, filename?: string) => {
    const item: BatchQRItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      filename: filename || `qr_${Date.now()}.png`,
      status: 'pending',
    };
    setItems((prev) => [...prev, item]);
  }, []);

  // 删除项目
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 清空所有
  const clearAll = useCallback(() => {
    setItems([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  // 更新项目状态
  const updateItem = useCallback((id: string, updates: Partial<BatchQRItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  // 批量生成
  const generateAll = useCallback(
    async (options: BatchQROptions = {}) => {
      const pendingItems = items.filter((item) => item.status === 'pending');
      if (pendingItems.length === 0) return;

      setIsGenerating(true);
      setProgress({ current: 0, total: pendingItems.length });

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        if (!item) continue;

        updateItem(item.id, { status: 'generating' });

        try {
          const response = await qrService.generateTyped({
            contentType: 'url',
            content: { url: item.url },
            options: {
              size: options.size || 300,
              foregroundColor: options.foregroundColor || '#000000',
              backgroundColor: options.backgroundColor || '#ffffff',
              margin: options.margin || 2,
              errorCorrectionLevel: options.errorCorrectionLevel || 'M',
            },
          });

          // 转换为 dataUrl
          const blob = response.data;
          const dataUrl = await blobToDataUrl(blob);

          updateItem(item.id, { status: 'success', dataUrl });
        } catch (error) {
          updateItem(item.id, {
            status: 'error',
            error: error instanceof Error ? error.message : '生成失败',
          });
        }

        setProgress({ current: i + 1, total: pendingItems.length });
      }

      setIsGenerating(false);
    },
    [items, updateItem]
  );

  // 下载 ZIP
  const downloadZip = useCallback(async () => {
    const successItems = items.filter(
      (item) => item.status === 'success' && item.dataUrl
    );
    if (successItems.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('qrcodes');

    if (!folder) return;

    for (const item of successItems) {
      if (item.dataUrl) {
        // dataUrl 格式: data:image/png;base64,xxx
        const parts = item.dataUrl.split(',');
        const base64Data = parts[1];
        if (base64Data) {
          folder.file(item.filename, base64Data, { base64: true });
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qrcodes-${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // 重置失败项
  const retryFailed = useCallback(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'error' ? { ...item, status: 'pending', error: undefined } : item
      )
    );
  }, []);

  return {
    items,
    isGenerating,
    progress,
    addItems,
    addFromCSV,
    addItem,
    removeItem,
    clearAll,
    generateAll,
    downloadZip,
    retryFailed,
    successCount: items.filter((i) => i.status === 'success').length,
    errorCount: items.filter((i) => i.status === 'error').length,
    pendingCount: items.filter((i) => i.status === 'pending').length,
  };
}

// Helper: Blob to DataURL
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
