import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  MousePointerClick,
  Ban,
  Shield,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Flag,
  MessageSquare,
  History,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Building2,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { buildShortUrl, formatShortUrl } from '@/lib/config';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { proxyService, linksService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

type LinkStatus = 'active' | 'disabled' | 'expired' | 'blocked' | 'flagged';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  status: LinkStatus;
  riskLevel?: RiskLevel;
  reportCount?: number;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  teamId: string;
  teamName?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  tags?: string[];
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
}

interface LinksResponse {
  links: Link[];
  total: number;
  page: number;
  limit: number;
}

interface LinkStats {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  blockedLinks: number;
  flaggedLinks: number;
}

const STATUS_CONFIG: Record<LinkStatus, { label: string; color: string; icon: typeof Shield }> = {
  active: { label: '正常', color: 'bg-green-100 text-green-700', icon: ShieldCheck },
  disabled: { label: '已禁用', color: 'bg-gray-100 text-gray-700', icon: Shield },
  expired: { label: '已过期', color: 'bg-yellow-100 text-yellow-700', icon: Shield },
  blocked: { label: '已封禁', color: 'bg-red-100 text-red-700', icon: ShieldX },
  flagged: { label: '待审核', color: 'bg-orange-100 text-orange-700', icon: ShieldAlert },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: '低风险', color: 'bg-green-100 text-green-700' },
  medium: { label: '中风险', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: '高风险', color: 'bg-orange-100 text-orange-700' },
  critical: { label: '严重', color: 'bg-red-100 text-red-700' },
};

export default function LinksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [teamId, setTeamId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(1);
  };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  // 管理操作对话框
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; link: Link | null; isBulk: boolean }>({
    open: false, link: null, isBulk: false
  });
  const [unblockDialog, setUnblockDialog] = useState<{ open: boolean; link: Link | null }>({
    open: false, link: null
  });
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; link: Link | null }>({
    open: false, link: null
  });
  const [blockReason, setBlockReason] = useState('');
  const [flagReason, setFlagReason] = useState('');

  const limit = 20;

  // Fetch teams for filter
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

  // Fetch link stats
  const { data: stats } = useQuery<LinkStats>({
    queryKey: ['admin-link-stats'],
    queryFn: async () => {
      try {
        const response = await linksService.getStats();
        return response.data;
      } catch {
        return {
          totalLinks: 0,
          activeLinks: 0,
          totalClicks: 0,
          blockedLinks: 0,
          flaggedLinks: 0,
        };
      }
    },
  });

  // Normalize link data from API
  const normalizeLink = (item: any): Link => {
    // Map status
    let linkStatus: LinkStatus = 'active';
    if (item.status && ['active', 'disabled', 'expired', 'blocked', 'flagged'].includes(item.status)) {
      linkStatus = item.status;
    } else if (item.isActive === false || item.enabled === false) {
      linkStatus = 'disabled';
    } else if (item.isBlocked) {
      linkStatus = 'blocked';
    } else if (item.isFlagged) {
      linkStatus = 'flagged';
    } else if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
      linkStatus = 'expired';
    }

    return {
      ...item,
      status: linkStatus,
      shortCode: item.shortCode || item.slug || item.id?.slice(0, 8),
      teamName: item.teamName || teamNameMap[item.teamId] || (item.teamId ? `团队 ${item.teamId.slice(0, 8)}` : '-'),
      createdBy: item.createdBy || (item.userId ? { id: item.userId, name: item.userName || `用户 ${item.userId.slice(0, 8)}`, email: item.userEmail || '' } : undefined),
      clicks: item.clicks ?? item.clickCount ?? 0,
    };
  };

  // Fetch links
  const { data: linksData, isLoading, refetch } = useQuery({
    queryKey: ['admin-links', teamId, status, riskLevel, search, page, sortBy, sortOrder, teamNameMap],
    queryFn: async () => {
      const response = await linksService.getLinks({
        teamId: teamId !== 'all' ? teamId : undefined,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      const rawItems = response.data?.items || response.data?.links || response.data || [];
      const items = Array.isArray(rawItems) ? rawItems.map(normalizeLink) : [];

      // Client-side filtering for risk level if not supported by API
      let filtered = items;
      if (riskLevel !== 'all') {
        filtered = filtered.filter(l => l.riskLevel === riskLevel);
      }

      return {
        data: {
          links: filtered,
          total: response.data?.total || filtered.length,
          page,
          limit,
        },
      };
    },
  });

  // 封禁链接
  const blockLinkMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      await Promise.all(ids.map(id => linksService.blockLink(id, reason)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-links'] });
      queryClient.invalidateQueries({ queryKey: ['admin-link-stats'] });
      setBlockDialog({ open: false, link: null, isBulk: false });
      setBlockReason('');
      setSelectedIds([]);
    },
  });

  // 解封链接
  const unblockLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await linksService.unblockLink(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-links'] });
      queryClient.invalidateQueries({ queryKey: ['admin-link-stats'] });
      setUnblockDialog({ open: false, link: null });
    },
  });

  // 标记可疑
  const flagLinkMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await linksService.flagLink(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-links'] });
      queryClient.invalidateQueries({ queryKey: ['admin-link-stats'] });
      setFlagDialog({ open: false, link: null });
      setFlagReason('');
    },
  });

  const links = (linksData?.data as LinksResponse)?.links || [];
  const total = (linksData?.data as LinksResponse)?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const teams = teamsData?.data?.items || teamsData?.data || [];

  const handleCopy = (shortCode: string, id: string) => {
    navigator.clipboard.writeText(buildShortUrl(shortCode));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(links.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const allSelected = links.length > 0 && links.every((l) => selectedIds.includes(l.id));

  // Export columns
  const exportColumns = [
    { key: 'shortCode', header: '短链接' },
    { key: 'originalUrl', header: '原始URL' },
    { key: 'title', header: '标题' },
    { key: 'clicks', header: '点击数' },
    { key: 'status', header: '状态' },
    { key: 'riskLevel', header: '风险等级' },
    { key: 'reportCount', header: '举报次数' },
    { key: 'teamName', header: '团队' },
    { key: 'createdBy', header: '创建者' },
    { key: 'createdAt', header: '创建时间' },
  ];

  const prepareExportData = () => {
    return links.map((link) => ({
      shortCode: formatShortUrl(link.shortCode),
      originalUrl: link.originalUrl,
      title: link.title || '',
      clicks: link.clicks,
      status: STATUS_CONFIG[link.status]?.label || link.status,
      riskLevel: link.riskLevel ? RISK_CONFIG[link.riskLevel]?.label : '-',
      reportCount: link.reportCount || 0,
      teamName: link.teamName || '',
      createdBy: link.createdBy?.name || link.createdBy?.email || '',
      createdAt: format(new Date(link.createdAt), 'yyyy-MM-dd HH:mm'),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">链接监管</h1>
          <p className="text-sm text-gray-500">监控平台链接安全，审核可疑内容，封禁违规链接</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Link2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总链接数</p>
              <p className="text-2xl font-bold">{stats?.totalLinks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">正常链接</p>
              <p className="text-2xl font-bold">{stats?.activeLinks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <MousePointerClick className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总点击量</p>
              <p className="text-2xl font-bold">{stats?.totalClicks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3">
              <ShieldAlert className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待审核</p>
              <p className="text-2xl font-bold">{stats?.flaggedLinks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已封禁</p>
              <p className="text-2xl font-bold">{stats?.blockedLinks?.toLocaleString() || 0}</p>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索链接..."
              className="w-80 pl-9"
            />
          </div>

          <Select value={teamId} onValueChange={(value) => { setTeamId(value); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择团队" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部团队</SelectItem>
              {teams.map((team: { id: string; name: string }) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={riskLevel} onValueChange={(value) => { setRiskLevel(value); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="风险等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部风险</SelectItem>
              {Object.entries(RISK_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500">已选 {selectedIds.length} 项</span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => setBlockDialog({ open: true, link: null, isBulk: true })}
              >
                <Ban className="mr-1 h-4 w-4" />
                批量封禁
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            刷新
          </Button>
          <ExportButton
            data={prepareExportData()}
            columns={exportColumns}
            filename="links-oversight"
            title="导出链接监管数据"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={links.length === 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('shortCode')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    短链接
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  原始URL
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  所属 / 创建者
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('clicks')}
                    className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                  >
                    点击 / 举报
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  风险等级
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                  >
                    状态
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  管理操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    暂无链接数据
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  // Fallback for status - API may return different status values
                  const normalizedStatus = link.status && STATUS_CONFIG[link.status] ? link.status : 'active';
                  const statusConfig = STATUS_CONFIG[normalizedStatus];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedIds.includes(link.id)}
                          onCheckedChange={(checked) => handleSelectOne(link.id, !!checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-blue-600">
                            /{link.shortCode}
                          </span>
                          <button
                            onClick={() => handleCopy(link.shortCode, link.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {link.title && (
                          <p className="mt-1 text-xs text-gray-500">{link.title}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
                        >
                          <span className="max-w-xs truncate">{link.originalUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="flex items-center gap-1 text-sm font-medium">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              {link.teamName || '-'}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              {link.createdBy?.name || link.createdBy?.email || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div>
                          <span className="font-medium">{link.clicks.toLocaleString()}</span>
                          {(link.reportCount ?? 0) > 0 && (
                            <div className="flex items-center justify-center gap-1 text-orange-600">
                              <Flag className="h-3 w-3" />
                              <span className="text-xs">{link.reportCount} 举报</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {link.riskLevel && RISK_CONFIG[link.riskLevel] && (
                          <Badge className={RISK_CONFIG[link.riskLevel].color}>
                            {RISK_CONFIG[link.riskLevel].label}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={`${statusConfig.color} flex items-center gap-1 justify-center`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLink(link)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>查看详情</TooltipContent>
                            </Tooltip>

                            {link.status !== 'flagged' && link.status !== 'blocked' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-orange-600"
                                    onClick={() => setFlagDialog({ open: true, link })}
                                  >
                                    <Flag className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>标记可疑</TooltipContent>
                              </Tooltip>
                            )}

                            {link.status !== 'blocked' ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => setBlockDialog({ open: true, link, isBulk: false })}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>封禁链接</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => setUnblockDialog({ open: true, link })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>解除封禁</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-gray-500">
              共 {total?.toLocaleString()} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              {blockDialog.isBulk ? '批量封禁链接' : '封禁链接'}
            </DialogTitle>
            <DialogDescription>
              {blockDialog.isBulk
                ? `确定要封禁选中的 ${selectedIds.length} 个链接吗？封禁后用户将无法访问这些链接。`
                : `确定要封禁链接 /${blockDialog.link?.shortCode} 吗？封禁后用户将无法访问此链接。`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">封禁原因 *</label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="请输入封禁原因，将记录在审计日志中..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, link: null, isBulk: false })}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => blockLinkMutation.mutate({
                ids: blockDialog.isBulk ? selectedIds : [blockDialog.link!.id],
                reason: blockReason
              })}
              disabled={blockLinkMutation.isPending || !blockReason.trim()}
            >
              {blockLinkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认封禁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <Dialog open={unblockDialog.open} onOpenChange={(open) => setUnblockDialog({ ...unblockDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              解除封禁
            </DialogTitle>
            <DialogDescription>
              确定要解除链接 /{unblockDialog.link?.shortCode} 的封禁状态吗？解除后用户可以正常访问此链接。
            </DialogDescription>
          </DialogHeader>
          {unblockDialog.link?.blockReason && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">原封禁原因：</p>
              <p className="text-sm">{unblockDialog.link.blockReason}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnblockDialog({ open: false, link: null })}>
              取消
            </Button>
            <Button
              onClick={() => unblockLinkMutation.mutate(unblockDialog.link!.id)}
              disabled={unblockLinkMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {unblockLinkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认解封
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagDialog.open} onOpenChange={(open) => setFlagDialog({ ...flagDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Flag className="h-5 w-5" />
              标记可疑链接
            </DialogTitle>
            <DialogDescription>
              将链接 /{flagDialog.link?.shortCode} 标记为可疑，等待进一步审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">可疑原因 *</label>
              <Textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="请描述为什么认为此链接可疑..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog({ open: false, link: null })}>
              取消
            </Button>
            <Button
              onClick={() => flagLinkMutation.mutate({ id: flagDialog.link!.id, reason: flagReason })}
              disabled={flagLinkMutation.isPending || !flagReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {flagLinkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认标记
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Detail Sheet */}
      <Sheet open={!!selectedLink} onOpenChange={() => setSelectedLink(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>链接详情</SheetTitle>
            <SheetDescription>
              {selectedLink?.shortCode ? formatShortUrl(selectedLink.shortCode) : ''}
            </SheetDescription>
          </SheetHeader>
          {selectedLink && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="security">安全信息</TabsTrigger>
                <TabsTrigger value="audit">审计日志</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-gray-500">短链接</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm">
                      {buildShortUrl(selectedLink.shortCode)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(selectedLink.shortCode, selectedLink.id)}
                    >
                      {copiedId === selectedLink.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {selectedLink.title && (
                  <div>
                    <label className="text-sm text-gray-500">标题</label>
                    <p className="mt-1 font-medium">{selectedLink.title}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-500">原始链接</label>
                  <a
                    href={selectedLink.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-blue-600 hover:underline break-all"
                  >
                    {selectedLink.originalUrl}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">所属团队</label>
                    <p className="mt-1 flex items-center gap-1 font-medium">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      {selectedLink.teamName || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建者</label>
                    <p className="mt-1 flex items-center gap-1 font-medium">
                      <User className="h-4 w-4 text-gray-400" />
                      {selectedLink.createdBy?.name || selectedLink.createdBy?.email || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">点击次数</label>
                    <p className="mt-1 text-lg font-bold">{selectedLink.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建时间</label>
                    <p className="mt-1">
                      {format(new Date(selectedLink.createdAt), 'yyyy/MM/dd HH:mm')}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <div className="mt-1">
                      {(() => {
                        const config = STATUS_CONFIG[selectedLink.status] || STATUS_CONFIG.active;
                        return (
                          <Badge className={config.color}>
                            {config.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">风险等级</label>
                    <div className="mt-1">
                      {(() => {
                        const riskConfig = selectedLink.riskLevel && RISK_CONFIG[selectedLink.riskLevel];
                        if (riskConfig) {
                          return (
                            <Badge className={riskConfig.color}>
                              {riskConfig.label}
                            </Badge>
                          );
                        }
                        return <span className="text-gray-400">-</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500">举报次数</label>
                  <p className="mt-1 flex items-center gap-2">
                    <Flag className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{selectedLink.reportCount || 0} 次</span>
                  </p>
                </div>

                {selectedLink.status === 'blocked' && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-700">封禁信息</p>
                    <p className="mt-1 text-sm text-red-600">{selectedLink.blockReason}</p>
                    <p className="mt-2 text-xs text-red-500">
                      封禁时间: {selectedLink.blockedAt ? format(new Date(selectedLink.blockedAt), 'yyyy/MM/dd HH:mm') : '-'}
                    </p>
                    <p className="text-xs text-red-500">
                      操作人: {selectedLink.blockedBy || '-'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedLink.status !== 'blocked' ? (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setSelectedLink(null);
                        setBlockDialog({ open: true, link: selectedLink, isBulk: false });
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      封禁此链接
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedLink(null);
                        setUnblockDialog({ open: true, link: selectedLink });
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      解除封禁
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="audit" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <History className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">链接创建</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(selectedLink.createdAt), 'yyyy/MM/dd HH:mm')}
                      </p>
                      <p className="text-xs text-gray-500">
                        创建者: {selectedLink.createdBy?.email}
                      </p>
                    </div>
                  </div>
                  {selectedLink.status === 'blocked' && selectedLink.blockedAt && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <Ban className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">链接被封禁</p>
                        <p className="text-xs text-red-600">
                          {format(new Date(selectedLink.blockedAt), 'yyyy/MM/dd HH:mm')}
                        </p>
                        <p className="text-xs text-red-600">
                          操作人: {selectedLink.blockedBy}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          原因: {selectedLink.blockReason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
