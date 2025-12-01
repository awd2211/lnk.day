import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Copy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { domainsService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface Domain {
  id: string;
  domain: string;
  teamId: string;
  teamName?: string;
  type?: 'redirect' | 'page' | 'both';
  status: 'pending' | 'active' | 'failed' | 'expired' | 'verifying';
  sslStatus: 'pending' | 'active' | 'failed' | 'none';
  verificationMethod?: 'dns' | 'file' | 'TXT' | 'CNAME';
  verificationToken?: string;
  isVerified?: boolean;
  linkCount?: number;
  createdAt: string;
  verifiedAt?: string;
  expiresAt?: string;
  sslExpiresAt?: string;
  dnsRecords?: Array<{ name: string; type: string; value: string }>;
  lastCheckError?: string;
}

// 辅助函数
const getDomainLinkCount = (domain: Domain) => domain.linkCount ?? 0;
const getDomainTeamName = (domain: Domain) => domain.teamName ?? domain.teamId;
const getDomainVerificationMethod = (domain: Domain) => {
  if (domain.verificationMethod === 'TXT' || domain.verificationMethod === 'dns') return 'dns';
  if (domain.verificationMethod === 'CNAME') return 'dns';
  return domain.verificationMethod || 'dns';
};
const getDomainStatus = (domain: Domain) => {
  if (domain.status === 'verifying') return 'pending';
  return domain.status;
};

interface DomainStats {
  totalDomains: number;
  activeDomains: number;
  pendingDomains: number;
  failedDomains: number;
  sslEnabled: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '验证中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  verifying: { label: '验证中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  active: { label: '已验证', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: '验证失败', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: '已过期', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

const sslStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'SSL 申请中', color: 'bg-yellow-100 text-yellow-700' },
  active: { label: 'SSL 已启用', color: 'bg-green-100 text-green-700' },
  failed: { label: 'SSL 失败', color: 'bg-red-100 text-red-700' },
  none: { label: '无 SSL', color: 'bg-gray-100 text-gray-700' },
};

const exportColumns = [
  { key: 'domain', header: '域名' },
  { key: 'teamName', header: '团队' },
  { key: 'status', header: '状态' },
  { key: 'sslStatus', header: 'SSL状态' },
  { key: 'linkCount', header: '链接数' },
  { key: 'createdAt', header: '创建时间' },
  { key: 'verifiedAt', header: '验证时间' },
];

export default function DomainsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery<DomainStats>({
    queryKey: ['domain-stats'],
    queryFn: async () => {
      const response = await domainsService.getStats();
      return response.data;
    },
  });

  // Fetch domains
  const { data, isLoading } = useQuery({
    queryKey: ['domains', { search, page, status: statusFilter }],
    queryFn: async () => {
      const response = await domainsService.getDomains({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 20,
      });
      // API 返回 { domains: [...], total: n } 或 { items: [...], total: n }
      const data = response.data;
      return {
        items: data.items || data.domains || [],
        total: data.total || 0,
      };
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => domainsService.deleteDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domain-stats'] });
      setDeleteOpen(false);
      setSelectedDomain(null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => domainsService.verifyDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });

  const handleDelete = () => {
    if (!selectedDomain) return;
    deleteMutation.mutate(selectedDomain.id);
  };

  const openDelete = (domain: Domain) => {
    setSelectedDomain(domain);
    setDeleteOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总域名数</p>
              <p className="text-2xl font-bold">{stats?.totalDomains || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已验证</p>
              <p className="text-2xl font-bold">{stats?.activeDomains || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">验证中</p>
              <p className="text-2xl font-bold">{stats?.pendingDomains || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">验证失败</p>
              <p className="text-2xl font-bold">{stats?.failedDomains || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">SSL 已启用</p>
              <p className="text-2xl font-bold">{stats?.sslEnabled || 0}</p>
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
              placeholder="搜索域名..."
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
              <SelectItem value="active">已验证</SelectItem>
              <SelectItem value="pending">验证中</SelectItem>
              <SelectItem value="failed">验证失败</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个域名</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="domains_export"
            title="导出域名数据"
            size="sm"
          />
        </div>
      </div>

      {/* Domains Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">域名</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">团队</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">SSL</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">链接数</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
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
                data.items.map((domain: Domain) => {
                  const StatusIcon = statusConfig[domain.status]?.icon || Clock;
                  return (
                    <tr key={domain.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{domain.domain}</span>
                          <a
                            href={`https://${domain.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{getDomainTeamName(domain)}</td>
                      <td className="px-6 py-4">
                        <Badge className={statusConfig[domain.status]?.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[domain.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={sslStatusConfig[domain.sslStatus]?.color}>
                          {sslStatusConfig[domain.sslStatus]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {getDomainLinkCount(domain).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(domain.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedDomain(domain)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            {(domain.status === 'pending' || domain.status === 'failed') && (
                              <DropdownMenuItem onClick={() => verifyMutation.mutate(domain.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                重新验证
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDelete(domain)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无域名
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Domain Detail Sheet */}
      <Sheet open={!!selectedDomain && !deleteOpen} onOpenChange={() => setSelectedDomain(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>域名详情</SheetTitle>
            <SheetDescription>{selectedDomain?.domain}</SheetDescription>
          </SheetHeader>
          {selectedDomain && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">域名</label>
                  <p className="font-medium">{selectedDomain.domain}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">团队</label>
                  <p className="font-medium">{getDomainTeamName(selectedDomain)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <Badge className={statusConfig[selectedDomain.status]?.color}>
                    {statusConfig[selectedDomain.status]?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">SSL 状态</label>
                  <Badge className={sslStatusConfig[selectedDomain.sslStatus]?.color}>
                    {sslStatusConfig[selectedDomain.sslStatus]?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">链接数</label>
                  <p className="font-medium">{getDomainLinkCount(selectedDomain).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">验证方式</label>
                  <p className="font-medium">
                    {getDomainVerificationMethod(selectedDomain) === 'dns' ? 'DNS 记录' : '文件验证'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="font-medium">{formatDate(selectedDomain.createdAt)}</p>
                </div>
                {selectedDomain.verifiedAt && (
                  <div>
                    <label className="text-sm text-gray-500">验证时间</label>
                    <p className="font-medium">{formatDate(selectedDomain.verifiedAt)}</p>
                  </div>
                )}
              </div>

              {selectedDomain.verificationToken && (
                <div>
                  <label className="text-sm text-gray-500">验证令牌</label>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded bg-gray-100 p-3 text-sm">
                      {selectedDomain.verificationToken}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedDomain.verificationToken!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    请添加以上 TXT 记录到您的 DNS 配置中
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {(selectedDomain.status === 'pending' || selectedDomain.status === 'failed') && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => verifyMutation.mutate(selectedDomain.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新验证
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => openDelete(selectedDomain)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除域名
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除域名</DialogTitle>
            <DialogDescription>
              确定要删除域名 "{selectedDomain?.domain}" 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">
                <p className="font-medium">此操作不可撤销</p>
                <p className="mt-1">
                  删除后，使用此域名的 {selectedDomain ? getDomainLinkCount(selectedDomain) : 0} 个链接将无法访问。
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
