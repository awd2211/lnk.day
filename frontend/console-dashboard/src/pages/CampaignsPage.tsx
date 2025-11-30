import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Trash2,
  Eye,
  Megaphone,
  Target,
  Calendar,
  DollarSign,
  Link2,
  MousePointerClick,
  TrendingUp,
  RefreshCw,
  Building2,
  BarChart3,
  Play,
  Pause,
  CheckCircle,
  Archive,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { proxyService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: 'marketing' | 'affiliate' | 'social' | 'email' | 'sms' | 'other';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  teamId: string;
  teamName?: string;
  channels: string[];
  utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  startDate?: string;
  endDate?: string;
  budget?: number;
  tags: string[];
  totalLinks: number;
  totalClicks: number;
  conversions: number;
  goal?: {
    type: 'clicks' | 'conversions' | 'revenue';
    target: number;
    current: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalClicks: number;
  totalConversions: number;
  totalBudget: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  active: { label: '进行中', color: 'text-green-600', bgColor: 'bg-green-100' },
  paused: { label: '已暂停', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  completed: { label: '已完成', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  archived: { label: '已归档', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

const TYPE_CONFIG: Record<string, { label: string }> = {
  marketing: { label: '营销' },
  affiliate: { label: '联盟' },
  social: { label: '社交' },
  email: { label: '邮件' },
  sms: { label: '短信' },
  other: { label: '其他' },
};

// Add campaign export columns
const campaignExportColumns = [
  { key: 'name', header: '活动名称' },
  { key: 'status', header: '状态', formatter: (v: string) => STATUS_CONFIG[v]?.label || v },
  { key: 'type', header: '类型', formatter: (v: string) => TYPE_CONFIG[v]?.label || v },
  { key: 'teamName', header: '团队' },
  { key: 'totalLinks', header: '链接数' },
  { key: 'totalClicks', header: '点击数' },
  { key: 'conversions', header: '转化数' },
  { key: 'budget', header: '预算', formatter: (v?: number) => v ? `¥${v}` : '-' },
  { key: 'startDate', header: '开始日期', formatter: (v?: string) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'endDate', header: '结束日期', formatter: (v?: string) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'createdAt', header: '创建时间', formatter: (v: string) => new Date(v).toLocaleString() },
];

export default function CampaignsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  // Stats query with mock fallback
  const { data: stats, isLoading: statsLoading } = useQuery<CampaignStats>({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      try {
        const res = await proxyService.getAnalyticsSummary();
        return res.data;
      } catch {
        // Mock data fallback
        return {
          totalCampaigns: 156,
          activeCampaigns: 42,
          totalClicks: 892450,
          totalConversions: 23890,
          totalBudget: 458000,
        };
      }
    },
  });

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

  // Campaigns list with mock fallback
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaigns', { page, statusFilter, typeFilter, teamFilter, search }],
    queryFn: async () => {
      try {
        const res = await proxyService.getCampaigns(teamFilter !== 'all' ? teamFilter : undefined, {
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });
        return res.data;
      } catch {
        // Mock data fallback
        const mockCampaigns: Campaign[] = Array.from({ length: 15 }, (_, i) => ({
          id: `campaign-${i + 1}`,
          name: `示例活动 ${i + 1}`,
          description: i % 3 === 0 ? '这是一个营销活动的描述文字' : undefined,
          type: ['marketing', 'social', 'email', 'affiliate'][i % 4] as Campaign['type'],
          status: ['active', 'draft', 'paused', 'completed', 'archived'][i % 5] as Campaign['status'],
          teamId: `team-${(i % 5) + 1}`,
          teamName: `团队 ${(i % 5) + 1}`,
          channels: ['email', 'social', 'paid'].slice(0, (i % 3) + 1),
          utmParams: {
            source: 'google',
            medium: 'cpc',
            campaign: `campaign_${i + 1}`,
          },
          startDate: new Date(Date.now() - i * 86400000 * 7).toISOString(),
          endDate: i % 2 === 0 ? new Date(Date.now() + 30 * 86400000).toISOString() : undefined,
          budget: i % 3 === 0 ? (i + 1) * 1000 : undefined,
          tags: ['Q4', '促销', '新品'].slice(0, (i % 3) + 1),
          totalLinks: Math.floor(Math.random() * 50) + 5,
          totalClicks: Math.floor(Math.random() * 10000) + 500,
          conversions: Math.floor(Math.random() * 500) + 20,
          goal: i % 2 === 0 ? {
            type: 'clicks' as const,
            target: 10000,
            current: Math.floor(Math.random() * 10000),
          } : undefined,
          createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
        }));

        let filtered = mockCampaigns;
        if (statusFilter !== 'all') {
          filtered = filtered.filter((c) => c.status === statusFilter);
        }
        if (typeFilter !== 'all') {
          filtered = filtered.filter((c) => c.type === typeFilter);
        }
        if (search) {
          filtered = filtered.filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase())
          );
        }

        return {
          items: filtered.slice((page - 1) * 20, page * 20),
          total: filtered.length,
          page,
          totalPages: Math.ceil(filtered.length / 20),
        };
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proxyService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      setDeleteCampaign(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => proxyService.deleteCampaign(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedIds(data.items.map((c: Campaign) => c.id));
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

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  const getGoalProgress = (campaign: Campaign) => {
    if (!campaign.goal) return null;
    const progress = (campaign.goal.current / campaign.goal.target) * 100;
    return Math.min(progress, 100);
  };

  const statCards = [
    {
      label: '总活动数',
      value: stats?.totalCampaigns || 0,
      icon: Megaphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '进行中',
      value: stats?.activeCampaigns || 0,
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '总点击',
      value: stats?.totalClicks || 0,
      icon: MousePointerClick,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: '总转化',
      value: stats?.totalConversions || 0,
      icon: TrendingUp,
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
            <Megaphone className="h-5 w-5" />
            活动管理
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
            {data?.items && (
              <ExportButton
                data={data.items}
                columns={campaignExportColumns}
                filename="campaigns"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索活动名称..."
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
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="paused">已暂停</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="marketing">营销</SelectItem>
                <SelectItem value="affiliate">联盟</SelectItem>
                <SelectItem value="social">社交</SelectItem>
                <SelectItem value="email">邮件</SelectItem>
                <SelectItem value="sms">短信</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择团队" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部团队</SelectItem>
                {teamsData?.items?.map((team: { id: string; name: string }) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
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
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                批量删除
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={
                        data?.items?.length > 0 &&
                        selectedIds.length === data?.items?.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 font-medium">活动名称</th>
                  <th className="p-3 font-medium">状态</th>
                  <th className="p-3 font-medium">类型</th>
                  <th className="p-3 font-medium">团队</th>
                  <th className="p-3 font-medium text-right">链接</th>
                  <th className="p-3 font-medium text-right">点击</th>
                  <th className="p-3 font-medium text-right">转化</th>
                  <th className="p-3 font-medium">日期</th>
                  <th className="p-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      加载中...
                    </td>
                  </tr>
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      暂无活动
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((campaign: Campaign) => {
                    const statusConfig = STATUS_CONFIG[campaign.status];
                    const typeConfig = TYPE_CONFIG[campaign.type];
                    const goalProgress = getGoalProgress(campaign);

                    return (
                      <tr
                        key={campaign.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.includes(campaign.id)}
                            onCheckedChange={(checked) =>
                              handleSelect(campaign.id, checked as boolean)
                            }
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            {campaign.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {campaign.description}
                              </p>
                            )}
                            {goalProgress !== null && (
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 w-20 rounded-full bg-gray-100">
                                  <div
                                    className={`h-full rounded-full ${
                                      goalProgress >= 100 ? 'bg-green-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${goalProgress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {goalProgress.toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusConfig?.bgColor || 'bg-gray-100'} ${statusConfig?.color || 'text-gray-600'}`}
                          >
                            {statusConfig?.label || campaign.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{typeConfig?.label || campaign.type}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{campaign.teamName || '-'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {campaign.totalLinks}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {campaign.totalClicks.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {campaign.conversions.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p>{formatDate(campaign.startDate)}</p>
                            {campaign.endDate && (
                              <p className="text-xs text-muted-foreground">
                                至 {formatDate(campaign.endDate)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCampaign(campaign)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteCampaign(campaign)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedCampaign?.name}</SheetTitle>
          </SheetHeader>
          {selectedCampaign && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="stats">统计数据</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        STATUS_CONFIG[selectedCampaign.status]?.bgColor || 'bg-gray-100'
                      } ${STATUS_CONFIG[selectedCampaign.status]?.color || 'text-gray-600'}`}
                    >
                      {STATUS_CONFIG[selectedCampaign.status]?.label || selectedCampaign.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">类型</p>
                    <p className="font-medium">{TYPE_CONFIG[selectedCampaign.type]?.label || selectedCampaign.type}</p>
                  </div>
                </div>

                {selectedCampaign.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">描述</p>
                    <p className="text-sm">{selectedCampaign.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">所属团队</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {selectedCampaign.teamName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">预算</p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(selectedCampaign.budget)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">开始日期</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedCampaign.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">结束日期</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedCampaign.endDate)}
                    </p>
                  </div>
                </div>

                {selectedCampaign.channels.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">渠道</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCampaign.channels.map((channel) => (
                        <Badge key={channel} variant="secondary">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCampaign.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">标签</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCampaign.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* UTM Parameters */}
                {Object.keys(selectedCampaign.utmParams).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">UTM 参数</p>
                    <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                      {selectedCampaign.utmParams.source && (
                        <p>utm_source: {selectedCampaign.utmParams.source}</p>
                      )}
                      {selectedCampaign.utmParams.medium && (
                        <p>utm_medium: {selectedCampaign.utmParams.medium}</p>
                      )}
                      {selectedCampaign.utmParams.campaign && (
                        <p>utm_campaign: {selectedCampaign.utmParams.campaign}</p>
                      )}
                      {selectedCampaign.utmParams.term && (
                        <p>utm_term: {selectedCampaign.utmParams.term}</p>
                      )}
                      {selectedCampaign.utmParams.content && (
                        <p>utm_content: {selectedCampaign.utmParams.content}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="text-sm">
                    {new Date(selectedCampaign.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Link2 className="h-5 w-5 mx-auto text-blue-500" />
                      <p className="mt-2 text-2xl font-bold">{selectedCampaign.totalLinks}</p>
                      <p className="text-xs text-muted-foreground">链接数</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MousePointerClick className="h-5 w-5 mx-auto text-green-500" />
                      <p className="mt-2 text-2xl font-bold">
                        {selectedCampaign.totalClicks.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">点击数</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-5 w-5 mx-auto text-purple-500" />
                      <p className="mt-2 text-2xl font-bold">
                        {selectedCampaign.conversions.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">转化数</p>
                    </CardContent>
                  </Card>
                </div>

                {selectedCampaign.goal && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        目标进度
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedCampaign.goal.type === 'clicks'
                            ? '点击目标'
                            : selectedCampaign.goal.type === 'conversions'
                            ? '转化目标'
                            : '收入目标'}
                        </span>
                        <span className="font-medium">
                          {selectedCampaign.goal.current.toLocaleString()} /{' '}
                          {selectedCampaign.goal.target.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            getGoalProgress(selectedCampaign)! >= 100
                              ? 'bg-green-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${getGoalProgress(selectedCampaign)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-center text-muted-foreground">
                        完成 {getGoalProgress(selectedCampaign)?.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      转化率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {selectedCampaign.totalClicks > 0
                        ? ((selectedCampaign.conversions / selectedCampaign.totalClicks) * 100).toFixed(2)
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCampaign.conversions} 转化 / {selectedCampaign.totalClicks} 点击
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCampaign} onOpenChange={() => setDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              确认删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除活动 "{deleteCampaign?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCampaign && deleteMutation.mutate(deleteCampaign.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              批量删除确认
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 个活动吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="bg-red-500 hover:bg-red-600"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
