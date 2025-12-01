import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
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
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Ban,
  Flag,
  History,
  FileText,
  UserCircle,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { proxyService, campaignsService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

// Admin oversight status types
type CampaignStatus = 'active' | 'paused' | 'completed' | 'archived' | 'suspended' | 'flagged';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: 'marketing' | 'affiliate' | 'social' | 'email' | 'sms' | 'other';
  status: CampaignStatus;
  teamId: string;
  teamName?: string;
  ownerName?: string;
  ownerEmail?: string;
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
  // Admin oversight fields
  riskLevel?: RiskLevel;
  reportCount?: number;
  suspendedAt?: string;
  suspendedBy?: string;
  suspendReason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  suspendedCampaigns: number;
  flaggedCampaigns: number;
  totalClicks: number;
  totalConversions: number;
}

// Admin oversight status config
const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bgColor: string; icon: typeof Shield }> = {
  active: { label: '正常', color: 'text-green-600', bgColor: 'bg-green-100', icon: ShieldCheck },
  paused: { label: '已暂停', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Shield },
  completed: { label: '已完成', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: ShieldCheck },
  archived: { label: '已归档', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: Shield },
  suspended: { label: '已停用', color: 'text-red-600', bgColor: 'bg-red-100', icon: ShieldX },
  flagged: { label: '待审核', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: ShieldAlert },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: '低风险', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: '中风险', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: '高风险', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: '严重', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const TYPE_CONFIG: Record<string, { label: string }> = {
  marketing: { label: '营销' },
  affiliate: { label: '联盟' },
  social: { label: '社交' },
  email: { label: '邮件' },
  sms: { label: '短信' },
  other: { label: '其他' },
};

// Export columns for admin oversight
const campaignExportColumns = [
  { key: 'name', header: '活动名称' },
  { key: 'status', header: '状态', formatter: (v: string) => STATUS_CONFIG[v as CampaignStatus]?.label || v },
  { key: 'riskLevel', header: '风险等级', formatter: (v?: string) => v ? RISK_CONFIG[v as RiskLevel]?.label : '-' },
  { key: 'type', header: '类型', formatter: (v: string) => TYPE_CONFIG[v]?.label || v },
  { key: 'teamName', header: '团队' },
  { key: 'ownerName', header: '创建者' },
  { key: 'reportCount', header: '举报次数' },
  { key: 'totalLinks', header: '链接数' },
  { key: 'totalClicks', header: '点击数' },
  { key: 'conversions', header: '转化数' },
  { key: 'budget', header: '预算', formatter: (v?: number) => v ? `¥${v}` : '-' },
  { key: 'createdAt', header: '创建时间', formatter: (v: string) => new Date(v).toLocaleString() },
];

export default function CampaignsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Admin action dialogs
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; campaign: Campaign | null; isBulk: boolean }>({
    open: false,
    campaign: null,
    isBulk: false,
  });
  const [suspendReason, setSuspendReason] = useState('');
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; campaign: Campaign | null }>({
    open: false,
    campaign: null,
  });
  const [flagReason, setFlagReason] = useState('');

  const queryClient = useQueryClient();

  // Stats query with admin oversight metrics
  const { data: stats, isLoading: statsLoading } = useQuery<CampaignStats>({
    queryKey: ['campaign-stats-admin'],
    queryFn: async () => {
      try {
        const res = await campaignsService.getStats();
        return res.data || {
          totalCampaigns: 0,
          activeCampaigns: 0,
          suspendedCampaigns: 0,
          flaggedCampaigns: 0,
          totalClicks: 0,
          totalConversions: 0,
        };
      } catch {
        return {
          totalCampaigns: 0,
          activeCampaigns: 0,
          suspendedCampaigns: 0,
          flaggedCampaigns: 0,
          totalClicks: 0,
          totalConversions: 0,
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

  // Campaigns list with admin oversight fields
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaigns-admin', { page, statusFilter, riskFilter, typeFilter, teamFilter, search }],
    queryFn: async () => {
      const res = await campaignsService.getCampaigns({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        teamId: teamFilter !== 'all' ? teamFilter : undefined,
      });

      const rawItems = res.data?.items || res.data || [];
      let items = Array.isArray(rawItems) ? rawItems : [];

      // Client-side filtering for fields API may not support
      if (riskFilter !== 'all') {
        items = items.filter((c: Campaign) => c.riskLevel === riskFilter);
      }
      if (search) {
        items = items.filter((c: Campaign) =>
          (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.teamName || '').toLowerCase().includes(search.toLowerCase())
        );
      }

      return {
        items,
        total: res.data?.total || items.length,
        page: res.data?.page || page,
        totalPages: res.data?.totalPages || Math.ceil(items.length / 20),
      };
    },
  });

  // Admin action mutations
  const suspendMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      await Promise.all(ids.map(id => campaignsService.suspendCampaign(id, reason)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-admin'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats-admin'] });
      setSuspendDialog({ open: false, campaign: null, isBulk: false });
      setSuspendReason('');
      setSelectedIds([]);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      await campaignsService.resumeCampaign(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-admin'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats-admin'] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await campaignsService.flagCampaign(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-admin'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats-admin'] });
      setFlagDialog({ open: false, campaign: null });
      setFlagReason('');
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

  // Admin oversight stat cards
  const statCards = [
    {
      label: '总活动数',
      value: stats?.totalCampaigns || 0,
      icon: Megaphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '正常运行',
      value: stats?.activeCampaigns || 0,
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '已停用',
      value: stats?.suspendedCampaigns || 0,
      icon: ShieldX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: '待审核',
      value: stats?.flaggedCampaigns || 0,
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
            活动监管
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
                filename="campaigns-oversight"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索活动名称、创建者、团队..."
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
                <SelectItem value="paused">已暂停</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
                <SelectItem value="suspended">已停用</SelectItem>
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
                onClick={() => setSuspendDialog({ open: true, campaign: null, isBulk: true })}
              >
                <Ban className="mr-2 h-4 w-4" />
                批量停用
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
                        (data?.items?.length ?? 0) > 0 &&
                        selectedIds.length === (data?.items?.length ?? 0)
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 font-medium">活动名称</th>
                  <th className="p-3 font-medium">状态</th>
                  <th className="p-3 font-medium">风险</th>
                  <th className="p-3 font-medium">类型</th>
                  <th className="p-3 font-medium">团队/创建者</th>
                  <th className="p-3 font-medium text-right">链接</th>
                  <th className="p-3 font-medium text-right">点击</th>
                  <th className="p-3 font-medium">举报</th>
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
                    // Fallback for status - API may return different status values
                    const normalizedStatus = campaign.status && STATUS_CONFIG[campaign.status] ? campaign.status : 'active';
                    const statusConfig = STATUS_CONFIG[normalizedStatus];
                    const riskConfig = campaign.riskLevel && RISK_CONFIG[campaign.riskLevel] ? RISK_CONFIG[campaign.riskLevel] : null;
                    const typeConfig = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.utm;
                    const StatusIcon = statusConfig.icon;

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
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig?.bgColor || 'bg-gray-100'} ${statusConfig?.color || 'text-gray-600'}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig?.label || campaign.status}
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
                          <Badge variant="outline">{typeConfig?.label || campaign.type}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{campaign.teamName || '-'}</span>
                            </div>
                            {campaign.ownerName && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UserCircle className="h-3 w-3" />
                                <span>{campaign.ownerName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {campaign.totalLinks}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {campaign.totalClicks.toLocaleString()}
                        </td>
                        <td className="p-3">
                          {campaign.reportCount && campaign.reportCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {campaign.reportCount}
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
                              onClick={() => setSelectedCampaign(campaign)}
                              title="查看详情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {campaign.status === 'suspended' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resumeMutation.mutate(campaign.id)}
                                title="解除停用"
                                className="text-green-600 hover:text-green-700"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSuspendDialog({ open: true, campaign, isBulk: false })}
                                title="停用"
                                className="text-red-500 hover:text-red-600"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            {campaign.status !== 'flagged' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFlagDialog({ open: true, campaign })}
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedCampaign?.name}</SheetTitle>
          </SheetHeader>
          {selectedCampaign && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="security">安全信息</TabsTrigger>
                <TabsTrigger value="audit">审计日志</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
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
                    <p className="text-sm text-muted-foreground">创建者</p>
                    <p className="font-medium flex items-center gap-1">
                      <UserCircle className="h-4 w-4" />
                      {selectedCampaign.ownerName || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">预算</p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(selectedCampaign.budget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">日期范围</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedCampaign.startDate)} - {formatDate(selectedCampaign.endDate)}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
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
                    </CardContent>
                  </Card>
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
                      {selectedCampaign.riskLevel ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            RISK_CONFIG[selectedCampaign.riskLevel].bgColor
                          } ${RISK_CONFIG[selectedCampaign.riskLevel].color}`}
                        >
                          {RISK_CONFIG[selectedCampaign.riskLevel].label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未评估</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">举报次数</p>
                      <p className="font-medium">{selectedCampaign.reportCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Suspension Info */}
                {selectedCampaign.status === 'suspended' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-red-700">
                      <ShieldX className="h-4 w-4" />
                      停用信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-red-600">停用时间:</span>
                        <span>{selectedCampaign.suspendedAt ? new Date(selectedCampaign.suspendedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">操作者:</span>
                        <span>{selectedCampaign.suspendedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-red-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedCampaign.suspendReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flag Info */}
                {selectedCampaign.status === 'flagged' && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3 text-orange-700">
                      <Flag className="h-4 w-4" />
                      待审核信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记时间:</span>
                        <span>{selectedCampaign.flaggedAt ? new Date(selectedCampaign.flaggedAt).toLocaleString('zh-CN') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-600">标记者:</span>
                        <span>{selectedCampaign.flaggedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-orange-600">原因:</span>
                        <p className="mt-1 p-2 bg-white rounded">{selectedCampaign.flagReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">管理操作</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCampaign.status === 'suspended' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resumeMutation.mutate(selectedCampaign.id)}
                        className="text-green-600"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        解除停用
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSuspendDialog({ open: true, campaign: selectedCampaign, isBulk: false })}
                        className="text-red-600"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        停用活动
                      </Button>
                    )}
                    {selectedCampaign.status !== 'flagged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlagDialog({ open: true, campaign: selectedCampaign })}
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
                      { action: '活动创建', user: selectedCampaign.ownerEmail || 'unknown', time: selectedCampaign.createdAt },
                      ...(selectedCampaign.flaggedAt ? [{ action: '标记为可疑', user: selectedCampaign.flaggedBy || 'system', time: selectedCampaign.flaggedAt, reason: selectedCampaign.flagReason }] : []),
                      ...(selectedCampaign.suspendedAt ? [{ action: '停用活动', user: selectedCampaign.suspendedBy || 'admin', time: selectedCampaign.suspendedAt, reason: selectedCampaign.suspendReason }] : []),
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

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => {
        if (!open) {
          setSuspendDialog({ open: false, campaign: null, isBulk: false });
          setSuspendReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              {suspendDialog.isBulk ? '批量停用活动' : '停用活动'}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog.isBulk
                ? `确定要停用选中的 ${selectedIds.length} 个活动吗？停用后活动将无法正常运行。`
                : `确定要停用活动 "${suspendDialog.campaign?.name}" 吗？停用后活动将无法正常运行。`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">停用原因 *</Label>
              <Textarea
                id="suspend-reason"
                placeholder="请输入停用原因，将记录在审计日志中..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendDialog({ open: false, campaign: null, isBulk: false });
                setSuspendReason('');
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const ids = suspendDialog.isBulk
                  ? selectedIds
                  : suspendDialog.campaign
                  ? [suspendDialog.campaign.id]
                  : [];
                suspendMutation.mutate({ ids, reason: suspendReason });
              }}
              disabled={!suspendReason.trim()}
            >
              确认停用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagDialog.open} onOpenChange={(open) => {
        if (!open) {
          setFlagDialog({ open: false, campaign: null });
          setFlagReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              标记可疑活动
            </DialogTitle>
            <DialogDescription>
              将活动 "{flagDialog.campaign?.name}" 标记为可疑，需要进一步审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">标记原因 *</Label>
              <Textarea
                id="flag-reason"
                placeholder="请输入标记原因，例如：异常流量模式、可疑推广内容等..."
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
                setFlagDialog({ open: false, campaign: null });
                setFlagReason('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (flagDialog.campaign) {
                  flagMutation.mutate({ id: flagDialog.campaign.id, reason: flagReason });
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
