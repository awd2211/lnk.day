import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  MousePointerClick,
  Ban,
  ToggleLeft,
  RefreshCw,
  Loader2,
  BarChart3,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

type LinkStatus = 'active' | 'disabled' | 'expired' | 'blocked';

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  status: LinkStatus;
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
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
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
}

const STATUS_CONFIG: Record<LinkStatus, { label: string; color: string }> = {
  active: { label: '正常', color: 'bg-green-100 text-green-700' },
  disabled: { label: '已禁用', color: 'bg-gray-100 text-gray-700' },
  expired: { label: '已过期', color: 'bg-yellow-100 text-yellow-700' },
  blocked: { label: '已封禁', color: 'bg-red-100 text-red-700' },
};

export default function LinksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [teamId, setTeamId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);
  const limit = 20;

  // Fetch teams for filter
  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => proxyService.getTeams({ limit: 100 }),
  });

  // Fetch link stats
  const { data: stats } = useQuery<LinkStats>({
    queryKey: ['admin-link-stats'],
    queryFn: async () => {
      // Mock stats - replace with API call
      return {
        totalLinks: 125430,
        activeLinks: 98234,
        totalClicks: 4532100,
        blockedLinks: 156,
      };
    },
  });

  // Fetch links
  const { data: linksData, isLoading, refetch } = useQuery({
    queryKey: ['admin-links', teamId, status, search, page],
    queryFn: async () => {
      if (teamId === 'all') {
        // Mock data for all teams view
        const mockLinks: Link[] = [
          {
            id: '1',
            shortCode: 'abc123',
            originalUrl: 'https://example.com/very-long-url-that-needs-to-be-shortened',
            title: '示例链接',
            clicks: 1234,
            status: 'active',
            createdAt: '2024-01-15T10:30:00Z',
            teamId: 't1',
            teamName: 'Marketing Team',
            createdBy: { id: 'u1', name: 'John Doe', email: 'john@example.com' },
            tags: ['marketing', 'campaign'],
          },
          {
            id: '2',
            shortCode: 'xyz789',
            originalUrl: 'https://blog.example.com/article/12345',
            title: '博客文章',
            clicks: 567,
            status: 'active',
            createdAt: '2024-01-14T15:20:00Z',
            teamId: 't2',
            teamName: 'Content Team',
            createdBy: { id: 'u2', name: 'Jane Smith', email: 'jane@example.com' },
          },
          {
            id: '3',
            shortCode: 'def456',
            originalUrl: 'https://shop.example.com/product/special-offer',
            clicks: 89,
            status: 'blocked',
            createdAt: '2024-01-13T09:00:00Z',
            teamId: 't1',
            teamName: 'Marketing Team',
            createdBy: { id: 'u3', name: 'Bob Wilson', email: 'bob@example.com' },
          },
          {
            id: '4',
            shortCode: 'ghi012',
            originalUrl: 'https://promo.example.com/winter-sale',
            title: '冬季促销',
            clicks: 2345,
            status: 'expired',
            createdAt: '2024-01-10T12:00:00Z',
            expiresAt: '2024-01-20T00:00:00Z',
            teamId: 't3',
            teamName: 'Sales Team',
            createdBy: { id: 'u1', name: 'John Doe', email: 'john@example.com' },
          },
        ];
        return {
          data: {
            links: mockLinks.filter(
              (l) =>
                (status === 'all' || l.status === status) &&
                (!search || l.shortCode.includes(search) || l.originalUrl.includes(search))
            ),
            total: mockLinks.length,
            page: 1,
            limit: 20,
          },
        };
      }
      return proxyService.getLinks(teamId, {
        page,
        limit,
        status: status === 'all' ? undefined : status,
      });
    },
  });

  // Delete link mutation
  const deleteLink = useMutation({
    mutationFn: async (ids: string | string[]) => {
      const idsArray = Array.isArray(ids) ? ids : [ids];
      await Promise.all(idsArray.map((id) => proxyService.deleteLink(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-links'] });
      setSelectedIds([]);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    },
  });

  const links = (linksData?.data as LinksResponse)?.links || [];
  const total = (linksData?.data as LinksResponse)?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const teams = teamsData?.data?.items || teamsData?.data || [];

  const handleCopy = (shortCode: string, id: string) => {
    navigator.clipboard.writeText(`https://lnk.day/${shortCode}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string | string[]) => {
    setDeleteTarget(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteLink.mutate(deleteTarget);
    }
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
    { key: 'shortCode', label: '短链接' },
    { key: 'originalUrl', label: '原始URL' },
    { key: 'title', label: '标题' },
    { key: 'clicks', label: '点击数' },
    { key: 'status', label: '状态' },
    { key: 'teamName', label: '团队' },
    { key: 'createdBy', label: '创建者' },
    { key: 'createdAt', label: '创建时间' },
  ];

  const prepareExportData = () => {
    return links.map((link) => ({
      shortCode: `lnk.day/${link.shortCode}`,
      originalUrl: link.originalUrl,
      title: link.title || '',
      clicks: link.clicks,
      status: STATUS_CONFIG[link.status]?.label || link.status,
      teamName: link.teamName || '',
      createdBy: link.createdBy?.name || link.createdBy?.email || '',
      createdAt: format(new Date(link.createdAt), 'yyyy-MM-dd HH:mm'),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
              <ToggleLeft className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃链接</p>
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
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500">已选 {selectedIds.length} 项</span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => handleDelete(selectedIds)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                批量删除
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
            filename="links"
            title="导出链接数据"
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
                  短链接
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  原始URL
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  团队 / 创建者
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  点击数
                </th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  操作
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
                links.map((link) => (
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
                      <div>
                        <p className="text-sm font-medium">{link.teamName || '-'}</p>
                        <p className="text-xs text-gray-500">
                          {link.createdBy?.name || link.createdBy?.email || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium">{link.clicks.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={STATUS_CONFIG[link.status]?.color}>
                        {STATUS_CONFIG[link.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(link.createdAt), 'yyyy/MM/dd', { locale: zhCN })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLink(link)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {Array.isArray(deleteTarget)
                ? `确定要删除选中的 ${deleteTarget.length} 个链接吗？此操作不可恢复。`
                : '确定要删除此链接吗？此操作不可恢复。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLink.isPending}
            >
              {deleteLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认删除
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
              lnk.day/{selectedLink?.shortCode}
            </SheetDescription>
          </SheetHeader>
          {selectedLink && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="analytics">分析数据</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-gray-500">短链接</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm">
                      https://lnk.day/{selectedLink.shortCode}
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
                    <label className="text-sm text-gray-500">状态</label>
                    <div className="mt-1">
                      <Badge className={STATUS_CONFIG[selectedLink.status]?.color}>
                        {STATUS_CONFIG[selectedLink.status]?.label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">点击次数</label>
                    <p className="mt-1 text-lg font-bold">{selectedLink.clicks.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">团队</label>
                    <p className="mt-1 font-medium">{selectedLink.teamName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建者</label>
                    <p className="mt-1 font-medium">
                      {selectedLink.createdBy?.name || selectedLink.createdBy?.email || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">创建时间</label>
                    <p className="mt-1">
                      {format(new Date(selectedLink.createdAt), 'yyyy/MM/dd HH:mm')}
                    </p>
                  </div>
                  {selectedLink.expiresAt && (
                    <div>
                      <label className="text-sm text-gray-500">过期时间</label>
                      <p className="mt-1">
                        {format(new Date(selectedLink.expiresAt), 'yyyy/MM/dd HH:mm')}
                      </p>
                    </div>
                  )}
                </div>

                {selectedLink.tags && selectedLink.tags.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">标签</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedLink.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLink.utm && (
                  <div>
                    <label className="text-sm text-gray-500">UTM 参数</label>
                    <div className="mt-1 rounded border p-3 text-sm">
                      {selectedLink.utm.source && (
                        <p>Source: {selectedLink.utm.source}</p>
                      )}
                      {selectedLink.utm.medium && (
                        <p>Medium: {selectedLink.utm.medium}</p>
                      )}
                      {selectedLink.utm.campaign && (
                        <p>Campaign: {selectedLink.utm.campaign}</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4 mt-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <BarChart3 className="h-5 w-5" />
                    <span>点击趋势</span>
                  </div>
                  <div className="mt-4 h-40 flex items-center justify-center text-gray-400">
                    图表区域（需要集成分析 API）
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">今日点击</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">本周点击</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500 mb-2">来源分布</p>
                  <p className="text-gray-400 text-center py-4">
                    需要集成分析 API
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
