import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  MoreVertical,
  Eye,
  RefreshCw,
  Ban,
  CheckCircle,
  Clock,
  Download,
  Receipt,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { subscriptionsService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paidAt?: string;
  createdAt: string;
}

interface SubscriptionStats {
  totalMRR: number;
  totalARR: number;
  activeSubscriptions: number;
  newThisMonth: number;
  churnRate: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
}

const planConfig: Record<string, { label: string; color: string; price: { monthly: number; yearly: number } }> = {
  free: { label: '免费版', color: 'bg-gray-100 text-gray-700', price: { monthly: 0, yearly: 0 } },
  starter: { label: '入门版', color: 'bg-blue-100 text-blue-700', price: { monthly: 29, yearly: 199 } },
  pro: { label: '专业版', color: 'bg-purple-100 text-purple-700', price: { monthly: 99, yearly: 990 } },
  enterprise: { label: '企业版', color: 'bg-orange-100 text-orange-700', price: { monthly: 499, yearly: 4990 } },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: '活跃', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  canceled: { label: '已取消', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  past_due: { label: '逾期', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  trialing: { label: '试用中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  paused: { label: '已暂停', color: 'bg-gray-100 text-gray-700', icon: Ban },
};

const exportColumns = [
  { key: 'userName', header: '用户名' },
  { key: 'userEmail', header: '邮箱' },
  { key: 'plan', header: '套餐' },
  { key: 'status', header: '状态' },
  { key: 'amount', header: '金额' },
  { key: 'billingCycle', header: '计费周期' },
  { key: 'currentPeriodEnd', header: '到期时间' },
  { key: 'createdAt', header: '创建时间' },
];

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [newPlan, setNewPlan] = useState('');
  const [newBillingCycle, setNewBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [trialDays, setTrialDays] = useState(7);
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery<SubscriptionStats>({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const response = await subscriptionsService.getStats();
      return response.data;
    },
  });

  // Fetch subscriptions
  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', { search, page, plan: planFilter, status: statusFilter }],
    queryFn: async () => {
      const response = await subscriptionsService.getSubscriptions({
        search: search || undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 20,
      });
      return response.data;
    },
  });

  // Fetch invoices for selected subscription
  const { data: invoices } = useQuery({
    queryKey: ['subscription-invoices', selectedSubscription?.id],
    queryFn: async () => {
      if (!selectedSubscription) return [];
      const response = await subscriptionsService.getInvoices(selectedSubscription.id);
      return response.data as Invoice[];
    },
    enabled: !!selectedSubscription,
  });

  // Mutations
  const changePlanMutation = useMutation({
    mutationFn: (data: { id: string; plan: string; billingCycle: 'monthly' | 'yearly' }) =>
      subscriptionsService.changePlan(data.id, { plan: data.plan, billingCycle: data.billingCycle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      setChangePlanOpen(false);
      setSelectedSubscription(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (data: { id: string; immediately: boolean }) =>
      subscriptionsService.cancelSubscription(data.id, { immediately: data.immediately }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      setCancelOpen(false);
      setSelectedSubscription(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => subscriptionsService.reactivateSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  const extendTrialMutation = useMutation({
    mutationFn: (data: { id: string; days: number }) =>
      subscriptionsService.extendTrial(data.id, data.days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setExtendTrialOpen(false);
      setSelectedSubscription(null);
    },
  });

  const handleChangePlan = () => {
    if (!selectedSubscription || !newPlan) return;
    changePlanMutation.mutate({
      id: selectedSubscription.id,
      plan: newPlan,
      billingCycle: newBillingCycle,
    });
  };

  const handleCancel = () => {
    if (!selectedSubscription) return;
    cancelMutation.mutate({
      id: selectedSubscription.id,
      immediately: cancelImmediately,
    });
  };

  const handleExtendTrial = () => {
    if (!selectedSubscription) return;
    extendTrialMutation.mutate({
      id: selectedSubscription.id,
      days: trialDays,
    });
  };

  const openChangePlan = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setNewPlan(sub.plan);
    setNewBillingCycle(sub.billingCycle);
    setChangePlanOpen(true);
  };

  const openCancel = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setCancelImmediately(false);
    setCancelOpen(true);
  };

  const openExtendTrial = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setTrialDays(7);
    setExtendTrialOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">月度经常性收入 (MRR)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalMRR || 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">年度经常性收入 (ARR)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalARR || 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃订阅</p>
              <p className="text-2xl font-bold">{stats?.activeSubscriptions?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <ArrowUpCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">本月新增</p>
              <p className="text-2xl font-bold">+{stats?.newThisMonth || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <ArrowDownCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">流失率</p>
              <p className="text-2xl font-bold">{stats?.churnRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 font-semibold">套餐分布</h3>
        <div className="grid gap-4 md:grid-cols-5">
          {stats?.planDistribution?.map((item) => (
            <div key={item.plan} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Badge className={planConfig[item.plan]?.color}>
                  {planConfig[item.plan]?.label}
                </Badge>
                <span className="text-lg font-bold">{item.count.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                收入: {formatCurrency(item.revenue)}/月
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索用户..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="套餐" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部套餐</SelectItem>
              <SelectItem value="free">免费版</SelectItem>
              <SelectItem value="starter">入门版</SelectItem>
              <SelectItem value="pro">专业版</SelectItem>
              <SelectItem value="enterprise">企业版</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="canceled">已取消</SelectItem>
              <SelectItem value="past_due">逾期</SelectItem>
              <SelectItem value="trialing">试用中</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个订阅</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="subscriptions_export"
            title="导出订阅数据"
            size="sm"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">套餐</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">金额</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">周期</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">到期时间</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((sub: Subscription) => {
                  const StatusIcon = statusConfig[sub.status]?.icon || CheckCircle;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{sub.userName}</p>
                          <p className="text-sm text-gray-500">{sub.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={planConfig[sub.plan]?.color}>
                          {planConfig[sub.plan]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Badge className={statusConfig[sub.status]?.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig[sub.status]?.label}
                          </Badge>
                        </div>
                        {sub.cancelAtPeriodEnd && (
                          <span className="mt-1 block text-xs text-orange-500">
                            周期末取消
                          </span>
                        )}
                        {sub.status === 'trialing' && sub.trialEndsAt && (
                          <span className="mt-1 block text-xs text-yellow-600">
                            试用至 {formatDate(sub.trialEndsAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">{formatCurrency(sub.amount)}</td>
                      <td className="px-6 py-4 text-sm">
                        {sub.billingCycle === 'monthly' ? '月付' : '年付'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(sub.currentPeriodEnd)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSubscription(sub)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openChangePlan(sub)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              更改套餐
                            </DropdownMenuItem>
                            {sub.status === 'trialing' && (
                              <DropdownMenuItem onClick={() => openExtendTrial(sub)}>
                                <Clock className="mr-2 h-4 w-4" />
                                延长试用
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {sub.status === 'canceled' ? (
                              <DropdownMenuItem
                                onClick={() => reactivateMutation.mutate(sub.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                重新激活
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => openCancel(sub)}
                                className="text-red-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                取消订阅
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无订阅数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Detail Sheet */}
      <Sheet open={!!selectedSubscription && !changePlanOpen && !cancelOpen && !extendTrialOpen} onOpenChange={() => setSelectedSubscription(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>订阅详情</SheetTitle>
            <SheetDescription>{selectedSubscription?.userEmail}</SheetDescription>
          </SheetHeader>
          {selectedSubscription && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">基本信息</TabsTrigger>
                <TabsTrigger value="invoices" className="flex-1">发票记录</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">用户</label>
                    <p className="font-medium">{selectedSubscription.userName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">邮箱</label>
                    <p className="font-medium">{selectedSubscription.userEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">套餐</label>
                    <Badge className={planConfig[selectedSubscription.plan]?.color}>
                      {planConfig[selectedSubscription.plan]?.label}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <Badge className={statusConfig[selectedSubscription.status]?.color}>
                      {statusConfig[selectedSubscription.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">金额</label>
                    <p className="font-medium">{formatCurrency(selectedSubscription.amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">计费周期</label>
                    <p className="font-medium">
                      {selectedSubscription.billingCycle === 'monthly' ? '月付' : '年付'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">当前周期开始</label>
                    <p className="font-medium">{formatDate(selectedSubscription.currentPeriodStart)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">当前周期结束</label>
                    <p className="font-medium">{formatDate(selectedSubscription.currentPeriodEnd)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建时间</label>
                    <p className="font-medium">{formatDate(selectedSubscription.createdAt)}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openChangePlan(selectedSubscription)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    更改套餐
                  </Button>
                  {selectedSubscription.status !== 'canceled' && (
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      onClick={() => openCancel(selectedSubscription)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      取消订阅
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="mt-4 space-y-3">
                {invoices?.length ? (
                  invoices.map((invoice: Invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : invoice.status === 'refunded'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {invoice.status === 'paid'
                            ? '已支付'
                            : invoice.status === 'pending'
                            ? '待支付'
                            : invoice.status === 'refunded'
                            ? '已退款'
                            : '失败'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">暂无发票记录</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更改套餐</DialogTitle>
            <DialogDescription>
              为 {selectedSubscription?.userName} 更改订阅套餐
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择新套餐</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="选择套餐" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(planConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{config.label}</span>
                        <span className="text-gray-500">
                          - ${config.price.monthly}/月 或 ${config.price.yearly}/年
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>计费周期</Label>
              <Select
                value={newBillingCycle}
                onValueChange={(v) => setNewBillingCycle(v as 'monthly' | 'yearly')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月付</SelectItem>
                  <SelectItem value="yearly">年付 (省 2 个月)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newPlan && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  新金额: {formatCurrency(
                    newBillingCycle === 'monthly'
                      ? planConfig[newPlan]?.price.monthly || 0
                      : planConfig[newPlan]?.price.yearly || 0
                  )}
                  /{newBillingCycle === 'monthly' ? '月' : '年'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!newPlan || changePlanMutation.isPending}
            >
              {changePlanMutation.isPending ? '处理中...' : '确认更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消订阅</DialogTitle>
            <DialogDescription>
              确定要取消 {selectedSubscription?.userName} 的订阅吗？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">请谨慎操作</p>
                <p className="mt-1">
                  取消后用户将失去付费功能的访问权限。
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cancelImmediately}
                  onChange={(e) => setCancelImmediately(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">立即取消 (不等待计费周期结束)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? '处理中...' : '确认取消订阅'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={extendTrialOpen} onOpenChange={setExtendTrialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>延长试用期</DialogTitle>
            <DialogDescription>
              为 {selectedSubscription?.userName} 延长试用期
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>延长天数</Label>
              <Select
                value={String(trialDays)}
                onValueChange={(v) => setTrialDays(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="14">14 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedSubscription?.trialEndsAt && (
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p>当前试用结束: {formatDate(selectedSubscription.trialEndsAt)}</p>
                <p className="mt-1">
                  延长后结束: {formatDate(
                    new Date(
                      new Date(selectedSubscription.trialEndsAt).getTime() + trialDays * 24 * 60 * 60 * 1000
                    ).toISOString()
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTrialOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleExtendTrial}
              disabled={extendTrialMutation.isPending}
            >
              {extendTrialMutation.isPending ? '处理中...' : '确认延长'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
