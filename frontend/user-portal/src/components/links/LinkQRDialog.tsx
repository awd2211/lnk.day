import { useState, useEffect } from 'react';
import { Download, Copy, Check, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { qrService } from '@/lib/api';

interface LinkQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: {
    id: string;
    shortCode: string;
    domain?: string;
    title?: string;
  } | null;
}

export function LinkQRDialog({ open, onOpenChange, link }: LinkQRDialogProps) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // 构造短链接 URL
  const getShortUrl = () => {
    if (!link) return '';
    const domain = link.domain || 'lnk.day';
    return `https://${domain}/${link.shortCode}`;
  };

  const shortUrl = getShortUrl();

  useEffect(() => {
    if (open && link) {
      generateQR();
    } else {
      setQrImage(null);
    }
  }, [open, link]);

  const generateQR = async () => {
    if (!link) return;

    setIsGenerating(true);
    try {
      const response = await qrService.generate({
        content: shortUrl,
        size: 300,
        margin: 2,
      });

      const blob = new Blob([response.data], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      setQrImage(imageUrl);
    } catch (error: any) {
      toast({
        title: '生成二维码失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrImage || !link) return;

    const a = document.createElement('a');
    a.href = qrImage;
    a.download = `qr-${link.shortCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({ title: '二维码已下载' });
  };

  const handleCopyUrl = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast({ title: '链接已复制' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {link?.title || link?.shortCode || '链接'} 的二维码
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {isGenerating ? (
            <div className="flex h-[300px] w-[300px] items-center justify-center rounded-lg border bg-gray-50">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : qrImage ? (
            <div className="rounded-lg border bg-white p-4">
              <img
                src={qrImage}
                alt="QR Code"
                className="h-[300px] w-[300px]"
              />
            </div>
          ) : (
            <div className="flex h-[300px] w-[300px] items-center justify-center rounded-lg border bg-gray-50 text-gray-400">
              无法生成二维码
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {shortUrl}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyUrl}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              复制链接
            </Button>
            <Button onClick={handleDownload} disabled={!qrImage}>
              <Download className="mr-2 h-4 w-4" />
              下载二维码
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
