import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Smartphone,
  Apple,
  Eye,
  Link2,
  Globe,
  CheckCircle,
  XCircle,
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
import { deepLinksService, proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';
import { formatShortUrl } from '@/lib/config';

// Admin oversight types
type DeepLinkStatus = 'active' | 'disabled' | 'blocked' | 'flagged';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface DeepLink {
  id: string;
  name?: string;
  linkId?: string;
  shortUrl?: string;
  teamId: string;
  teamName?: string;
  ownerName?: string;
  ownerEmail?: string;
  iosConfig?: { scheme?: string; bundleId?: string; appStoreId?: string; universalLink?: string };
  androidConfig?: { scheme?: string; packageName?: string; playStoreId?: string; appLink?: string };
  fallbackUrl?: string;
  desktopUrl?: string;
  socialMetadata?: { title?: string; description?: string; image?: string };
  enabled?: boolean;
  clicks?: number;
  installs?: number;
  iosUrl?: string;
  iosFallback?: string;
  androidUrl?: string;
  androidFallback?: string;
  webFallback?: string;
  clickCount?: number;
  iosClicks?: number;
  androidClicks?: number;
  webClicks?: number;
  status: DeepLinkStatus;
  // Admin oversight fields
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
}

// Helper functions
const getClickCount = (deepLink: DeepLink) => deepLink.clickCount ?? deepLink.clicks ?? 0;
const getIosClicks = (deepLink: DeepLink) => deepLink.iosClicks ?? Math.floor((deepLink.clicks ?? 0) * 0.45);
const getAndroidClicks = (deepLink: DeepLink) => deepLink.androidClicks ?? Math.floor((deepLink.clicks ?? 0) * 0.40);
const getWebClicks = (deepLink: DeepLink) => deepLink.webClicks ?? Math.floor((deepLink.clicks ?? 0) * 0.15);
const getDeepLinkName = (deepLink: DeepLink) => deepLink.name ?? deepLink.socialMetadata?.title ?? deepLink.linkId ?? 'Unnamed';
const getFallbackUrl = (deepLink: DeepLink) => deepLink.webFallback ?? deepLink.fallbackUrl ?? '';

interface DeepLinkStats {
  totalDeepLinks: number;
  activeDeepLinks: number;
  blockedDeepLinks: number;
  flaggedDeepLinks: number;
  totalClicks: number;
  iosClicks: number;
  androidClicks: number;
}

// Admin oversight status config
const STATUS_CONFIG: Record<DeepLinkStatus, { label: string; color: string; bgColor: string; icon: typeof Shield }> = {
  active: { label: '正常', color: 'text-green-600', bgColor: 'bg-green-100', icon: ShieldCheck },
  disabled: { label: '已禁用', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: XCircle },
  blocked: { label: '已封禁', color: 'text-red-600', bgColor: 'bg-red-100', icon: ShieldX },
  flagged: { label: '待审核', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: ShieldAlert },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: '低风险', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: '中风险', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: '高风险', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: '严重', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Export columns for admin oversight
const exportColumns = [
  { key: 'name', header: '名称' },
  { key: 'shortUrl', header: '短链接' },
  { key: 'status', header: '状态', formatter: (v: string) => STATUS_CONFIG[v as DeepLinkStatus]?.label || v },
  { key: 'riskLevel', header: '风险等级', formatter: (v?: string) => v ? RISK_CONFIG[v as RiskLevel]?.label : '-' },
  { key: 'teamName', header: '团队' },
  { key: 'ownerName', header: '创建者' },
  { key: 'clickCount', header: '总点击' },
  { key: 'iosClicks', header: 'iOS点击' },
  { key: 'androidClicks', header: 'Android点击' },
  { key: 'reportCount', header: '举报次数' },
  { key: 'createdAt', header: '创建时间' },
];

export default function DeepLinksPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedDeepLink, setSelectedDeepLink] = useState<DeepLink | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Admin action dialogs
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; deepLink: DeepLink | null; isBulk: boolean }>({
    open: false,
    deepLink: null,
    isBulk: false,
  });
  const [blockReason, setBlockReason] = useState('');
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; deepLink: DeepLink | null }>({
    open: false,
    deepLink: null,
  });
  const [flagReason, setFlagReason] = useState('');

  const queryClient = useQueryClient();

  // Fetch teams for lookup
  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => proxyService.getTeams({ limit: 100 }),
  });

  // Create team name lookup map
  const teamNameMap = useMemo(() => {
    const teams = teamsData?.data?.items || teamsData?.data || [];
    const map: Record<string, string> = {};
    for (const team of teams) {
      if (team.id && team.name) {
        map[team.id] = team.name;
      }
    }
    return map;
  }, [teamsData]);

  // Fetch stats with admin oversight metrics
  const { data: stats, isLoading: statsLoading } = useQuery<DeepLinkStats>({
    queryKey: ['deeplink-stats-admin'],
    queryFn: async () => {
      try {
        const response = await deepLinksService.getStats();
        return response.data;
      } catch {
        return {
          totalDeepLinks: 0,
          activeDeepLinks: 0,
          blockedDeepLinks: 0,
          flaggedDeepLinks: 0,
          totalClicks: 0,
          iosClicks: 0,
          androidClicks: 0,
        };
      }
    },
  });

  // Normalize deep link data from API
  const normalizeDeepLink = (item: any): DeepLink => {
    // Map status
    let status: DeepLinkStatus = 'active';
    if (item.status && ['active', 'disabled', 'blocked', 'flagged'].includes(item.status)) {
      status = item.status;
    } else if (item.enabled === false || item.isActive === false) {
      status = 'disabled';
    } else if (item.isBlocked) {
      status = 'blocked';
    } else if (item.isFlagged) {
      status = 'flagged';
    }

    return {
      ...item,
      status,
      shortUrl: item.shortUrl || (item.shortCode ? formatShortUrl(item.shortCode) : item.linkId),
      teamName: item.teamName || teamNameMap[item.teamId] || (item.teamId ? `团队 ${item.teamId.slice(0, 8)}` : '-'),
      ownerName: item.ownerName || item.userName || (item.userId ? `用户 ${item.userId.slice(0, 8)}` : '-'),
      ownerEmail: item.ownerEmail || item.userEmail,
      clickCount: item.clickCount ?? item.clicks ?? 0,
      iosClicks: item.iosClicks ?? 0,
      androidClicks: item.androidClicks ?? 0,
      webClicks: item.webClicks ?? 0,
    };
  };

  // Fetch deep links with admin oversight fields
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['deeplinks-admin', { search, page, statusFilter, riskFilter, teamNameMap }],
    queryFn: async () => {
      const response = await deepLinksService.getDeepLinks({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 20,
      });

      const rawItems = response.data?.items || response.data || [];
      const items = Array.isArray(rawItems) ? rawItems.map(normalizeDeepLink) : [];

      // Client-side filtering for search and risk
      let filtered = items;
      if (riskFilter !== 'all') {
        filtered = filtered.filter((dl) => dl.riskLevel === riskFilter);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((dl) =>
          (dl.name || '').toLowerCase().includes(searchLower) ||
          (dl.shortUrl || '').toLowerCase().includes(searchLower) ||
          dl.teamName?.toLowerCase().includes(searchLower) ||
          dl.ownerName?.toLowerCase().includes(searchLower)
        );
      }

      return {
        items: filtered,
        total: response.data?.total || filtered.length,
        page,
        totalPages: response.data?.totalPages || Math.ceil(filtered.length / 20) || 1,
      };
    },
  });

  // Admin action mutations
  const blockMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      await Promise.all(ids.map(id => deepLinksService.blockDeepLink(id, reason)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplinks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['deeplink-stats-admin'] });
      setBlockDialog({ open: false, deepLink: null, isBulk: false });
      setBlockReason('');
      setSelectedIds([]);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      await deepLinksService.unblockDeepLink(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplinks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['deeplink-stats-admin'] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await deepLinksService.flagDeepLink(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplinks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['deeplink-stats-admin'] });
      setFlagDialog({ open: false, deepLink: null });
      setFlagReason('');
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedIds(data.items.map((dl: DeepLink) => dl.id));
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

  const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  };

  // Admin oversight stat cards
  const statCards = [
    {
      label: '深度链接总数',
      value: stats?.totalDeepLinks || 0,
      icon: Smartphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '正常运行',
      value: stats?.activeDeepLinks || 0,
      icon: ShieldCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '已封禁',
      value: stats?.blockedDeepLinks || 0,
      icon: ShieldX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: '待审核',
      value: stats?.flaggedDeepLinks || 0,
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
            深度链接监管
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
                filename="deeplinks-oversight"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索深度链接名称、团队、创建者..."
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
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="mb-4 flex items-center gap-4 rounded-lg bg-muted p-3">
              <span className="text-sm">已选择 {selectedIds.length} 项</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBlockDialog({ open: true, deepLink: null, isBulk: true })}
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

          {/* Deep Links Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={
                        (data?.items?.length ?? 0) > 0 &&
                        selectedIds.length === (data?.items?.length ?? 0)
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 font-medium">名称</th>
                  <th className="p-3 font-medium">状态</th>
                  <th className="p-3 font-medium">风险</th>
                  <th className="p-3 font-medium">团队/创建者</th>
                  <th className="p-3 font-medium">平台</th>
                  <th className="p-3 font-medium">点击分布</th>
                  <th className="p-3 font-medium">举报</th>
                  <th className="p-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      加载中...
                    </td>
                  </tr>
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      暂无深度链接
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((deepLink: DeepLink) => {
                    // Fallback for status - API may return different status values
                    const normalizedStatus = deepLink.status && STATUS_CONFIG[deepLink.status] ? deepLink.status : 'active';
                    const statusConfig = STATUS_CONFIG[normalizedStatus];
                    const riskConfig = deepLink.riskLevel && RISK_CONFIG[deepLink.riskLevel] ? RISK_CONFIG[deepLink.riskLevel] : null;
                    const StatusIcon = statusConfig.icon;
                    const clickCount = getClickCount(deepLink);
                    const iosClicks = getIosClicks(deepLink);
                    const androidClicks = getAndroidClicks(deepLink);
                    const webClicks = getWebClicks(deepLink);
                    const hasIos = deepLink.iosUrl || deepLink.iosConfig;
                    const hasAndroid = deepLink.androidUrl || deepLink.androidConfig;

                    return (
                      <tr
                        key={deepLink.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.includes(deepLink.id)}
                            onCheckedChange={(checked) =>
                              handleSelect(deepLink.id, checked as boolean)
                            }
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{getDeepLinkName(deepLink)}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Link2 className="h-3 w-3" />
                              {deepLink.shortUrl || getFallbackUrl(deepLink) || deepLink.linkId}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig?.bgColor || 'bg-gray-100'} ${statusConfig?.color || 'text-gray-600'}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig?.label || deepLink.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {riskConfig ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                            >
                              {riskConfig.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{deepLink.teamName || '-'}</span>
                            </div>
                            {deepLink.ownerName && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UserCircle className="h-3 w-3" />
                                <span>{deepLink.ownerName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {hasIos && (
                              <Badge className="bg-gray-100 text-gray-700 text-xs">
                                <Apple className="mr-1 h-3 w-3" />
                                iOS
                              </Badge>
                            )}
                            {hasAndroid && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <Smartphone className="mr-1 h-3 w-3" />
                                Android
                              </Badge>
                            )}
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              <Globe className="mr-1 h-3 w-3" />
                              Web
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="bg-gray-500"
                              style={{ width: `${calculatePercentage(iosClicks, clickCount)}%` }}
                              title={`iOS: ${iosClicks.toLocaleString()}`}
                            />
                            <div
                              className="bg-green-500"
                              style={{ width: `${calculatePercentage(androidClicks, clickCount)}%` }}
                              title={`Android: ${androidClicks.toLocaleString()}`}
                            />
                            <div
                              className="bg-blue-500"
                              style={{ width: `${calculatePercentage(webClicks, clickCount)}%` }}
                              title={`Web: ${webClicks.toLocaleString()}`}
                            />
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {clickCount.toLocaleString()} 点击
                          </div>
                        </td>
                        <td className="p-3">
                          {deepLink.reportCount && deepLink.reportCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {deepLink.reportCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDeepLink(deepLink)}
                              title="查看详情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {deepLink.status === 'blocked' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unblockMutation.mutate(deepLink.id)}
                                title="解封"
                                className="text-green-600 hover:text-green-700"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBlockDialog({ open: true, deepLink, isBulk: false })}
                                title="封禁"
                                className="text-red-500 hover:text-red-600"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            {deepLink.status !== 'flagged' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFlagDialog({ open: true, deepLink })}
                                title="标记可疑"
                                className="text-orange-500 hover:text-orange-600"
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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

      {/* Deep Link Detail Sheet */}
      <Sheet open={!!selectedDeepLink} onOpenChange={() => setSelectedDeepLink(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>深度链接详情</SheetTitle>
          </SheetHeader>
          {selectedDeepLink && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="security">安全信息</TabsTrigger>
                <TabsTrigger value="audit">审计日志</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">名称</p>
                    <p className="font-medium">{getDeepLinkName(selectedDeepLink)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">短链接</p>
                    <p className="font-medium">{selectedDeepLink.shortUrl || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        STATUS_CONFIG[selectedDeepLink.status]?.bgColor || 'bg-gray-100'
                      } ${STATUS_CONFIG[selectedDeepLink.status]?.color || 'text-gray-600'}`}
                    >
                      {STATUS_CONFIG[selectedDeepLink.status]?.label || selectedDeepLink.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">创建时间</p>
                    <p className="font-medium">{formatDate(selectedDeepLink.createdAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">团队</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {selectedDeepLink.teamName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">创建者</p>
                    <p className="font-medium flex items-center gap-1">
                      <UserCircle className="h-4 w-4" />
                      {selectedDeepLink.ownerName || '-'}
                    </p>
                  </div>
                </div>

                {/* Platform Config */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium">平台配置</h4>
                  {(selectedDeepLink.iosUrl || selectedDeepLink.iosConfig) && (
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Apple className="h-4 w-4" />
                        <span className="font-medium">iOS</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        App URL: {selectedDeepLink.iosUrl || selectedDeepLink.iosConfig?.scheme || '未配置'}
                      </p>
                    </div>
                  )}
                  {(selectedDeepLink.androidUrl || selectedDeepLink.androidConfig) && (
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Android</span>
                      </div>
                      <p className="mt-2 break-all text-sm text-muted-foreground">
                        App URL: {selectedDeepLink.androidUrl || selectedDeepLink.androidConfig?.scheme || '未配置'}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Web Fallback</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{getFallbackUrl(selectedDeepLink) || '未配置'}</p>
                  </div>
                </div>

                {/* Click Stats */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-medium">点击统计</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{getClickCount(selectedDeepLink).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">总点击</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{getIosClicks(selectedDeepLink).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">iOS</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{getAndroidClicks(selectedDeepLink).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Android</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{getWebClicks(selectedDeepLink).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Web</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
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
                      {selectedDeepLink.riskLevel ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            RISK_CONFIG[selectedDeepLink.riskLevel].bgColor
                          } ${RISK_CONFIG[selectedDeepLink.riskLevel].color}`}
                        >
                          {RISK_CONFIG[selectedDeepLink.riskLevel].label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未评估</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">举报次数</p>
                      <p className="font-medium">{selectedDeepLink.reportCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Block Info */}
                {selectedDeepLink.status === 'blocked' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-red-700">
                      <ShieldX className="h-4 w-4" />
                      封禁信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-red-600">封禁时间:</span>
                        <span>{selectedDeepLink.blockedAt ? new Date(selectedDeepLink.blockedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">操作者:</span>
                        <span>{selectedDeepLink.blockedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-red-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedDeepLink.blockReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flag Info */}
                {selectedDeepLink.status === 'flagged' && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-orange-700">
                      <Flag className="h-4 w-4" />
                      待审核信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记时间:</span>
                        <span>{selectedDeepLink.flaggedAt ? new Date(selectedDeepLink.flaggedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记者:</span>
                        <span>{selectedDeepLink.flaggedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-orange-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedDeepLink.flagReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">管理操作</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDeepLink.status === 'blocked' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockMutation.mutate(selectedDeepLink.id)}
                        className="text-green-600"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        解除封禁
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBlockDialog({ open: true, deepLink: selectedDeepLink, isBulk: false })}
                        className="text-red-600"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        封禁链接
                      </Button>
                    )}
                    {selectedDeepLink.status !== 'flagged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlagDialog({ open: true, deepLink: selectedDeepLink })}
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
                      { action: '深度链接创建', user: selectedDeepLink.ownerEmail || 'unknown', time: selectedDeepLink.createdAt },
                      ...(selectedDeepLink.flaggedAt ? [{ action: '标记为可疑', user: selectedDeepLink.flaggedBy || 'system', time: selectedDeepLink.flaggedAt, reason: selectedDeepLink.flagReason }] : []),
                      ...(selectedDeepLink.blockedAt ? [{ action: '封禁链接', user: selectedDeepLink.blockedBy || 'admin', time: selectedDeepLink.blockedAt, reason: selectedDeepLink.blockReason }] : []),
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
          setBlockDialog({ open: false, deepLink: null, isBulk: false });
          setBlockReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              {blockDialog.isBulk ? '批量封禁深度链接' : '封禁深度链接'}
            </DialogTitle>
            <DialogDescription>
              {blockDialog.isBulk
                ? `确定要封禁选中的 ${selectedIds.length} 个深度链接吗？封禁后将无法正常使用。`
                : `确定要封禁深度链接 "${blockDialog.deepLink ? getDeepLinkName(blockDialog.deepLink) : ''}" 吗？封禁后将无法正常使用。`}
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
                setBlockDialog({ open: false, deepLink: null, isBulk: false });
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
                  : blockDialog.deepLink
                  ? [blockDialog.deepLink.id]
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
          setFlagDialog({ open: false, deepLink: null });
          setFlagReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              标记可疑深度链接
            </DialogTitle>
            <DialogDescription>
              将深度链接 "{flagDialog.deepLink ? getDeepLinkName(flagDialog.deepLink) : ''}" 标记为可疑，需要进一步审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">标记原因 *</Label>
              <Textarea
                id="flag-reason"
                placeholder="请输入标记原因，例如：恶意App重定向、可疑安装模式等..."
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
                setFlagDialog({ open: false, deepLink: null });
                setFlagReason('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (flagDialog.deepLink) {
                  flagMutation.mutate({ id: flagDialog.deepLink.id, reason: flagReason });
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
