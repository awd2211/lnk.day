import { useState, useRef } from 'react';
import { Download, Palette, Image, RefreshCw } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { qrService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const presetColors = [
  { name: '经典黑', fg: '#000000', bg: '#FFFFFF' },
  { name: '深蓝', fg: '#1E40AF', bg: '#FFFFFF' },
  { name: '翠绿', fg: '#059669', bg: '#FFFFFF' },
  { name: '酒红', fg: '#991B1B', bg: '#FFFFFF' },
  { name: '紫罗兰', fg: '#7C3AED', bg: '#FFFFFF' },
  { name: '暗黑模式', fg: '#FFFFFF', bg: '#1F2937' },
];

export default function QRPage() {
  const [content, setContent] = useState('');
  const [size, setSize] = useState(300);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { toast } = useToast();

  const generateQR = async () => {
    if (!content) {
      toast({ title: '请输入内容', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await qrService.generate({
        content,
        size,
        color: fgColor,
        backgroundColor: bgColor,
      });

      const url = URL.createObjectURL(response.data);
      setQrImage(url);
    } catch (error) {
      toast({ title: '生成失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `qrcode-${Date.now()}.png`;
    link.click();
  };

  const applyPreset = (preset: typeof presetColors[0]) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">二维码生成器</h1>
        <p className="text-gray-500">为您的链接生成自定义二维码</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Settings Panel */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">基础设置</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="content">内容 / URL</Label>
                <Input
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="输入 URL 或文本内容"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="size">尺寸 ({size}px)</Label>
                <input
                  id="size"
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">颜色设置</h2>

            {/* Preset Colors */}
            <div className="mb-4">
              <Label className="mb-2 block">预设配色</Label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <div
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: preset.fg }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fgColor">前景色</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="fgColor"
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border"
                  />
                  <Input
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bgColor">背景色</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="bgColor"
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border"
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button onClick={generateQR} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              '生成二维码'
            )}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">预览</h2>
          <div
            className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed"
            style={{ backgroundColor: bgColor }}
          >
            {qrImage ? (
              <img
                src={qrImage}
                alt="QR Code"
                className="max-w-full"
                style={{ maxHeight: '350px' }}
              />
            ) : (
              <div className="text-center text-gray-400">
                <Palette className="mx-auto mb-2 h-12 w-12" />
                <p>输入内容后点击生成</p>
              </div>
            )}
          </div>

          {qrImage && (
            <div className="mt-4 flex gap-2">
              <Button onClick={downloadQR} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                下载 PNG
              </Button>
              <Button variant="outline" onClick={generateQR}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
