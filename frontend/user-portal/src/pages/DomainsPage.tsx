import { useState } from 'react';
import {
  Plus,
  Globe,
  Shield,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ExternalLink,
  Star,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import {
  useDomains,
  useAddDomain,
  useRemoveDomain,
  useVerifyDomain,
  useSetDefaultDomain,
  useUpdateDomain,
  CustomDomain,
  DomainStatus,
  DOMAIN_STATUS_CONFIG,
} from '@/hooks/useDomains';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function DomainsPage() {
  const { toast } = useToast();

  // Pagination and sorting state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<'createdAt' | 'domain' | 'status' | 'verifiedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [statusFilter, setStatusFilter] = useState<'all' | DomainStatus>('all');

  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<CustomDomain | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  // Queries & Mutations
  const { data: domainsData, isLoading } = useDomains({
    search: search || undefined,
    page,
    limit,
    sortBy,
    sortOrder,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const domains = domainsData?.items || [];
  const total = domainsData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const addDomain = useAddDomain();
  const removeDomain = useRemoveDomain();
  const verifyDomain = useVerifyDomain();
  const setDefaultDomain = useSetDefaultDomain();
  const updateDomain = useUpdateDomain();

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) {
      toast({ title: '请输入有效的域名', variant: 'destructive' });
      return;
    }

    try {
      const domain = await addDomain.mutateAsync({ domain: newDomain.trim().toLowerCase() });
      setIsAddDialogOpen(false);
      setNewDomain('');
      setSelectedDomain(domain);
      toast({ title: '域名已添加', description: '请配置 DNS 记录完成验证' });
    } catch (error: any) {
      toast({
        title: '添加失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDomain = async () => {
    if (!deletingDomain) return;

    try {
      await removeDomain.mutateAsync(deletingDomain.id);
      if (selectedDomain?.id === deletingDomain.id) {
        setSelectedDomain(null);
      }
      setDeletingDomain(null);
      toast({ title: '域名已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleVerify = async (domain: CustomDomain) => {
    try {
      await verifyDomain.mutateAsync(domain.id);
      toast({ title: '验证请求已发送' });
    } catch {
      toast({ title: '验证失败', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (domain: CustomDomain) => {
    try {
      await setDefaultDomain.mutateAsync(domain.id);
      toast({ title: '已设为默认域名' });
    } catch {
      toast({ title: '设置失败', variant: 'destructive' });
    }
  };

  const handleToggleSSL = async (domain: CustomDomain) => {
    try {
      await updateDomain.mutateAsync({
        id: domain.id,
        data: { sslEnabled: !domain.sslEnabled },
      });
      toast({ title: domain.sslEnabled ? 'SSL 已禁用' : 'SSL 已启用' });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedRecord(key);
    setTimeout(() => setCopiedRecord(null), 2000);
    toast({ title: '已复制' });
  };

  const StatusBadge = ({ status }: { status: CustomDomain['status'] }) => {
    const config = DOMAIN_STATUS_CONFIG[status];
    return (
      <Badge className={cn(config.bgColor, config.color, 'border-0')}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">自定义域名</h1>
            <p className="text-muted-foreground">使用自己的域名创建短链接</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加域名
          </Button>
        </div>

        {/* Info Card */}
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertTitle>如何配置自定义域名</AlertTitle>
          <AlertDescription>
            1. 添加域名后，复制 DNS 记录配置到你的域名服务商
            <br />
            2. DNS 生效后点击验证，验证通过即可开始使用
            <br />
            3. 建议同时启用 SSL 以确保安全访问
          </AlertDescription>
        </Alert>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索域名..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value: 'all' | DomainStatus) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待验证</SelectItem>
                <SelectItem value="verifying">验证中</SelectItem>
                <SelectItem value="active">已激活</SelectItem>
                <SelectItem value="failed">验证失败</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-') as [typeof sortBy, 'ASC' | 'DESC'];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-DESC">创建时间（新→旧）</SelectItem>
                <SelectItem value="createdAt-ASC">创建时间（旧→新）</SelectItem>
                <SelectItem value="domain-ASC">域名（A→Z）</SelectItem>
                <SelectItem value="domain-DESC">域名（Z→A）</SelectItem>
                <SelectItem value="status-ASC">状态</SelectItem>
                <SelectItem value="verifiedAt-DESC">验证时间（新→旧）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Domains List */}
          <div className="space-y-4">
            <h2 className="font-medium">已添加的域名</h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : domains && domains.length > 0 ? (
              <div className="space-y-3">
                {domains.map((domain) => (
                  <Card
                    key={domain.id}
                    className={cn(
                      'cursor-pointer transition-shadow hover:shadow-md',
                      selectedDomain?.id === domain.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => setSelectedDomain(domain)}
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            domain.status === 'active' ? 'bg-green-100' : 'bg-muted'
                          )}
                        >
                          {domain.sslEnabled ? (
                            <ShieldCheck
                              className={cn(
                                'h-5 w-5',
                                domain.status === 'active'
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              )}
                            />
                          ) : (
                            <Globe
                              className={cn(
                                'h-5 w-5',
                                domain.status === 'active'
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              )}
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{domain.domain}</span>
                            {domain.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="mr-1 h-3 w-3" />
                                默认
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <StatusBadge status={domain.status} />
                            {domain.sslEnabled && (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                SSL
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingDomain(domain);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-4">
                  <EmptyState
                    icon={Globe}
                    title="暂无自定义域名"
                    description="添加域名后可使用自己的品牌创建短链接"
                    action={{
                      label: '添加域名',
                      onClick: () => setIsAddDialogOpen(true),
                      icon: Plus,
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  显示 {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} 共 {total} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Domain Detail */}
          <div>
            {selectedDomain ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedDomain.domain}</span>
                    <StatusBadge status={selectedDomain.status} />
                  </CardTitle>
                  <CardDescription>域名配置和 DNS 记录</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* DNS Records */}
                  {selectedDomain.status !== 'active' && (
                    <div>
                      <h4 className="mb-3 font-medium">DNS 配置</h4>
                      <div className="space-y-3">
                        {selectedDomain.dnsRecords.map((record, i) => (
                          <div
                            key={i}
                            className="rounded-lg border bg-muted/50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="outline">{record.type}</Badge>
                              <button
                                onClick={() =>
                                  copyToClipboard(record.value, `${i}-value`)
                                }
                                className="text-xs text-primary hover:underline"
                              >
                                {copiedRecord === `${i}-value` ? (
                                  <span className="flex items-center gap-1">
                                    <Check className="h-3 w-3" /> 已复制
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Copy className="h-3 w-3" /> 复制
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="grid gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">名称: </span>
                                <code className="rounded bg-muted px-1">
                                  {record.name}
                                </code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">值: </span>
                                <code className="rounded bg-muted px-1 break-all">
                                  {record.value}
                                </code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="mt-4 w-full"
                        onClick={() => handleVerify(selectedDomain)}
                        disabled={verifyDomain.isPending}
                      >
                        {verifyDomain.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        验证 DNS 配置
                      </Button>

                      {selectedDomain.errorMessage && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {selectedDomain.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Settings */}
                  {selectedDomain.status === 'active' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">SSL/HTTPS</p>
                          <p className="text-sm text-muted-foreground">
                            启用 HTTPS 安全访问
                          </p>
                        </div>
                        <Switch
                          checked={selectedDomain.sslEnabled}
                          onCheckedChange={() => handleToggleSSL(selectedDomain)}
                        />
                      </div>

                      {selectedDomain.sslEnabled && selectedDomain.sslExpiresAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          SSL 证书过期时间:{' '}
                          {new Date(selectedDomain.sslExpiresAt).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">设为默认</p>
                          <p className="text-sm text-muted-foreground">
                            新链接将使用此域名
                          </p>
                        </div>
                        <Button
                          variant={selectedDomain.isDefault ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleSetDefault(selectedDomain)}
                          disabled={selectedDomain.isDefault}
                        >
                          {selectedDomain.isDefault ? (
                            <>
                              <Star className="mr-2 h-4 w-4" />
                              当前默认
                            </>
                          ) : (
                            '设为默认'
                          )}
                        </Button>
                      </div>

                      {/* Preview */}
                      <div className="rounded-lg border p-4">
                        <p className="mb-2 text-sm font-medium">短链接预览</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                            {selectedDomain.sslEnabled ? 'https' : 'http'}://
                            {selectedDomain.domain}/example
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              window.open(
                                `${selectedDomain.sslEnabled ? 'https' : 'http'}://${selectedDomain.domain}`,
                                '_blank'
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="border-t pt-4 text-xs text-muted-foreground">
                    <p>添加时间: {new Date(selectedDomain.createdAt).toLocaleString()}</p>
                    {selectedDomain.verifiedAt && (
                      <p>
                        验证时间: {new Date(selectedDomain.verifiedAt).toLocaleString()}
                      </p>
                    )}
                    {selectedDomain.lastCheckedAt && (
                      <p>
                        最后检查: {new Date(selectedDomain.lastCheckedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Globe className="mb-4 h-12 w-12 opacity-50" />
                  <p>选择一个域名查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Add Domain Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>添加自定义域名</DialogTitle>
              <DialogDescription>
                输入你想要使用的域名，添加后需要配置 DNS 记录
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="domain">域名</Label>
                <Input
                  id="domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="link.example.com"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  建议使用子域名，如 link.yourdomain.com
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleAddDomain}
                disabled={!newDomain.trim() || addDomain.isPending}
              >
                {addDomain.isPending ? '添加中...' : '添加域名'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!deletingDomain}
          onOpenChange={(open) => !open && setDeletingDomain(null)}
          title="删除域名"
          description={`确定要删除域名 "${deletingDomain?.domain}" 吗？此操作不可撤销。`}
          confirmText="删除"
          onConfirm={handleRemoveDomain}
          isLoading={removeDomain.isPending}
          variant="destructive"
        />
      </div>
    </Layout>
  );
}
