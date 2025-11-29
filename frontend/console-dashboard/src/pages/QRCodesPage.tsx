import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  QrCode,
  Download,
  MoreVertical,
  Eye,
  Trash2,
  Link2,
  Calendar,
  BarChart3,
  Palette,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { qrCodesService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface QRCode {
  id: string;
  linkId: string;
  shortUrl: string;
  teamId: string;
  teamName: string;
  style: 'standard' | 'rounded' | 'dots' | 'custom';
  foregroundColor: string;
  backgroundColor: string;
  logoUrl?: string;
  size: number;
  scanCount: number;
  createdAt: string;
  lastScannedAt?: string;
}

interface QRCodeStats {
  totalQRCodes: number;
  totalScans: number;
  scansToday: number;
  averageScansPerQR: number;
  styleDistribution: { style: string; count: number }[];
}

const styleConfig: Record<string, { label: string; color: string }> = {
  standard: { label: '标准', color: 'bg-gray-100 text-gray-700' },
  rounded: { label: '圆角', color: 'bg-blue-100 text-blue-700' },
  dots: { label: '点阵', color: 'bg-purple-100 text-purple-700' },
  custom: { label: '自定义', color: 'bg-orange-100 text-orange-700' },
};

const exportColumns = [
  { key: 'shortUrl', header: '短链接' },
  { key: 'teamName', header: '团队' },
  { key: 'style', header: '样式' },
  { key: 'scanCount', header: '扫描次数' },
  { key: 'createdAt', header: '创建时间' },
  { key: 'lastScannedAt', header: '最后扫描' },
];

export default function QRCodesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery<QRCodeStats>({
    queryKey: ['qrcode-stats'],
    queryFn: async () => {
      return {
        totalQRCodes: 8560,
        totalScans: 1256000,
        scansToday: 8520,
        averageScansPerQR: 147,
        styleDistribution: [
          { style: 'standard', count: 4500 },
          { style: 'rounded', count: 2100 },
          { style: 'dots', count: 1200 },
          { style: 'custom', count: 760 },
        ],
      };
    },
  });

  // Fetch QR codes
  const { data, isLoading } = useQuery({
    queryKey: ['qrcodes', { search, page, style: styleFilter }],
    queryFn: async () => {
      try {
        const response = await qrCodesService.getQRCodes({
          style: styleFilter !== 'all' ? styleFilter : undefined,
          page,
          limit: 20,
        });
        return response.data;
      } catch {
        const mockQRCodes: QRCode[] = [
          {
            id: '1',
            linkId: 'l1',
            shortUrl: 'lnk.day/promo2024',
            teamId: 't1',
            teamName: 'Acme Corp',
            style: 'custom',
            foregroundColor: '#1a1a1a',
            backgroundColor: '#ffffff',
            logoUrl: 'https://example.com/logo.png',
            size: 512,
            scanCount: 15680,
            createdAt: '2024-01-15',
            lastScannedAt: '2024-01-20T10:30:00Z',
          },
          {
            id: '2',
            linkId: 'l2',
            shortUrl: 'lnk.day/menu',
            teamId: 't2',
            teamName: 'Restaurant Co',
            style: 'rounded',
            foregroundColor: '#2563eb',
            backgroundColor: '#ffffff',
            size: 256,
            scanCount: 8520,
            createdAt: '2024-01-10',
            lastScannedAt: '2024-01-20T09:15:00Z',
          },
          {
            id: '3',
            linkId: 'l3',
            shortUrl: 'lnk.day/event',
            teamId: 't3',
            teamName: 'Event Planners',
            style: 'dots',
            foregroundColor: '#7c3aed',
            backgroundColor: '#faf5ff',
            size: 512,
            scanCount: 3250,
            createdAt: '2024-01-08',
            lastScannedAt: '2024-01-19T18:00:00Z',
          },
          {
            id: '4',
            linkId: 'l4',
            shortUrl: 'lnk.day/contact',
            teamId: 't1',
            teamName: 'Acme Corp',
            style: 'standard',
            foregroundColor: '#000000',
            backgroundColor: '#ffffff',
            size: 256,
            scanCount: 1250,
            createdAt: '2024-01-05',
            lastScannedAt: '2024-01-18T14:30:00Z',
          },
          {
            id: '5',
            linkId: 'l5',
            shortUrl: 'lnk.day/store',
            teamId: 't4',
            teamName: 'E-Commerce Inc',
            style: 'custom',
            foregroundColor: '#dc2626',
            backgroundColor: '#fff1f2',
            logoUrl: 'https://example.com/store-logo.png',
            size: 512,
            scanCount: 25680,
            createdAt: '2023-12-01',
            lastScannedAt: '2024-01-20T11:00:00Z',
          },
        ];
        return { items: mockQRCodes, total: 5 };
      }
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => qrCodesService.deleteQRCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes'] });
      queryClient.invalidateQueries({ queryKey: ['qrcode-stats'] });
      setDeleteOpen(false);
      setSelectedQR(null);
    },
  });

  const handleDelete = () => {
    if (!selectedQR) return;
    deleteMutation.mutate(selectedQR.id);
  };

  const openDelete = (qr: QRCode) => {
    setSelectedQR(qr);
    setDeleteOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <QrCode className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">二维码总数</p>
              <p className="text-2xl font-bold">{stats?.totalQRCodes?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总扫描次数</p>
              <p className="text-2xl font-bold">{stats?.totalScans?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日扫描</p>
              <p className="text-2xl font-bold">{stats?.scansToday?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3">
              <Palette className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均扫描/QR</p>
              <p className="text-2xl font-bold">{stats?.averageScansPerQR || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索二维码..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={styleFilter} onValueChange={setStyleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="样式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部样式</SelectItem>
              <SelectItem value="standard">标准</SelectItem>
              <SelectItem value="rounded">圆角</SelectItem>
              <SelectItem value="dots">点阵</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个二维码</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="qrcodes_export"
            title="导出二维码数据"
            size="sm"
          />
        </div>
      </div>

      {/* QR Codes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">加载中...</div>
        ) : data?.items?.length ? (
          data.items.map((qr: QRCode) => (
            <div key={qr.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-start justify-between">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-lg"
                  style={{ backgroundColor: qr.backgroundColor }}
                >
                  <QrCode className="h-16 w-16" style={{ color: qr.foregroundColor }} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedQR(qr)}>
                      <Eye className="mr-2 h-4 w-4" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      下载
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDelete(qr)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-400" />
                  <span className="truncate text-sm font-medium">{qr.shortUrl}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{qr.teamName}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge className={styleConfig[qr.style]?.color}>
                    {styleConfig[qr.style]?.label}
                  </Badge>
                  <span className="text-sm font-medium">{qr.scanCount.toLocaleString()} 次扫描</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500">暂无二维码</div>
        )}
      </div>

      {/* QR Code Detail Sheet */}
      <Sheet open={!!selectedQR && !deleteOpen} onOpenChange={() => setSelectedQR(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>二维码详情</SheetTitle>
            <SheetDescription>{selectedQR?.shortUrl}</SheetDescription>
          </SheetHeader>
          {selectedQR && (
            <div className="mt-6 space-y-6">
              <div className="flex justify-center">
                <div
                  className="flex h-48 w-48 items-center justify-center rounded-lg"
                  style={{ backgroundColor: selectedQR.backgroundColor }}
                >
                  <QrCode className="h-32 w-32" style={{ color: selectedQR.foregroundColor }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">短链接</label>
                  <p className="font-medium">{selectedQR.shortUrl}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">团队</label>
                  <p className="font-medium">{selectedQR.teamName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">样式</label>
                  <Badge className={styleConfig[selectedQR.style]?.color}>
                    {styleConfig[selectedQR.style]?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">尺寸</label>
                  <p className="font-medium">{selectedQR.size}x{selectedQR.size}px</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">前景色</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded border"
                      style={{ backgroundColor: selectedQR.foregroundColor }}
                    />
                    <span className="text-sm">{selectedQR.foregroundColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">背景色</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded border"
                      style={{ backgroundColor: selectedQR.backgroundColor }}
                    />
                    <span className="text-sm">{selectedQR.backgroundColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">扫描次数</label>
                  <p className="font-medium">{selectedQR.scanCount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="font-medium">{formatDate(selectedQR.createdAt)}</p>
                </div>
                {selectedQR.lastScannedAt && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">最后扫描</label>
                    <p className="font-medium">{formatDateTime(selectedQR.lastScannedAt)}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  下载 PNG
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  下载 SVG
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除二维码</DialogTitle>
            <DialogDescription>
              确定要删除此二维码吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              此二维码已被扫描 {selectedQR?.scanCount.toLocaleString()} 次。删除后，已打印的二维码仍可使用，但无法在后台管理。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
