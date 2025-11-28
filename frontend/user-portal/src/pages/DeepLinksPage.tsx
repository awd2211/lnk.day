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
import { useToast } from '@/hooks/use-toast';
import { useLinks } from '@/hooks/useLinks';
import {
  useDeepLink,
  useCreateDeepLink,
  useUpdateDeepLink,
  useDeleteDeepLink,
  useResolveDeepLink,
  type DeepLinkIosConfig,
  type DeepLinkAndroidConfig,
} from '@/hooks/useDeepLinks';

export default function DeepLinksPage() {
  const { toast } = useToast();
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  // Form state
  const [iosConfig, setIosConfig] = useState<DeepLinkIosConfig>({});
  const [androidConfig, setAndroidConfig] = useState<DeepLinkAndroidConfig>({});
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [fallbackBehavior, setFallbackBehavior] = useState<'redirect' | 'app_store' | 'custom'>(
    'redirect'
  );
  const [testUserAgent, setTestUserAgent] = useState('');

  // Queries
  const { data: linksData, isLoading: linksLoading } = useLinks({ limit: 100 });
  const { data: deepLinkConfig, isLoading: configLoading } = useDeepLink(
    selectedLinkId || null
  );

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

    if (!confirm('确定要删除此深度链接配置吗？')) {
      return;
    }

    try {
      await deleteDeepLink.mutateAsync(selectedLinkId);
      setIosConfig({});
      setAndroidConfig({});
      setFallbackUrl('');
      setFallbackBehavior('redirect');
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

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold dark:text-white">深度链接</h1>
        <p className="text-gray-500 dark:text-gray-400">
          配置移动应用深度链接，实现从短链接直接打开 App
        </p>
      </div>

      {/* Link Selector */}
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
                  onClick={handleDelete}
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
    </Layout>
  );
}
