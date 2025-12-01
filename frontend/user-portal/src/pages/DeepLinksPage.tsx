import { useState } from 'react';
import {
  Smartphone,
  Apple,
  Loader2,
  Link2,
  Save,
  Trash2,
  Play,
  ExternalLink,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useLinks } from '@/hooks/useLinks';
import {
  useDeepLinks,
  useDeepLink,
  useCreateDeepLink,
  useUpdateDeepLink,
  useDeleteDeepLink,
  useResolveDeepLink,
  type DeepLinkIosConfig,
  type DeepLinkAndroidConfig,
  type DeepLinkConfig,
} from '@/hooks/useDeepLinks';

export default function DeepLinksPage() {
  const { toast } = useToast();

  // View state: 'list' or 'config'
  const [view, setView] = useState<'list' | 'config'>('list');
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  // Pagination and sorting state for list view
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name' | 'enabled' | 'clicks' | 'installs'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Form state
  const [iosConfig, setIosConfig] = useState<DeepLinkIosConfig>({});
  const [androidConfig, setAndroidConfig] = useState<DeepLinkAndroidConfig>({});
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [fallbackBehavior, setFallbackBehavior] = useState<'redirect' | 'app_store' | 'custom'>(
    'redirect'
  );
  const [testUserAgent, setTestUserAgent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Queries
  const { data: linksData, isLoading: linksLoading } = useLinks({ limit: 100 });
  const { data: deepLinksData, isLoading: deepLinksLoading } = useDeepLinks({
    search: search || undefined,
    page,
    limit,
    sortBy,
    sortOrder,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: deepLinkConfig, isLoading: configLoading } = useDeepLink(
    selectedLinkId || null
  );

  const deepLinksList = deepLinksData?.items || [];
  const total = deepLinksData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Mutations
  const createDeepLink = useCreateDeepLink();
  const updateDeepLink = useUpdateDeepLink();
  const deleteDeepLink = useDeleteDeepLink();
  const resolveDeepLink = useResolveDeepLink();

  // Update form when config loads
  const handleLinkChange = (linkId: string) => {
    setSelectedLinkId(linkId);
    // Reset form
    setIosConfig({});
    setAndroidConfig({});
    setFallbackUrl('');
    setFallbackBehavior('redirect');
  };

  // Sync form with loaded config
  useState(() => {
    if (deepLinkConfig) {
      setIosConfig(deepLinkConfig.iosConfig || {});
      setAndroidConfig(deepLinkConfig.androidConfig || {});
      setFallbackUrl(deepLinkConfig.fallbackUrl || '');
      setFallbackBehavior(deepLinkConfig.fallbackBehavior);
    }
  });

  const handleSave = async () => {
    if (!selectedLinkId) return;

    const data = {
      iosConfig: Object.keys(iosConfig).length > 0 ? iosConfig : undefined,
      androidConfig: Object.keys(androidConfig).length > 0 ? androidConfig : undefined,
      fallbackUrl: fallbackUrl || undefined,
      fallbackBehavior,
    };

    try {
      if (deepLinkConfig) {
        await updateDeepLink.mutateAsync({ linkId: selectedLinkId, data });
        toast({ title: '配置已更新' });
      } else {
        await createDeepLink.mutateAsync({ linkId: selectedLinkId, data });
        toast({ title: '配置已创建' });
      }
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedLinkId || !deepLinkConfig) return;

    try {
      await deleteDeepLink.mutateAsync(selectedLinkId);
      setIosConfig({});
      setAndroidConfig({});
      setFallbackUrl('');
      setFallbackBehavior('redirect');
      setShowDeleteConfirm(false);
      toast({ title: '配置已删除' });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    if (!selectedLinkId) return;

    try {
      const response = await resolveDeepLink.mutateAsync({
        linkId: selectedLinkId,
        userAgent: testUserAgent || undefined,
      });

      const result = response.data as {
        platform: string;
        action: string;
        targetUrl: string;
      };

      toast({
        title: '测试结果',
        description: `平台: ${result.platform}, 行为: ${result.action}, 目标: ${result.targetUrl}`,
      });
    } catch (error: any) {
      toast({
        title: '测试失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const links = linksData?.items || [];
  const selectedLink = links.find((l) => l.id === selectedLinkId);
  const isSaving = createDeepLink.isPending || updateDeepLink.isPending;

  // Handle select from existing deeplink in list
  const handleSelectDeepLink = (dlinkId: string) => {
    // Find link ID from deeplink and switch to config view
    const dl = deepLinksList.find((d: any) => d.id === dlinkId);
    if (dl?.linkId) {
      setSelectedLinkId(dl.linkId);
      setView('config');
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">深度链接</h1>
          <p className="text-gray-500 dark:text-gray-400">
            配置移动应用深度链接，实现从短链接直接打开 App
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
          >
            已配置列表
          </Button>
          <Button
            variant={view === 'config' ? 'default' : 'outline'}
            onClick={() => setView('config')}
          >
            <Settings className="mr-2 h-4 w-4" />
            配置
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Search and Filter for List View */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索深度链接..."
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
                onValueChange={(value: 'all' | 'enabled' | 'disabled') => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="enabled">已启用</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
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
                  <SelectItem value="clicks-DESC">点击数（高→低）</SelectItem>
                  <SelectItem value="clicks-ASC">点击数（低→高）</SelectItem>
                  <SelectItem value="installs-DESC">安装数（高→低）</SelectItem>
                  <SelectItem value="name-ASC">名称（A→Z）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deep Links List */}
          {deepLinksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : deepLinksList.length > 0 ? (
            <div className="space-y-4">
              {deepLinksList.map((dl: any) => (
                <Card
                  key={dl.id}
                  className="cursor-pointer hover:border-primary/50"
                  onClick={() => handleSelectDeepLink(dl.id)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                        <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dl.name || `深度链接 #${dl.id.slice(0, 8)}`}</span>
                          <Badge variant={dl.enabled ? 'default' : 'secondary'}>
                            {dl.enabled ? '已启用' : '已禁用'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {dl.iosConfig && (
                            <span className="flex items-center gap-1">
                              <Apple className="h-3 w-3" /> iOS
                            </span>
                          )}
                          {dl.androidConfig && (
                            <span className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" /> Android
                            </span>
                          )}
                          <span>点击: {dl.clicks || 0}</span>
                          <span>安装: {dl.installs || 0}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

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
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
              <Smartphone className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                暂无深度链接配置
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                切换到配置视图为链接创建深度链接
              </p>
              <Button className="mt-4" onClick={() => setView('config')}>
                <Settings className="mr-2 h-4 w-4" />
                开始配置
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Config View - Link Selector */}
          <div className="mb-6 rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <Label>选择链接</Label>
            <Select value={selectedLinkId} onValueChange={handleLinkChange}>
              <SelectTrigger className="mt-2 w-full md:w-96">
                <SelectValue placeholder="选择要配置深度链接的链接" />
              </SelectTrigger>
              <SelectContent>
                {links.map((link) => (
                  <SelectItem key={link.id} value={link.id}>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <span>/{link.shortCode}</span>
                      {link.title && <span className="text-gray-500">- {link.title}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedLinkId ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
              <Smartphone className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                选择一个链接
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                选择链接后可以配置其深度链接行为
              </p>
            </div>
          ) : configLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
          {/* iOS Config */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                <CardTitle>iOS 配置</CardTitle>
              </div>
              <CardDescription>配置 iOS App 深度链接</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ios-store-id">App Store ID</Label>
                <Input
                  id="ios-store-id"
                  value={iosConfig.appStoreId || ''}
                  onChange={(e) => setIosConfig({ ...iosConfig, appStoreId: e.target.value })}
                  placeholder="123456789"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  在 App Store 链接中的数字 ID
                </p>
              </div>

              <div>
                <Label htmlFor="ios-bundle">Bundle ID</Label>
                <Input
                  id="ios-bundle"
                  value={iosConfig.bundleId || ''}
                  onChange={(e) => setIosConfig({ ...iosConfig, bundleId: e.target.value })}
                  placeholder="com.example.app"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ios-universal">Universal Link</Label>
                <Input
                  id="ios-universal"
                  value={iosConfig.universalLink || ''}
                  onChange={(e) => setIosConfig({ ...iosConfig, universalLink: e.target.value })}
                  placeholder="https://app.example.com/open"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  iOS Universal Link 格式
                </p>
              </div>

              <div>
                <Label htmlFor="ios-scheme">Custom Scheme</Label>
                <Input
                  id="ios-scheme"
                  value={iosConfig.customScheme || ''}
                  onChange={(e) => setIosConfig({ ...iosConfig, customScheme: e.target.value })}
                  placeholder="myapp://open"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  自定义 URL Scheme（备用）
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Android Config */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <CardTitle>Android 配置</CardTitle>
              </div>
              <CardDescription>配置 Android App 深度链接</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="android-package">Package Name</Label>
                <Input
                  id="android-package"
                  value={androidConfig.packageName || ''}
                  onChange={(e) =>
                    setAndroidConfig({ ...androidConfig, packageName: e.target.value })
                  }
                  placeholder="com.example.app"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="android-sha">SHA256 Fingerprint</Label>
                <Input
                  id="android-sha"
                  value={androidConfig.sha256Fingerprint || ''}
                  onChange={(e) =>
                    setAndroidConfig({ ...androidConfig, sha256Fingerprint: e.target.value })
                  }
                  placeholder="AA:BB:CC:DD..."
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  App 签名证书的 SHA256 指纹
                </p>
              </div>

              <div>
                <Label htmlFor="android-applink">App Link</Label>
                <Input
                  id="android-applink"
                  value={androidConfig.appLink || ''}
                  onChange={(e) =>
                    setAndroidConfig({ ...androidConfig, appLink: e.target.value })
                  }
                  placeholder="https://app.example.com/open"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Android App Link 格式
                </p>
              </div>

              <div>
                <Label htmlFor="android-scheme">Custom Scheme</Label>
                <Input
                  id="android-scheme"
                  value={androidConfig.customScheme || ''}
                  onChange={(e) =>
                    setAndroidConfig({ ...androidConfig, customScheme: e.target.value })
                  }
                  placeholder="myapp://open"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fallback Config */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>回退配置</CardTitle>
              <CardDescription>
                当用户未安装 App 或无法识别平台时的行为
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fallback-behavior">回退行为</Label>
                <Select
                  value={fallbackBehavior}
                  onValueChange={(v) =>
                    setFallbackBehavior(v as 'redirect' | 'app_store' | 'custom')
                  }
                >
                  <SelectTrigger className="mt-1 w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redirect">重定向到原始 URL</SelectItem>
                    <SelectItem value="app_store">跳转到应用商店</SelectItem>
                    <SelectItem value="custom">自定义 URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fallbackBehavior === 'custom' && (
                <div>
                  <Label htmlFor="fallback-url">自定义回退 URL</Label>
                  <Input
                    id="fallback-url"
                    value={fallbackUrl}
                    onChange={(e) => setFallbackUrl(e.target.value)}
                    placeholder="https://example.com/app-download"
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>测试深度链接</CardTitle>
              <CardDescription>模拟不同设备访问测试深度链接解析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <Label htmlFor="test-ua">User-Agent (可选)</Label>
                  <Input
                    id="test-ua"
                    value={testUserAgent}
                    onChange={(e) => setTestUserAgent(e.target.value)}
                    placeholder="留空使用默认值"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setTestUserAgent(
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
                      )
                    }
                  >
                    iOS
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setTestUserAgent(
                        'Mozilla/5.0 (Linux; Android 12; Pixel 6)'
                      )
                    }
                  >
                    Android
                  </Button>
                  <Button
                    onClick={handleTest}
                    disabled={resolveDeepLink.isPending || !deepLinkConfig}
                  >
                    {resolveDeepLink.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    测试
                  </Button>
                </div>
              </div>

              {!deepLinkConfig && (
                <div className="mt-4 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">请先保存配置后再进行测试</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between lg:col-span-2">
            <div>
              {deepLinkConfig && (
                <Badge
                  variant={deepLinkConfig.isActive ? 'default' : 'secondary'}
                  className={
                    deepLinkConfig.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : ''
                  }
                >
                  {deepLinkConfig.isActive ? '已启用' : '已禁用'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {deepLinkConfig && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteDeepLink.isPending}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除配置
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存配置
                  </>
                )}
              </Button>
            </div>
          </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除深度链接配置"
        description="确定要删除此深度链接配置吗？此操作不可撤销。"
        confirmText="删除"
        onConfirm={handleDelete}
        isLoading={deleteDeepLink.isPending}
        variant="destructive"
      />
    </Layout>
  );
}
