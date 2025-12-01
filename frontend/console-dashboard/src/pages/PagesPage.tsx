import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Eye,
  ExternalLink,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Layout,
  Link2,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Ban,
  Flag,
  History,
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
import { landingPagesService, proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';
import { buildPageUrl } from '@/lib/config';

// Admin oversight types
type PageStatus = 'published' | 'draft' | 'archived' | 'blocked' | 'flagged';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface LandingPage {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  teamId: string;
  teamName?: string;
  ownerName?: string;
  ownerEmail?: string;
  type: 'bio' | 'landing' | 'link-in-bio' | 'link_in_bio' | 'form' | 'custom';
  status: PageStatus;
  template?: string;
  templateId?: string;
  views?: number;
  uniqueViews?: number;
  viewCount?: number;
  clickCount?: number;
  linkCount?: number;
  customDomain?: string;
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
  updatedAt: string;
  publishedAt?: string;
}

interface PageStats {
  totalPages: number;
  publishedPages: number;
  blockedPages: number;
  flaggedPages: number;
  totalViews: number;
  totalClicks: number;
}

// Admin oversight status config
const STATUS_CONFIG: Record<PageStatus, { label: string; color: string; bgColor: string; icon: typeof Shield }> = {
  published: { label: '已发布', color: 'text-green-600', bgColor: 'bg-green-100', icon: ShieldCheck },
  draft: { label: '草稿', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock },
  archived: { label: '已归档', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: XCircle },
  blocked: { label: '已封禁', color: 'text-red-600', bgColor: 'bg-red-100', icon: ShieldX },
  flagged: { label: '待审核', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: ShieldAlert },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: '低风险', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: '中风险', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: '高风险', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: '严重', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  bio: { label: 'Bio 页面', color: 'bg-blue-100 text-blue-700' },
  landing: { label: '落地页', color: 'bg-green-100 text-green-700' },
  'link-in-bio': { label: 'Link in Bio', color: 'bg-purple-100 text-purple-700' },
  'link_in_bio': { label: 'Link in Bio', color: 'bg-purple-100 text-purple-700' },
  form: { label: '表单页', color: 'bg-indigo-100 text-indigo-700' },
  custom: { label: '自定义', color: 'bg-orange-100 text-orange-700' },
};

// Export columns for admin oversight
const exportColumns = [
  { key: 'title', header: '标题' },
  { key: 'slug', header: 'Slug' },
  { key: 'status', header: '状态', formatter: (v: string) => STATUS_CONFIG[v as PageStatus]?.label || v },
  { key: 'riskLevel', header: '风险等级', formatter: (v?: string) => v ? RISK_CONFIG[v as RiskLevel]?.label : '-' },
  { key: 'teamName', header: '团队' },
  { key: 'ownerName', header: '创建者' },
  { key: 'type', header: '类型', formatter: (v: string) => typeConfig[v]?.label || v },
  { key: 'viewCount', header: '浏览量' },
  { key: 'clickCount', header: '点击量' },
  { key: 'reportCount', header: '举报次数' },
  { key: 'createdAt', header: '创建时间' },
];

export default function PagesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Admin action dialogs
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; page: LandingPage | null; isBulk: boolean }>({
    open: false,
    page: null,
    isBulk: false,
  });
  const [blockReason, setBlockReason] = useState('');
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; page: LandingPage | null }>({
    open: false,
    page: null,
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
  const { data: stats, isLoading: statsLoading } = useQuery<PageStats>({
    queryKey: ['page-stats-admin'],
    queryFn: async () => {
      try {
        const response = await landingPagesService.getStats();
        return response.data;
      } catch {
        // Return default stats if API fails
        return {
          totalPages: 0,
          publishedPages: 0,
          blockedPages: 0,
          flaggedPages: 0,
          totalViews: 0,
          totalClicks: 0,
        };
      }
    },
  });

  // Normalize page data from API
  const normalizePage = (item: any): LandingPage => {
    // Map status - API may return isPublished, isActive, etc.
    let status: PageStatus = 'draft';
    if (item.status && ['published', 'draft', 'archived', 'blocked', 'flagged'].includes(item.status)) {
      status = item.status;
    } else if (item.isPublished) {
      status = 'published';
    } else if (item.isBlocked) {
      status = 'blocked';
    } else if (item.isFlagged) {
      status = 'flagged';
    } else if (item.isArchived) {
      status = 'archived';
    }

    // Map type
    let type: LandingPage['type'] = 'landing';
    if (item.type && ['bio', 'landing', 'link-in-bio', 'link_in_bio', 'form', 'custom'].includes(item.type)) {
      type = item.type;
    }

    return {
      ...item,
      status,
      type,
      teamName: item.teamName || teamNameMap[item.teamId] || (item.teamId ? `团队 ${item.teamId.slice(0, 8)}` : '-'),
      ownerName: item.ownerName || item.userName || (item.userId ? `用户 ${item.userId.slice(0, 8)}` : '-'),
      ownerEmail: item.ownerEmail || item.userEmail,
      viewCount: item.viewCount ?? item.views ?? item.uniqueViews ?? 0,
      clickCount: item.clickCount ?? 0,
    };
  };

  // Fetch pages with admin oversight fields
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['landing-pages-admin', { search, page, statusFilter, riskFilter, typeFilter, teamNameMap }],
    queryFn: async () => {
      const response = await landingPagesService.getPages({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        page,
        limit: 20,
      });

      const rawItems = response.data?.items || response.data || [];
      const items = Array.isArray(rawItems) ? rawItems.map(normalizePage) : [];

      // Client-side filtering for search and risk (if not supported by API)
      let filtered = items;
      if (riskFilter !== 'all') {
        filtered = filtered.filter((p) => p.riskLevel === riskFilter);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((p) =>
          (p.title || p.slug || '').toLowerCase().includes(searchLower) ||
          p.teamName?.toLowerCase().includes(searchLower) ||
          p.ownerName?.toLowerCase().includes(searchLower)
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
      await Promise.all(ids.map(id => landingPagesService.blockPage(id, reason)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['page-stats-admin'] });
      setBlockDialog({ open: false, page: null, isBulk: false });
      setBlockReason('');
      setSelectedIds([]);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      await landingPagesService.unblockPage(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['page-stats-admin'] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await landingPagesService.flagPage(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['page-stats-admin'] });
      setFlagDialog({ open: false, page: null });
      setFlagReason('');
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedIds(data.items.map((p: LandingPage) => p.id));
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

  const calculateClickRate = (clicks: number, views: number) => {
    if (views === 0) return 0;
    return ((clicks / views) * 100).toFixed(1);
  };

  const getViewCount = (page: LandingPage) => page.viewCount ?? page.views ?? page.uniqueViews ?? 0;
  const getClickCount = (page: LandingPage) => page.clickCount ?? 0;
  const getPageTitle = (page: LandingPage) => page.title ?? page.name ?? page.slug;

  // Admin oversight stat cards
  const statCards = [
    {
      label: '页面总数',
      value: stats?.totalPages || 0,
      icon: Layout,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '已发布',
      value: stats?.publishedPages || 0,
      icon: ShieldCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '已封禁',
      value: stats?.blockedPages || 0,
      icon: ShieldX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: '待审核',
      value: stats?.flaggedPages || 0,
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
            页面监管
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
                filename="pages-oversight"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索页面标题、团队、创建者..."
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
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="bio">Bio 页面</SelectItem>
                <SelectItem value="landing">落地页</SelectItem>
                <SelectItem value="link-in-bio">Link in Bio</SelectItem>
                <SelectItem value="form">表单页</SelectItem>
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
                onClick={() => setBlockDialog({ open: true, page: null, isBulk: true })}
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

          {/* Pages Table */}
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
                  <th className="p-3 font-medium">页面</th>
                  <th className="p-3 font-medium">状态</th>
                  <th className="p-3 font-medium">风险</th>
                  <th className="p-3 font-medium">类型</th>
                  <th className="p-3 font-medium">团队/创建者</th>
                  <th className="p-3 font-medium text-right">浏览/点击</th>
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
                      暂无页面
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((landingPage: LandingPage) => {
                    // Fallback for status - API may return different status values
                    const normalizedStatus: PageStatus = landingPage.status && STATUS_CONFIG[landingPage.status] ? landingPage.status : 'published';
                    const statusConfig = STATUS_CONFIG[normalizedStatus];
                    const riskConfig = landingPage.riskLevel && RISK_CONFIG[landingPage.riskLevel] ? RISK_CONFIG[landingPage.riskLevel] : null;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr
                        key={landingPage.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.includes(landingPage.id)}
                            onCheckedChange={(checked) =>
                              handleSelect(landingPage.id, checked as boolean)
                            }
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{getPageTitle(landingPage)}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>/{landingPage.slug}</span>
                              {landingPage.customDomain && (
                                <Badge variant="outline" className="text-xs">
                                  {landingPage.customDomain}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig?.bgColor || 'bg-gray-100'} ${statusConfig?.color || 'text-gray-600'}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig?.label || landingPage.status}
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
                          <Badge className={typeConfig[landingPage.type]?.color}>
                            {typeConfig[landingPage.type]?.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{landingPage.teamName || '-'}</span>
                            </div>
                            {landingPage.ownerName && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UserCircle className="h-3 w-3" />
                                <span>{landingPage.ownerName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm">
                            <span className="font-medium">{getViewCount(landingPage).toLocaleString()}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="font-medium">{getClickCount(landingPage).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {calculateClickRate(getClickCount(landingPage), getViewCount(landingPage))}%
                          </p>
                        </td>
                        <td className="p-3">
                          {landingPage.reportCount && landingPage.reportCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {landingPage.reportCount}
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
                              onClick={() => setSelectedPage(landingPage)}
                              title="查看详情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {landingPage.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title="访问页面"
                              >
                                <a
                                  href={buildPageUrl(landingPage.slug)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {landingPage.status === 'blocked' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unblockMutation.mutate(landingPage.id)}
                                title="解封"
                                className="text-green-600 hover:text-green-700"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBlockDialog({ open: true, page: landingPage, isBulk: false })}
                                title="封禁"
                                className="text-red-500 hover:text-red-600"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            {landingPage.status !== 'flagged' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFlagDialog({ open: true, page: landingPage })}
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

      {/* Page Detail Sheet */}
      <Sheet open={!!selectedPage} onOpenChange={() => setSelectedPage(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>页面详情</SheetTitle>
          </SheetHeader>
          {selectedPage && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="security">安全信息</TabsTrigger>
                <TabsTrigger value="audit">审计日志</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">标题</p>
                    <p className="font-medium">{getPageTitle(selectedPage)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Slug</p>
                    <p className="font-medium">/{selectedPage.slug}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        STATUS_CONFIG[selectedPage.status]?.bgColor || 'bg-gray-100'
                      } ${STATUS_CONFIG[selectedPage.status]?.color || 'text-gray-600'}`}
                    >
                      {STATUS_CONFIG[selectedPage.status]?.label || selectedPage.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">类型</p>
                    <Badge className={typeConfig[selectedPage.type]?.color}>
                      {typeConfig[selectedPage.type]?.label}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">团队</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {selectedPage.teamName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">创建者</p>
                    <p className="font-medium flex items-center gap-1">
                      <UserCircle className="h-4 w-4" />
                      {selectedPage.ownerName || '-'}
                    </p>
                  </div>
                </div>

                {selectedPage.template && (
                  <div>
                    <p className="text-sm text-muted-foreground">模板</p>
                    <p className="font-medium">{selectedPage.template}</p>
                  </div>
                )}

                {selectedPage.customDomain && (
                  <div>
                    <p className="text-sm text-muted-foreground">自定义域名</p>
                    <p className="font-medium">{selectedPage.customDomain}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Eye className="h-5 w-5 mx-auto text-blue-500" />
                      <p className="mt-2 text-2xl font-bold">{getViewCount(selectedPage).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">浏览量</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Link2 className="h-5 w-5 mx-auto text-green-500" />
                      <p className="mt-2 text-2xl font-bold">{getClickCount(selectedPage).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">点击量</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-5 w-5 mx-auto text-purple-500" />
                      <p className="mt-2 text-2xl font-bold">
                        {calculateClickRate(getClickCount(selectedPage), getViewCount(selectedPage))}%
                      </p>
                      <p className="text-xs text-muted-foreground">点击率</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">创建时间</span>
                    <span>{formatDate(selectedPage.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">更新时间</span>
                    <span>{formatDate(selectedPage.updatedAt)}</span>
                  </div>
                  {selectedPage.publishedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">发布时间</span>
                      <span>{formatDate(selectedPage.publishedAt)}</span>
                    </div>
                  )}
                </div>

                {selectedPage.status === 'published' && (
                  <Button className="w-full" asChild>
                    <a
                      href={buildPageUrl(selectedPage.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      访问页面
                    </a>
                  </Button>
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
                      {selectedPage.riskLevel ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            RISK_CONFIG[selectedPage.riskLevel].bgColor
                          } ${RISK_CONFIG[selectedPage.riskLevel].color}`}
                        >
                          {RISK_CONFIG[selectedPage.riskLevel].label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未评估</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">举报次数</p>
                      <p className="font-medium">{selectedPage.reportCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Block Info */}
                {selectedPage.status === 'blocked' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-red-700">
                      <ShieldX className="h-4 w-4" />
                      封禁信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-red-600">封禁时间:</span>
                        <span>{selectedPage.blockedAt ? new Date(selectedPage.blockedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">操作者:</span>
                        <span>{selectedPage.blockedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-red-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedPage.blockReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flag Info */}
                {selectedPage.status === 'flagged' && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-orange-700">
                      <Flag className="h-4 w-4" />
                      待审核信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记时间:</span>
                        <span>{selectedPage.flaggedAt ? new Date(selectedPage.flaggedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记者:</span>
                        <span>{selectedPage.flaggedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-orange-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedPage.flagReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">管理操作</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPage.status === 'blocked' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockMutation.mutate(selectedPage.id)}
                        className="text-green-600"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        解除封禁
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBlockDialog({ open: true, page: selectedPage, isBulk: false })}
                        className="text-red-600"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        封禁页面
                      </Button>
                    )}
                    {selectedPage.status !== 'flagged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlagDialog({ open: true, page: selectedPage })}
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
                      { action: '页面创建', user: selectedPage.ownerEmail || 'unknown', time: selectedPage.createdAt },
                      ...(selectedPage.publishedAt ? [{ action: '页面发布', user: selectedPage.ownerEmail || 'unknown', time: selectedPage.publishedAt }] : []),
                      ...(selectedPage.flaggedAt ? [{ action: '标记为可疑', user: selectedPage.flaggedBy || 'system', time: selectedPage.flaggedAt, reason: selectedPage.flagReason }] : []),
                      ...(selectedPage.blockedAt ? [{ action: '封禁页面', user: selectedPage.blockedBy || 'admin', time: selectedPage.blockedAt, reason: selectedPage.blockReason }] : []),
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
          setBlockDialog({ open: false, page: null, isBulk: false });
          setBlockReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              {blockDialog.isBulk ? '批量封禁页面' : '封禁页面'}
            </DialogTitle>
            <DialogDescription>
              {blockDialog.isBulk
                ? `确定要封禁选中的 ${selectedIds.length} 个页面吗？封禁后将无法访问。`
                : `确定要封禁页面 "${blockDialog.page ? getPageTitle(blockDialog.page) : ''}" 吗？封禁后将无法访问。`}
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
                setBlockDialog({ open: false, page: null, isBulk: false });
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
                  : blockDialog.page
                  ? [blockDialog.page.id]
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
          setFlagDialog({ open: false, page: null });
          setFlagReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              标记可疑页面
            </DialogTitle>
            <DialogDescription>
              将页面 "{flagDialog.page ? getPageTitle(flagDialog.page) : ''}" 标记为可疑，需要进一步审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">标记原因 *</Label>
              <Textarea
                id="flag-reason"
                placeholder="请输入标记原因，例如：包含可疑内容、异常流量来源等..."
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
                setFlagDialog({ open: false, page: null });
                setFlagReason('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (flagDialog.page) {
                  flagMutation.mutate({ id: flagDialog.page.id, reason: flagReason });
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
