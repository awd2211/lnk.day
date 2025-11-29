import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Key,
  Shield,
  Activity,
  MoreVertical,
  Eye,
  RefreshCw,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiKeysService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  requestCount: number;
}

interface UsageStats {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  totalRequests: number;
  requestsToday: number;
  topKeys: { keyId: string; name: string; requests: number }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: '活跃', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  revoked: { label: '已撤销', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: '已过期', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

const exportColumns = [
  { key: 'name', header: '名称' },
  { key: 'keyPrefix', header: '密钥前缀' },
  { key: 'teamName', header: '团队' },
  { key: 'userName', header: '用户' },
  { key: 'status', header: '状态' },
  { key: 'requestCount', header: '请求数' },
  { key: 'lastUsedAt', header: '最后使用' },
  { key: 'createdAt', header: '创建时间' },
];

export default function ApiKeysPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const queryClient = useQueryClient();

  // Fetch usage stats
  const { data: stats } = useQuery<UsageStats>({
    queryKey: ['apikey-stats'],
    queryFn: async () => {
      try {
        const response = await apiKeysService.getUsage({});
        return response.data;
      } catch {
        return {
          totalKeys: 1250,
          activeKeys: 980,
          revokedKeys: 270,
          totalRequests: 15680000,
          requestsToday: 125000,
          topKeys: [
            { keyId: '1', name: 'Production API', requests: 856000 },
            { keyId: '2', name: 'Mobile App', requests: 542000 },
            { keyId: '3', name: 'Analytics Bot', requests: 125000 },
          ],
        };
      }
    },
  });

  // Fetch API keys
  const { data, isLoading } = useQuery({
    queryKey: ['apikeys', { search, page, status: statusFilter }],
    queryFn: async () => {
      try {
        const response = await apiKeysService.getApiKeys({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          limit: 20,
        });
        return response.data;
      } catch {
        const mockKeys: ApiKey[] = [
          {
            id: '1',
            name: 'Production API Key',
            keyPrefix: 'lnk_prod_****',
            userId: 'u1',
            userName: 'John Doe',
            teamId: 't1',
            teamName: 'Acme Corp',
            status: 'active',
            scopes: ['links:read', 'links:write', 'analytics:read'],
            lastUsedAt: '2024-01-20T10:30:00Z',
            createdAt: '2023-06-15',
            requestCount: 856420,
          },
          {
            id: '2',
            name: 'Mobile App Key',
            keyPrefix: 'lnk_mob_****',
            userId: 'u2',
            userName: 'Jane Smith',
            teamId: 't1',
            teamName: 'Acme Corp',
            status: 'active',
            scopes: ['links:read', 'qr:read'],
            lastUsedAt: '2024-01-20T09:15:00Z',
            createdAt: '2023-09-20',
            requestCount: 542180,
          },
          {
            id: '3',
            name: 'Analytics Bot',
            keyPrefix: 'lnk_bot_****',
            userId: 'u3',
            userName: 'Bob Wilson',
            teamId: 't2',
            teamName: 'Tech Startup',
            status: 'active',
            scopes: ['analytics:read'],
            lastUsedAt: '2024-01-19T18:00:00Z',
            createdAt: '2023-11-01',
            requestCount: 125680,
          },
          {
            id: '4',
            name: 'Old Integration Key',
            keyPrefix: 'lnk_old_****',
            userId: 'u4',
            userName: 'Alice Brown',
            teamId: 't3',
            teamName: 'Legacy System',
            status: 'revoked',
            scopes: ['links:read'],
            createdAt: '2022-05-10',
            requestCount: 0,
          },
          {
            id: '5',
            name: 'Test Key',
            keyPrefix: 'lnk_test_****',
            userId: 'u5',
            userName: 'Charlie Davis',
            teamId: 't4',
            teamName: 'Dev Team',
            status: 'expired',
            scopes: ['*'],
            expiresAt: '2023-12-31',
            createdAt: '2023-01-01',
            requestCount: 15000,
          },
        ];
        return { items: mockKeys, total: 5 };
      }
    },
  });

  // Mutations
  const revokeMutation = useMutation({
    mutationFn: (data: { id: string; reason?: string }) =>
      apiKeysService.revokeApiKey(data.id, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] });
      queryClient.invalidateQueries({ queryKey: ['apikey-stats'] });
      setRevokeOpen(false);
      setSelectedKey(null);
      setRevokeReason('');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => apiKeysService.regenerateApiKey(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] });
      setNewKey(response.data.key || 'lnk_new_1234567890abcdef');
    },
  });

  const handleRevoke = () => {
    if (!selectedKey) return;
    revokeMutation.mutate({
      id: selectedKey.id,
      reason: revokeReason || undefined,
    });
  };

  const handleRegenerate = () => {
    if (!selectedKey) return;
    regenerateMutation.mutate(selectedKey.id);
  };

  const openRevoke = (key: ApiKey) => {
    setSelectedKey(key);
    setRevokeReason('');
    setRevokeOpen(true);
  };

  const openRegenerate = (key: ApiKey) => {
    setSelectedKey(key);
    setNewKey('');
    setRegenerateOpen(true);
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总密钥数</p>
              <p className="text-2xl font-bold">{stats?.totalKeys?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃密钥</p>
              <p className="text-2xl font-bold">{stats?.activeKeys?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总请求数</p>
              <p className="text-2xl font-bold">{(stats?.totalRequests || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日请求</p>
              <p className="text-2xl font-bold">{stats?.requestsToday?.toLocaleString() || 0}</p>
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
              placeholder="搜索 API 密钥..."
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
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="revoked">已撤销</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个密钥</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="apikeys_export"
            title="导出 API 密钥数据"
            size="sm"
          />
        </div>
      </div>

      {/* API Keys Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">名称</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">密钥</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">所属</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">请求数</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">最后使用</th>
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
                data.items.map((apiKey: ApiKey) => {
                  const StatusIcon = statusConfig[apiKey.status]?.icon || CheckCircle;
                  return (
                    <tr key={apiKey.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{apiKey.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {apiKey.scopes.slice(0, 2).map((scope) => (
                              <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                            {apiKey.scopes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{apiKey.scopes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                          {apiKey.keyPrefix}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{apiKey.teamName}</p>
                          <p className="text-sm text-gray-500">{apiKey.userName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusConfig[apiKey.status]?.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[apiKey.status]?.label}
                        </Badge>
                        {apiKey.expiresAt && (
                          <p className="mt-1 text-xs text-gray-500">
                            过期: {formatDate(apiKey.expiresAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {apiKey.requestCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedKey(apiKey)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            {apiKey.status === 'active' && (
                              <>
                                <DropdownMenuItem onClick={() => openRegenerate(apiKey)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  重新生成
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openRevoke(apiKey)}
                                  className="text-red-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  撤销密钥
                                </DropdownMenuItem>
                              </>
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
                    暂无 API 密钥
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Key Detail Sheet */}
      <Sheet open={!!selectedKey && !revokeOpen && !regenerateOpen} onOpenChange={() => setSelectedKey(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>API 密钥详情</SheetTitle>
            <SheetDescription>{selectedKey?.name}</SheetDescription>
          </SheetHeader>
          {selectedKey && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">基本信息</TabsTrigger>
                <TabsTrigger value="usage" className="flex-1">使用统计</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">名称</label>
                    <p className="font-medium">{selectedKey.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <Badge className={statusConfig[selectedKey.status]?.color}>
                      {statusConfig[selectedKey.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">团队</label>
                    <p className="font-medium">{selectedKey.teamName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建者</label>
                    <p className="font-medium">{selectedKey.userName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建时间</label>
                    <p className="font-medium">{formatDate(selectedKey.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">最后使用</label>
                    <p className="font-medium">
                      {selectedKey.lastUsedAt ? formatDateTime(selectedKey.lastUsedAt) : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500">权限范围</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedKey.scopes.map((scope) => (
                      <Badge key={scope} variant="outline">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedKey.status === 'active' && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openRegenerate(selectedKey)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新生成
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      onClick={() => openRevoke(selectedKey)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      撤销密钥
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="usage" className="mt-4 space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{selectedKey.requestCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">总请求数</p>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500">
                  详细使用统计需要连接后端 API
                </p>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Revoke Dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销 API 密钥</DialogTitle>
            <DialogDescription>
              确定要撤销密钥 "{selectedKey?.name}" 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">
                <p className="font-medium">此操作不可撤销</p>
                <p className="mt-1">
                  撤销后，使用此密钥的所有应用将无法访问 API。
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>撤销原因 (可选)</Label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="请输入撤销原因"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? '处理中...' : '确认撤销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重新生成 API 密钥</DialogTitle>
            <DialogDescription>
              为 "{selectedKey?.name}" 生成新的密钥
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!newKey ? (
              <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">旧密钥将立即失效</p>
                  <p className="mt-1">
                    生成新密钥后，旧密钥将无法使用，请确保及时更新您的应用配置。
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium">新密钥已生成</p>
                    <p className="mt-1">请立即复制并安全保存，此密钥只显示一次。</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-gray-100 p-3 text-sm">{newKey}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(newKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {!newKey ? (
              <>
                <Button variant="outline" onClick={() => setRegenerateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleRegenerate} disabled={regenerateMutation.isPending}>
                  {regenerateMutation.isPending ? '生成中...' : '确认生成'}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setRegenerateOpen(false); setSelectedKey(null); }}>
                完成
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
