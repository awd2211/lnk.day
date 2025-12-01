import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  QrCode,
  Eye,
  Link2,
  Calendar,
  BarChart3,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Ban,
  Flag,
  History,
  FileText,
  Building2,
  UserCircle,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { qrCodesService, proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';
import { formatShortUrl } from '@/lib/config';

// Admin oversight types
type QRStatus = 'active' | 'disabled' | 'blocked' | 'flagged';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type StyleType = 'standard' | 'rounded' | 'dots' | 'custom';

interface QRCode {
  id: string;
  linkId?: string;
  shortCode?: string;
  shortUrl?: string;
  content?: string;
  targetUrl?: string;
  teamId: string;
  userId?: string;
  teamName?: string;
  ownerName?: string;
  ownerEmail?: string;
  name?: string;
  style?: StyleType;
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  imageUrl?: string;
  size?: number;
  scanCount?: number;
  isActive?: boolean;
  // Admin oversight fields
  status?: QRStatus;
  riskLevel?: RiskLevel;
  reportCount?: number;
  blockedAt?: string;
  blockedBy?: string;
  blockReason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
  flagReason?: string;
  createdAt: string;
  updatedAt?: string;
  lastScannedAt?: string;
}

interface QRCodeStats {
  totalQRCodes: number;
  activeQRCodes: number;
  blockedQRCodes: number;
  flaggedQRCodes: number;
  totalScans: number;
  scansToday: number;
}

// Admin oversight status config
const STATUS_CONFIG: Record<QRStatus, { label: string; color: string; bgColor: string; icon: typeof Shield }> = {
  active: { label: '正常', color: 'text-green-600', bgColor: 'bg-green-100', icon: ShieldCheck },
  disabled: { label: '已禁用', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Shield },
  blocked: { label: '已封禁', color: 'text-red-600', bgColor: 'bg-red-100', icon: ShieldX },
  flagged: { label: '待审核', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: ShieldAlert },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: '低风险', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: '中风险', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: '高风险', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: '严重', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const styleConfig: Record<string, { label: string; color: string }> = {
  standard: { label: '标准', color: 'bg-gray-100 text-gray-700' },
  rounded: { label: '圆角', color: 'bg-blue-100 text-blue-700' },
  dots: { label: '点阵', color: 'bg-purple-100 text-purple-700' },
  custom: { label: '自定义', color: 'bg-orange-100 text-orange-700' },
};

// Export columns for admin oversight
const exportColumns = [
  { key: 'shortUrl', header: '短链接' },
  { key: 'status', header: '状态', formatter: (v: string) => STATUS_CONFIG[v as QRStatus]?.label || v },
  { key: 'riskLevel', header: '风险等级', formatter: (v?: string) => v ? RISK_CONFIG[v as RiskLevel]?.label : '-' },
  { key: 'teamName', header: '团队' },
  { key: 'ownerName', header: '创建者' },
  { key: 'style', header: '样式', formatter: (v: string) => styleConfig[v]?.label || v },
  { key: 'scanCount', header: '扫描次数' },
  { key: 'reportCount', header: '举报次数' },
  { key: 'createdAt', header: '创建时间' },
  { key: 'lastScannedAt', header: '最后扫描' },
];

export default function QRCodesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Admin action dialogs
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; qr: QRCode | null; isBulk: boolean }>({
    open: false,
    qr: null,
    isBulk: false,
  });
  const [blockReason, setBlockReason] = useState('');
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; qr: QRCode | null }>({
    open: false,
    qr: null,
  });
  const [flagReason, setFlagReason] = useState('');

  const queryClient = useQueryClient();

  // Teams for filter
  const { data: teamsData } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      try {
        const res = await proxyService.getTeams({ limit: 100 });
        return res.data;
      } catch {
        return { items: [], total: 0 };
      }
    },
  });

  // Fetch stats with admin oversight metrics
  const { data: stats, isLoading: statsLoading } = useQuery<QRCodeStats>({
    queryKey: ['qrcode-stats-admin'],
    queryFn: async () => {
      try {
        const response = await qrCodesService.getStats();
        return response.data || {
          totalQRCodes: 0,
          activeQRCodes: 0,
          blockedQRCodes: 0,
          flaggedQRCodes: 0,
          totalScans: 0,
          scansToday: 0,
        };
      } catch {
        return {
          totalQRCodes: 0,
          activeQRCodes: 0,
          blockedQRCodes: 0,
          flaggedQRCodes: 0,
          totalScans: 0,
          scansToday: 0,
        };
      }
    },
  });

  // Build team name lookup map
  const teamNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (teamsData?.items) {
      teamsData.items.forEach((team: { id: string; name: string }) => {
        map[team.id] = team.name;
      });
    }
    return map;
  }, [teamsData]);

  // Helper to normalize QR data from API
  const normalizeQRCode = (item: any): QRCode => {
    const styleObj = typeof item.style === 'object' ? item.style : {};
    // Determine style type
    let styleType: StyleType = 'standard';
    if (typeof item.style === 'string' && ['standard', 'rounded', 'dots', 'custom'].includes(item.style)) {
      styleType = item.style as StyleType;
    } else if (styleObj.dotStyle === 'dots') {
      styleType = 'dots';
    } else if (styleObj.cornerRadius) {
      styleType = 'rounded';
    }

    return {
      ...item,
      shortUrl: item.shortUrl || (item.shortCode ? formatShortUrl(item.shortCode) : item.content),
      teamName: item.teamName || teamNameMap[item.teamId] || `团队 ${item.teamId?.slice(0, 8) || '-'}`,
      ownerName: item.ownerName || item.userName || (item.userId ? `用户 ${item.userId.slice(0, 8)}` : '-'),
      style: styleType,
      foregroundColor: styleObj.foregroundColor || item.foregroundColor || '#1a1a1a',
      backgroundColor: styleObj.backgroundColor || item.backgroundColor || '#ffffff',
      logoUrl: styleObj.logoUrl || item.logoUrl,
      size: styleObj.size || item.size || 256,
      scanCount: item.scanCount || 0,
      status: item.status || (item.isActive === false ? 'disabled' : 'active'),
    };
  };

  // Fetch QR codes with admin oversight fields
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['qrcodes-admin', { search, page, statusFilter, riskFilter, styleFilter, teamNameMap }],
    queryFn: async () => {
      const response = await qrCodesService.getQRCodes({
        style: styleFilter !== 'all' ? styleFilter : undefined,
        page,
        limit: 20,
      });
      // Normalize API response
      const rawItems = response.data?.items || response.data || [];
      const items = Array.isArray(rawItems) ? rawItems.map(normalizeQRCode) : [];

      // Client-side filtering for search and status (API may not support all filters)
      let filtered = items;
      if (statusFilter !== 'all') {
        filtered = filtered.filter((qr) => qr.status === statusFilter);
      }
      if (riskFilter !== 'all') {
        filtered = filtered.filter((qr) => qr.riskLevel === riskFilter);
      }
      if (search) {
        filtered = filtered.filter((qr) =>
          (qr.shortUrl || '').toLowerCase().includes(search.toLowerCase()) ||
          (qr.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
          (qr.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
          (qr.shortCode || '').toLowerCase().includes(search.toLowerCase())
        );
      }

      return {
        items: filtered,
        total: response.data?.total || filtered.length,
        page: response.data?.page || page,
        totalPages: response.data?.totalPages || Math.ceil(filtered.length / 20),
      };
    },
  });

  // Admin action mutations
  const blockMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      // Block multiple QR codes
      await Promise.all(ids.map(id => qrCodesService.blockQRCode(id, reason)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['qrcode-stats-admin'] });
      setBlockDialog({ open: false, qr: null, isBulk: false });
      setBlockReason('');
      setSelectedIds([]);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      await qrCodesService.unblockQRCode(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['qrcode-stats-admin'] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await qrCodesService.flagQRCode(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['qrcode-stats-admin'] });
      setFlagDialog({ open: false, qr: null });
      setFlagReason('');
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedIds(data.items.map((qr: QRCode) => qr.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
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

  // Admin oversight stat cards
  const statCards = [
    {
      label: '二维码总数',
      value: stats?.totalQRCodes || 0,
      icon: QrCode,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '正常运行',
      value: stats?.activeQRCodes || 0,
      icon: ShieldCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '已封禁',
      value: stats?.blockedQRCodes || 0,
      icon: ShieldX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: '待审核',
      value: stats?.flaggedQRCodes || 0,
      icon: ShieldAlert,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg ${stat.bgColor} p-3`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? '...' : stat.value.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            二维码监管
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
            {data?.items && (
              <ExportButton
                data={data.items}
                columns={exportColumns}
                filename="qrcodes-oversight"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索短链接、团队、创建者..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="disabled">已禁用</SelectItem>
                <SelectItem value="blocked">已封禁</SelectItem>
                <SelectItem value="flagged">待审核</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="风险等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部风险</SelectItem>
                <SelectItem value="low">低风险</SelectItem>
                <SelectItem value="medium">中风险</SelectItem>
                <SelectItem value="high">高风险</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="mb-4 flex items-center gap-4 rounded-lg bg-muted p-3">
              <span className="text-sm">已选择 {selectedIds.length} 项</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBlockDialog({ open: true, qr: null, isBulk: true })}
              >
                <Ban className="mr-2 h-4 w-4" />
                批量封禁
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                取消选择
              </Button>
            </div>
          )}

          {/* QR Codes Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">加载中...</div>
            ) : data?.items?.length ? (
              data.items.map((qr: QRCode) => {
                // Fallback for status - API may return different status values
                const normalizedStatus = qr.status && STATUS_CONFIG[qr.status] ? qr.status : 'active';
                const statusConfig = STATUS_CONFIG[normalizedStatus];
                const riskConfig = qr.riskLevel && RISK_CONFIG[qr.riskLevel] ? RISK_CONFIG[qr.riskLevel] : null;
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={qr.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.includes(qr.id)}
                          onCheckedChange={(checked) => handleSelect(qr.id, checked as boolean)}
                        />
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-lg"
                          style={{ backgroundColor: qr.backgroundColor }}
                        >
                          <QrCode className="h-12 w-12" style={{ color: qr.foregroundColor }} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                        {riskConfig && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                          >
                            {riskConfig.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{qr.shortUrl}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{qr.teamName}</span>
                      </div>
                      {qr.ownerName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserCircle className="h-3 w-3" />
                          <span>{qr.ownerName}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <Badge className={qr.style ? styleConfig[qr.style]?.color : 'bg-gray-100 text-gray-700'}>
                          {qr.style ? styleConfig[qr.style]?.label : '标准'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(qr.scanCount || 0).toLocaleString()} 扫描
                        </span>
                      </div>
                      {qr.reportCount && qr.reportCount > 0 && (
                        <div className="mt-2">
                          <Badge variant="destructive" className="text-xs">
                            {qr.reportCount} 次举报
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedQR(qr)}
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {qr.status === 'blocked' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unblockMutation.mutate(qr.id)}
                          title="解封"
                          className="text-green-600 hover:text-green-700"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBlockDialog({ open: true, qr, isBulk: false })}
                          title="封禁"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {qr.status !== 'flagged' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFlagDialog({ open: true, qr })}
                          title="标记可疑"
                          className="text-orange-500 hover:text-orange-600"
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">暂无二维码</div>
            )}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {data.total} 条记录，第 {page} / {data.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Detail Sheet */}
      <Sheet open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>二维码详情</SheetTitle>
          </SheetHeader>
          {selectedQR && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="security">安全信息</TabsTrigger>
                <TabsTrigger value="audit">审计日志</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="flex justify-center">
                  <div
                    className="flex h-40 w-40 items-center justify-center rounded-lg"
                    style={{ backgroundColor: selectedQR.backgroundColor }}
                  >
                    <QrCode className="h-28 w-28" style={{ color: selectedQR.foregroundColor }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">短链接</p>
                    <p className="font-medium">{selectedQR.shortUrl}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    {(() => {
                      const statusKey = selectedQR.status && STATUS_CONFIG[selectedQR.status] ? selectedQR.status : 'active';
                      const config = STATUS_CONFIG[statusKey];
                      return (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">团队</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {selectedQR.teamName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">创建者</p>
                    <p className="font-medium flex items-center gap-1">
                      <UserCircle className="h-4 w-4" />
                      {selectedQR.ownerName || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">样式</p>
                    <Badge className={selectedQR.style ? styleConfig[selectedQR.style]?.color : 'bg-gray-100 text-gray-700'}>
                      {selectedQR.style ? styleConfig[selectedQR.style]?.label : '标准'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">尺寸</p>
                    <p className="font-medium">{selectedQR.size || 256}x{selectedQR.size || 256}px</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">前景色</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: selectedQR.foregroundColor }}
                      />
                      <span className="text-sm">{selectedQR.foregroundColor}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">背景色</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: selectedQR.backgroundColor }}
                      />
                      <span className="text-sm">{selectedQR.backgroundColor}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-5 w-5 mx-auto text-blue-500" />
                      <p className="mt-2 text-2xl font-bold">{(selectedQR.scanCount || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">扫描次数</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Calendar className="h-5 w-5 mx-auto text-purple-500" />
                      <p className="mt-2 text-sm font-bold">{formatDate(selectedQR.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">创建时间</p>
                    </CardContent>
                  </Card>
                </div>

                {selectedQR.lastScannedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">最后扫描</p>
                    <p className="font-medium">{formatDateTime(selectedQR.lastScannedAt)}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                {/* Risk Level */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4" />
                    风险评估
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">风险等级</p>
                      {(() => {
                        const riskConfig = selectedQR.riskLevel && RISK_CONFIG[selectedQR.riskLevel];
                        if (riskConfig) {
                          return (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                            >
                              {riskConfig.label}
                            </span>
                          );
                        }
                        return <span className="text-muted-foreground">未评估</span>;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">举报次数</p>
                      <p className="font-medium">{selectedQR.reportCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Block Info */}
                {selectedQR.status === 'blocked' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-red-700">
                      <ShieldX className="h-4 w-4" />
                      封禁信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-red-600">封禁时间:</span>
                        <span>{selectedQR.blockedAt ? new Date(selectedQR.blockedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">操作者:</span>
                        <span>{selectedQR.blockedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-red-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedQR.blockReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flag Info */}
                {selectedQR.status === 'flagged' && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-orange-700">
                      <Flag className="h-4 w-4" />
                      待审核信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记时间:</span>
                        <span>{selectedQR.flaggedAt ? new Date(selectedQR.flaggedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记者:</span>
                        <span>{selectedQR.flaggedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-orange-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedQR.flagReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">管理操作</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedQR.status === 'blocked' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockMutation.mutate(selectedQR.id)}
                        className="text-green-600"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        解除封禁
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBlockDialog({ open: true, qr: selectedQR, isBulk: false })}
                        className="text-red-600"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        封禁二维码
                      </Button>
                    )}
                    {selectedQR.status !== 'flagged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlagDialog({ open: true, qr: selectedQR })}
                        className="text-orange-600"
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        标记可疑
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audit" className="space-y-4 mt-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <History className="h-4 w-4" />
                    操作记录
                  </h4>
                  <div className="space-y-3">
                    {/* Mock audit logs */}
                    {[
                      { action: '二维码创建', user: selectedQR.ownerEmail || 'unknown', time: selectedQR.createdAt },
                      ...(selectedQR.flaggedAt ? [{ action: '标记为可疑', user: selectedQR.flaggedBy || 'system', time: selectedQR.flaggedAt, reason: selectedQR.flagReason }] : []),
                      ...(selectedQR.blockedAt ? [{ action: '封禁二维码', user: selectedQR.blockedBy || 'admin', time: selectedQR.blockedAt, reason: selectedQR.blockReason }] : []),
                    ].map((log, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">{log.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.time).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">操作者: {log.user}</p>
                          {'reason' in log && log.reason && (
                            <p className="text-xs mt-1 text-muted-foreground">原因: {log.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Block Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => {
        if (!open) {
          setBlockDialog({ open: false, qr: null, isBulk: false });
          setBlockReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              {blockDialog.isBulk ? '批量封禁二维码' : '封禁二维码'}
            </DialogTitle>
            <DialogDescription>
              {blockDialog.isBulk
                ? `确定要封禁选中的 ${selectedIds.length} 个二维码吗？封禁后将无法正常扫描。`
                : `确定要封禁二维码 "${blockDialog.qr?.shortUrl}" 吗？封禁后将无法正常扫描。`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="block-reason">封禁原因 *</Label>
              <Textarea
                id="block-reason"
                placeholder="请输入封禁原因，将记录在审计日志中..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlockDialog({ open: false, qr: null, isBulk: false });
                setBlockReason('');
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const ids = blockDialog.isBulk
                  ? selectedIds
                  : blockDialog.qr
                  ? [blockDialog.qr.id]
                  : [];
                blockMutation.mutate({ ids, reason: blockReason });
              }}
              disabled={!blockReason.trim()}
            >
              确认封禁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagDialog.open} onOpenChange={(open) => {
        if (!open) {
          setFlagDialog({ open: false, qr: null });
          setFlagReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              标记可疑二维码
            </DialogTitle>
            <DialogDescription>
              将二维码 "{flagDialog.qr?.shortUrl}" 标记为可疑，需要进一步审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">标记原因 *</Label>
              <Textarea
                id="flag-reason"
                placeholder="请输入标记原因，例如：可疑扫描模式、恶意目标地址等..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFlagDialog({ open: false, qr: null });
                setFlagReason('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (flagDialog.qr) {
                  flagMutation.mutate({ id: flagDialog.qr.id, reason: flagReason });
                }
              }}
              disabled={!flagReason.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              确认标记
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
