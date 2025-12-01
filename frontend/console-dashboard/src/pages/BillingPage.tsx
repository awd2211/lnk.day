import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  DollarSign,
  Receipt,
  TrendingUp,
  Calendar,
  MoreVertical,
  Eye,
  RefreshCw,
  RotateCcw,
  Send,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
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
import { billingService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface Invoice {
  id: string;
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded' | 'canceled';
  description: string;
  paidAt?: string;
  createdAt: string;
  invoiceNumber: string;
  items: { description: string; amount: number; quantity: number }[];
}

interface Revenue {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingAmount: number;
  refundedAmount: number;
  invoiceCount: number;
  revenueByMonth: { month: string; revenue: number }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  paid: { label: '已支付', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  failed: { label: '支付失败', color: 'bg-red-100 text-red-700', icon: XCircle },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700', icon: RotateCcw },
  canceled: { label: '已取消', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const exportColumns = [
  { key: 'invoiceNumber', header: '发票号' },
  { key: 'teamName', header: '团队' },
  { key: 'userName', header: '用户' },
  { key: 'amount', header: '金额' },
  { key: 'status', header: '状态' },
  { key: 'description', header: '描述' },
  { key: 'createdAt', header: '创建时间' },
  { key: 'paidAt', header: '支付时间' },
];

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const queryClient = useQueryClient();

  // Fetch revenue stats
  const { data: revenue } = useQuery<Revenue>({
    queryKey: ['billing-revenue'],
    queryFn: async () => {
      const response = await billingService.getRevenue({});
      return response.data;
    },
  });

  // Fetch invoices
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, page, status: statusFilter }],
    queryFn: async () => {
      const response = await billingService.getInvoices({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 20,
      });
      return response.data;
    },
  });

  // Mutations
  const refundMutation = useMutation({
    mutationFn: (data: { id: string; amount?: number; reason?: string }) =>
      billingService.refundInvoice(data.id, { amount: data.amount, reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-revenue'] });
      setRefundOpen(false);
      setSelectedInvoice(null);
      setRefundAmount('');
      setRefundReason('');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => billingService.resendInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const handleRefund = () => {
    if (!selectedInvoice) return;
    refundMutation.mutate({
      id: selectedInvoice.id,
      amount: refundAmount ? Number(refundAmount) : undefined,
      reason: refundReason || undefined,
    });
  };

  const openRefund = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setRefundAmount(String(invoice.amount));
    setRefundReason('');
    setRefundOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总收入</p>
              <p className="text-2xl font-bold">{formatCurrency(revenue?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">本月收入</p>
              <p className="text-2xl font-bold">{formatCurrency(revenue?.monthlyRevenue || 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待支付</p>
              <p className="text-2xl font-bold">{formatCurrency(revenue?.pendingAmount || 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-3">
              <Receipt className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">发票数量</p>
              <p className="text-2xl font-bold">{revenue?.invoiceCount?.toLocaleString() || 0}</p>
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
              placeholder="搜索发票..."
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
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="paid">已支付</SelectItem>
              <SelectItem value="pending">待支付</SelectItem>
              <SelectItem value="failed">支付失败</SelectItem>
              <SelectItem value="refunded">已退款</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 张发票</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="invoices_export"
            title="导出发票数据"
            size="sm"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">发票号</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">客户</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">描述</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">金额</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">日期</th>
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
                data.items.map((invoice: Invoice) => {
                  const StatusIcon = statusConfig[invoice.status]?.icon || CheckCircle;
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{invoice.teamName}</p>
                          <p className="text-sm text-gray-500">{invoice.userName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{invoice.description}</td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusConfig[invoice.status]?.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[invoice.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              下载发票
                            </DropdownMenuItem>
                            {invoice.status === 'pending' && (
                              <DropdownMenuItem onClick={() => resendMutation.mutate(invoice.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                重发通知
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {invoice.status === 'paid' && (
                              <DropdownMenuItem
                                onClick={() => openRefund(invoice)}
                                className="text-red-600"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                退款
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
                    暂无发票数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Sheet */}
      <Sheet open={!!selectedInvoice && !refundOpen} onOpenChange={() => setSelectedInvoice(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>发票详情</SheetTitle>
            <SheetDescription>{selectedInvoice?.invoiceNumber}</SheetDescription>
          </SheetHeader>
          {selectedInvoice && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">团队</label>
                  <p className="font-medium">{selectedInvoice.teamName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">用户</label>
                  <p className="font-medium">{selectedInvoice.userName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">金额</label>
                  <p className="font-medium">
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <Badge className={statusConfig[selectedInvoice.status]?.color}>
                    {statusConfig[selectedInvoice.status]?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="font-medium">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
                {selectedInvoice.paidAt && (
                  <div>
                    <label className="text-sm text-gray-500">支付时间</label>
                    <p className="font-medium">{formatDate(selectedInvoice.paidAt)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-500">项目明细</label>
                <div className="mt-2 space-y-2">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  下载 PDF
                </Button>
                {selectedInvoice.status === 'paid' && (
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    onClick={() => openRefund(selectedInvoice)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    退款
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退款</DialogTitle>
            <DialogDescription>
              为发票 {selectedInvoice?.invoiceNumber} 处理退款
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">退款操作不可撤销</p>
                <p className="mt-1">退款后资金将返还给用户，请确认操作正确。</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>退款金额</Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={selectedInvoice?.amount}
              />
              <p className="text-xs text-gray-500">
                原始金额: {formatCurrency(selectedInvoice?.amount || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>退款原因 (可选)</Label>
              <Input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="请输入退款原因"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={refundMutation.isPending || !refundAmount}
            >
              {refundMutation.isPending ? '处理中...' : '确认退款'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
