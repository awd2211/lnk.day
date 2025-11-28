import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  ExternalLink,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Flag,
  Clock,
  AlertTriangle,
  User,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { moderationService } from '@/lib/api';

interface FlaggedLink {
  id: string;
  shortUrl: string;
  destinationUrl: string;
  userId: string;
  userName: string;
  userEmail: string;
  reason: 'phishing' | 'malware' | 'spam' | 'adult' | 'scam' | 'abuse' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  reportCount: number;
  autoDetected: boolean;
  detectedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

interface ModerationStats {
  pendingReview: number;
  blockedToday: number;
  approvedToday: number;
  totalReports: number;
  autoBlocked: number;
  byReason: { reason: string; count: number }[];
}

interface Report {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reason: string;
  description: string;
  createdAt: string;
}

const reasonConfig: Record<string, { label: string; color: string }> = {
  phishing: { label: '钓鱼网站', color: 'bg-red-100 text-red-700' },
  malware: { label: '恶意软件', color: 'bg-red-100 text-red-700' },
  spam: { label: '垃圾内容', color: 'bg-yellow-100 text-yellow-700' },
  adult: { label: '成人内容', color: 'bg-purple-100 text-purple-700' },
  scam: { label: '诈骗', color: 'bg-orange-100 text-orange-700' },
  abuse: { label: '滥用', color: 'bg-gray-100 text-gray-700' },
  other: { label: '其他', color: 'bg-gray-100 text-gray-700' },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-green-100 text-green-700' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  critical: { label: '严重', color: 'bg-red-100 text-red-700' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', color: 'bg-gray-100 text-gray-700' },
  blocked: { label: '已封禁', color: 'bg-red-100 text-red-700' },
};

export default function ContentModerationPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedLink, setSelectedLink] = useState<FlaggedLink | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showReportsSheet, setShowReportsSheet] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<ModerationStats>({
    queryKey: ['moderation-stats'],
    queryFn: async () => {
      try {
        const res = await moderationService.getStats();
        return res.data;
      } catch {
        // Mock data fallback
        return {
          pendingReview: 23,
          blockedToday: 15,
          approvedToday: 42,
          totalReports: 156,
          autoBlocked: 89,
          byReason: [
            { reason: 'phishing', count: 45 },
            { reason: 'spam', count: 38 },
            { reason: 'malware', count: 28 },
            { reason: 'scam', count: 22 },
            { reason: 'adult', count: 15 },
            { reason: 'other', count: 8 },
          ],
        };
      }
    },
  });

  // Fetch flagged links
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['flagged-links', { search, status: statusFilter, reason: reasonFilter, severity: severityFilter, page }],
    queryFn: async () => {
      try {
        const res = await moderationService.getFlaggedLinks({
          page,
          limit: 20,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          reason: reasonFilter !== 'all' ? reasonFilter : undefined,
          severity: severityFilter !== 'all' ? severityFilter : undefined,
          search: search || undefined,
        });
        return res.data;
      } catch {
        // Mock data fallback
        const mockLinks: FlaggedLink[] = [
          {
            id: '1',
            shortUrl: 'lnk.day/abc123',
            destinationUrl: 'https://phishing-site.com/login',
            userId: 'u1',
            userName: 'Bad Actor',
            userEmail: 'bad@example.com',
            reason: 'phishing',
            severity: 'critical',
            status: 'pending',
            reportCount: 12,
            autoDetected: true,
            detectedAt: '2024-01-15T10:30:00Z',
          },
          {
            id: '2',
            shortUrl: 'lnk.day/xyz789',
            destinationUrl: 'https://spam-site.com/offer',
            userId: 'u2',
            userName: 'Spammer',
            userEmail: 'spam@example.com',
            reason: 'spam',
            severity: 'medium',
            status: 'pending',
            reportCount: 5,
            autoDetected: false,
            detectedAt: '2024-01-15T09:15:00Z',
          },
          {
            id: '3',
            shortUrl: 'lnk.day/def456',
            destinationUrl: 'https://legit-site.com/promo',
            userId: 'u3',
            userName: 'John Doe',
            userEmail: 'john@company.com',
            reason: 'spam',
            severity: 'low',
            status: 'pending',
            reportCount: 1,
            autoDetected: false,
            detectedAt: '2024-01-15T08:00:00Z',
          },
        ];
        const filtered = mockLinks.filter(
          (l) =>
            (statusFilter === 'all' || l.status === statusFilter) &&
            (reasonFilter === 'all' || l.reason === reasonFilter) &&
            (severityFilter === 'all' || l.severity === severityFilter)
        );
        return { items: filtered, total: filtered.length, page: 1, totalPages: 1 };
      }
    },
  });

  // Fetch reports for a link
  const { data: reports } = useQuery<Report[]>({
    queryKey: ['link-reports', selectedLink?.id],
    queryFn: async () => {
      if (!selectedLink) return [];
      try {
        const res = await moderationService.getReports(selectedLink.id);
        return res.data;
      } catch {
        // Mock reports
        return [
          {
            id: 'r1',
            reporterId: 'user1',
            reporterEmail: 'reporter1@example.com',
            reason: 'phishing',
            description: '这个链接看起来像钓鱼网站，试图获取用户凭据',
            createdAt: '2024-01-15T08:00:00Z',
          },
          {
            id: 'r2',
            reporterId: 'user2',
            reporterEmail: 'reporter2@example.com',
            reason: 'phishing',
            description: '收到来自这个链接的可疑邮件',
            createdAt: '2024-01-15T09:30:00Z',
          },
        ];
      }
    },
    enabled: !!selectedLink && showReportsSheet,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => moderationService.approveLink(id, { note: reviewNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-links'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setSelectedLink(null);
      setReviewNote('');
    },
  });

  // Block mutation
  const blockMutation = useMutation({
    mutationFn: (id: string) => moderationService.blockLink(id, { note: reviewNote, blockUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-links'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setSelectedLink(null);
      setReviewNote('');
      setBlockUser(false);
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: () => moderationService.bulkApprove(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-links'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setSelectedIds([]);
    },
  });

  // Bulk block mutation
  const bulkBlockMutation = useMutation({
    mutationFn: () => moderationService.bulkBlock(selectedIds, { blockUsers: blockUser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-links'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setSelectedIds([]);
      setBlockUser(false);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedIds(data.items.filter((l) => l.status === 'pending').map((l) => l.id));
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const pendingItems = data?.items?.filter((l) => l.status === 'pending') || [];
  const allPendingSelected = pendingItems.length > 0 && pendingItems.every((l) => selectedIds.includes(l.id));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待审核</p>
              <p className="text-2xl font-bold">{stats?.pendingReview || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日封禁</p>
              <p className="text-2xl font-bold">{stats?.blockedToday || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日通过</p>
              <p className="text-2xl font-bold">{stats?.approvedToday || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Flag className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总举报数</p>
              <p className="text-2xl font-bold">{stats?.totalReports || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">自动封禁</p>
              <p className="text-2xl font-bold">{stats?.autoBlocked || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reason Distribution */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 font-semibold">举报原因分布</h3>
        <div className="flex flex-wrap gap-4">
          {stats?.byReason?.map((item) => (
            <div key={item.reason} className="flex items-center gap-2">
              <Badge className={reasonConfig[item.reason]?.color}>
                {reasonConfig[item.reason]?.label}
              </Badge>
              <span className="text-sm font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索链接或用户..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="blocked">已封禁</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="原因" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部原因</SelectItem>
              {Object.entries(reasonConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="严重程度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部程度</SelectItem>
              {Object.entries(severityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
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
                className="text-green-600"
                onClick={() => bulkApproveMutation.mutate()}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                批量通过
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => bulkBlockMutation.mutate()}
                disabled={bulkBlockMutation.isPending}
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
          <Button variant="outline" size="sm" onClick={() => setShowSettingsSheet(true)}>
            <Settings className="mr-1 h-4 w-4" />
            设置
          </Button>
        </div>
      </div>

      {/* Flagged Links Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={allPendingSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={pendingItems.length === 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">链接</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">原因</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">严重程度</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">举报数</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">检测时间</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedIds.includes(link.id)}
                        onCheckedChange={(checked) => handleSelectOne(link.id, !!checked)}
                        disabled={link.status !== 'pending'}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-primary">{link.shortUrl}</p>
                        <p className="truncate text-sm text-gray-500">{link.destinationUrl}</p>
                        {link.autoDetected && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <Shield className="mr-1 h-3 w-3" />
                            自动检测
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{link.userName}</p>
                        <p className="text-sm text-gray-500">{link.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={reasonConfig[link.reason]?.color}>
                        {reasonConfig[link.reason]?.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={severityConfig[link.severity]?.color}>
                        {severityConfig[link.severity]?.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={statusConfig[link.status]?.color}>
                        {statusConfig[link.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                        onClick={() => {
                          setSelectedLink(link);
                          setShowReportsSheet(true);
                        }}
                      >
                        <Flag className="h-4 w-4" />
                        <span>{link.reportCount}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(link.detectedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLink(link)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {link.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => approveMutation.mutate(link.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => {
                                setSelectedLink(link);
                              }}
                              disabled={blockMutation.isPending}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    暂无待审核内容
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-gray-500">
              共 {data.total} 条记录，第 {data.page} / {data.totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= data.totalPages}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedLink && !showReportsSheet} onOpenChange={() => setSelectedLink(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审核链接</DialogTitle>
            <DialogDescription>查看链接详情并做出审核决定</DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">详情</TabsTrigger>
                <TabsTrigger value="history">历史记录</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{selectedLink.shortUrl}</p>
                      <a
                        href={selectedLink.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                      >
                        {selectedLink.destinationUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig[selectedLink.status]?.color}>
                        {statusConfig[selectedLink.status]?.label}
                      </Badge>
                      <Badge className={severityConfig[selectedLink.severity]?.color}>
                        {severityConfig[selectedLink.severity]?.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">用户</label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{selectedLink.userName}</p>
                        <p className="text-sm text-gray-500">{selectedLink.userEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">举报原因</label>
                    <Badge className={reasonConfig[selectedLink.reason]?.color}>
                      {reasonConfig[selectedLink.reason]?.label}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">举报次数</label>
                    <p className="font-medium">{selectedLink.reportCount}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">检测方式</label>
                    <p className="font-medium">
                      {selectedLink.autoDetected ? '自动检测' : '用户举报'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">检测时间</label>
                    <p className="font-medium">{formatDate(selectedLink.detectedAt)}</p>
                  </div>
                  {selectedLink.reviewedAt && (
                    <div>
                      <label className="text-sm text-gray-500">审核时间</label>
                      <p className="font-medium">{formatDate(selectedLink.reviewedAt)}</p>
                      {selectedLink.reviewedBy && (
                        <p className="text-sm text-gray-500">by {selectedLink.reviewedBy}</p>
                      )}
                    </div>
                  )}
                </div>

                {selectedLink.status === 'pending' && (
                  <>
                    <div>
                      <label className="text-sm text-gray-500">审核备注</label>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="输入审核备注（可选）"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="blockUser"
                        checked={blockUser}
                        onCheckedChange={(checked) => setBlockUser(!!checked)}
                      />
                      <label htmlFor="blockUser" className="text-sm">
                        同时封禁该用户账户
                      </label>
                    </div>
                  </>
                )}

                {selectedLink.notes && (
                  <div>
                    <label className="text-sm text-gray-500">审核备注</label>
                    <p className="rounded-lg bg-gray-50 p-3 text-sm">{selectedLink.notes}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="history" className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">审核历史记录</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-3 border-l-2 border-yellow-400 pl-4">
                      <div>
                        <p className="font-medium">链接被标记</p>
                        <p className="text-sm text-gray-500">{formatDate(selectedLink.detectedAt)}</p>
                        <p className="text-sm">
                          {selectedLink.autoDetected ? '系统自动检测' : '用户举报'}
                        </p>
                      </div>
                    </div>
                    {selectedLink.reviewedAt && (
                      <div
                        className={`flex items-start gap-3 border-l-2 pl-4 ${
                          selectedLink.status === 'approved'
                            ? 'border-green-400'
                            : selectedLink.status === 'blocked'
                            ? 'border-red-400'
                            : 'border-gray-400'
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            {selectedLink.status === 'approved'
                              ? '审核通过'
                              : selectedLink.status === 'blocked'
                              ? '链接封禁'
                              : '审核拒绝'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(selectedLink.reviewedAt)}
                          </p>
                          {selectedLink.reviewedBy && (
                            <p className="text-sm">操作人: {selectedLink.reviewedBy}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLink(null)}>
              取消
            </Button>
            {selectedLink?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-green-600"
                  onClick={() => approveMutation.mutate(selectedLink.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  通过
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => blockMutation.mutate(selectedLink.id)}
                  disabled={blockMutation.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  封禁
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports Sheet */}
      <Sheet open={showReportsSheet} onOpenChange={setShowReportsSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>举报详情</SheetTitle>
            <SheetDescription>
              {selectedLink?.shortUrl} 的举报记录
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {reports?.length ? (
              reports.map((report) => (
                <div key={report.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{report.reporterEmail}</p>
                      <Badge className={reasonConfig[report.reason]?.color || 'bg-gray-100'}>
                        {reasonConfig[report.reason]?.label || report.reason}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(report.createdAt)}</p>
                  </div>
                  {report.description && (
                    <p className="mt-2 text-sm">{report.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">暂无举报记录</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>审核设置</SheetTitle>
            <SheetDescription>配置自动审核规则和阈值</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">自动封禁规则</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用自动检测</p>
                  <p className="text-sm text-gray-500">使用机器学习检测恶意链接</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自动封禁钓鱼链接</p>
                  <p className="text-sm text-gray-500">检测到钓鱼网站时自动封禁</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自动封禁恶意软件</p>
                  <p className="text-sm text-gray-500">检测到恶意软件时自动封禁</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">举报阈值</h4>
              <div>
                <label className="text-sm text-gray-500">自动封禁阈值（举报次数）</label>
                <Input type="number" defaultValue={10} className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-gray-500">自动升级严重程度阈值</label>
                <Input type="number" defaultValue={5} className="mt-1" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">通知设置</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">严重威胁邮件通知</p>
                  <p className="text-sm text-gray-500">检测到严重威胁时发送邮件</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">每日摘要</p>
                  <p className="text-sm text-gray-500">发送每日审核统计摘要</p>
                </div>
                <Switch />
              </div>
            </div>

            <Button className="w-full">保存设置</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
