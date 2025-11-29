import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Smartphone,
  Apple,
  MoreVertical,
  Eye,
  Trash2,
  Link2,
  BarChart3,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
import { deepLinksService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface DeepLink {
  id: string;
  name: string;
  shortUrl: string;
  teamId: string;
  teamName: string;
  iosUrl?: string;
  iosFallback?: string;
  androidUrl?: string;
  androidFallback?: string;
  webFallback: string;
  clickCount: number;
  iosClicks: number;
  androidClicks: number;
  webClicks: number;
  status: 'active' | 'disabled';
  createdAt: string;
}

interface DeepLinkStats {
  totalDeepLinks: number;
  activeDeepLinks: number;
  totalClicks: number;
  iosClicks: number;
  androidClicks: number;
  webClicks: number;
}

const exportColumns = [
  { key: 'name', header: '名称' },
  { key: 'shortUrl', header: '短链接' },
  { key: 'teamName', header: '团队' },
  { key: 'clickCount', header: '总点击' },
  { key: 'iosClicks', header: 'iOS点击' },
  { key: 'androidClicks', header: 'Android点击' },
  { key: 'webClicks', header: 'Web点击' },
  { key: 'status', header: '状态' },
  { key: 'createdAt', header: '创建时间' },
];

export default function DeepLinksPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDeepLink, setSelectedDeepLink] = useState<DeepLink | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery<DeepLinkStats>({
    queryKey: ['deeplink-stats'],
    queryFn: async () => {
      return {
        totalDeepLinks: 1250,
        activeDeepLinks: 1180,
        totalClicks: 856000,
        iosClicks: 385200,
        androidClicks: 342400,
        webClicks: 128400,
      };
    },
  });

  // Fetch deep links
  const { data, isLoading } = useQuery({
    queryKey: ['deeplinks', { search, page, status: statusFilter }],
    queryFn: async () => {
      try {
        const response = await deepLinksService.getDeepLinks({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page,
          limit: 20,
        });
        return response.data;
      } catch {
        const mockDeepLinks: DeepLink[] = [
          {
            id: '1',
            name: 'App Download Campaign',
            shortUrl: 'lnk.day/app',
            teamId: 't1',
            teamName: 'Acme Corp',
            iosUrl: 'acme://open',
            iosFallback: 'https://apps.apple.com/app/acme',
            androidUrl: 'intent://open#Intent;package=com.acme.app;end',
            androidFallback: 'https://play.google.com/store/apps/details?id=com.acme.app',
            webFallback: 'https://acme.com/download',
            clickCount: 125680,
            iosClicks: 56556,
            androidClicks: 50272,
            webClicks: 18852,
            status: 'active',
            createdAt: '2023-06-15',
          },
          {
            id: '2',
            name: 'Product Page Deep Link',
            shortUrl: 'lnk.day/product123',
            teamId: 't2',
            teamName: 'E-Commerce Inc',
            iosUrl: 'ecom://product/123',
            iosFallback: 'https://apps.apple.com/app/ecom',
            androidUrl: 'intent://product/123#Intent;package=com.ecom.app;end',
            androidFallback: 'https://play.google.com/store/apps/details?id=com.ecom.app',
            webFallback: 'https://ecom.com/product/123',
            clickCount: 85420,
            iosClicks: 38439,
            androidClicks: 34168,
            webClicks: 12813,
            status: 'active',
            createdAt: '2023-09-20',
          },
          {
            id: '3',
            name: 'Social Share Link',
            shortUrl: 'lnk.day/share',
            teamId: 't1',
            teamName: 'Acme Corp',
            iosUrl: 'acme://share',
            androidUrl: 'intent://share#Intent;package=com.acme.app;end',
            webFallback: 'https://acme.com/share',
            clickCount: 42560,
            iosClicks: 19152,
            androidClicks: 17024,
            webClicks: 6384,
            status: 'active',
            createdAt: '2024-01-05',
          },
          {
            id: '4',
            name: 'Old Campaign Link',
            shortUrl: 'lnk.day/oldcamp',
            teamId: 't3',
            teamName: 'Legacy System',
            webFallback: 'https://legacy.com/campaign',
            clickCount: 5680,
            iosClicks: 0,
            androidClicks: 0,
            webClicks: 5680,
            status: 'disabled',
            createdAt: '2022-05-10',
          },
        ];
        return { items: mockDeepLinks, total: 4 };
      }
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deepLinksService.deleteDeepLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deeplinks'] });
      queryClient.invalidateQueries({ queryKey: ['deeplink-stats'] });
      setDeleteOpen(false);
      setSelectedDeepLink(null);
    },
  });

  const handleDelete = () => {
    if (!selectedDeepLink) return;
    deleteMutation.mutate(selectedDeepLink.id);
  };

  const openDelete = (deepLink: DeepLink) => {
    setSelectedDeepLink(deepLink);
    setDeleteOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Smartphone className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">深度链接总数</p>
              <p className="text-2xl font-bold">{stats?.totalDeepLinks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-3">
              <Apple className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">iOS 点击</p>
              <p className="text-2xl font-bold">{stats?.iosClicks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Android 点击</p>
              <p className="text-2xl font-bold">{stats?.androidClicks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Web 点击</p>
              <p className="text-2xl font-bold">{stats?.webClicks?.toLocaleString() || 0}</p>
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
              placeholder="搜索深度链接..."
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
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个深度链接</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="deeplinks_export"
            title="导出深度链接数据"
            size="sm"
          />
        </div>
      </div>

      {/* Deep Links Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">名称</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">团队</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">平台支持</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">点击分布</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">总点击</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
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
                data.items.map((deepLink: DeepLink) => (
                  <tr key={deepLink.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{deepLink.name}</p>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Link2 className="h-3 w-3" />
                          {deepLink.shortUrl}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{deepLink.teamName}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {deepLink.iosUrl && (
                          <Badge className="bg-gray-100 text-gray-700">
                            <Apple className="mr-1 h-3 w-3" />
                            iOS
                          </Badge>
                        )}
                        {deepLink.androidUrl && (
                          <Badge className="bg-green-100 text-green-700">
                            <Smartphone className="mr-1 h-3 w-3" />
                            Android
                          </Badge>
                        )}
                        <Badge className="bg-blue-100 text-blue-700">
                          <Globe className="mr-1 h-3 w-3" />
                          Web
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="bg-gray-500"
                          style={{ width: `${calculatePercentage(deepLink.iosClicks, deepLink.clickCount)}%` }}
                          title={`iOS: ${deepLink.iosClicks.toLocaleString()}`}
                        />
                        <div
                          className="bg-green-500"
                          style={{ width: `${calculatePercentage(deepLink.androidClicks, deepLink.clickCount)}%` }}
                          title={`Android: ${deepLink.androidClicks.toLocaleString()}`}
                        />
                        <div
                          className="bg-blue-500"
                          style={{ width: `${calculatePercentage(deepLink.webClicks, deepLink.clickCount)}%` }}
                          title={`Web: ${deepLink.webClicks.toLocaleString()}`}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        iOS {calculatePercentage(deepLink.iosClicks, deepLink.clickCount)}% /
                        Android {calculatePercentage(deepLink.androidClicks, deepLink.clickCount)}% /
                        Web {calculatePercentage(deepLink.webClicks, deepLink.clickCount)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {deepLink.clickCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          deepLink.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {deepLink.status === 'active' ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            活跃
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            已禁用
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedDeepLink(deepLink)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDelete(deepLink)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无深度链接
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Link Detail Sheet */}
      <Sheet open={!!selectedDeepLink && !deleteOpen} onOpenChange={() => setSelectedDeepLink(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>深度链接详情</SheetTitle>
            <SheetDescription>{selectedDeepLink?.name}</SheetDescription>
          </SheetHeader>
          {selectedDeepLink && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">短链接</label>
                  <p className="font-medium">{selectedDeepLink.shortUrl}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">团队</label>
                  <p className="font-medium">{selectedDeepLink.teamName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <Badge
                    className={
                      selectedDeepLink.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }
                  >
                    {selectedDeepLink.status === 'active' ? '活跃' : '已禁用'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="font-medium">{formatDate(selectedDeepLink.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">平台配置</h4>
                {selectedDeepLink.iosUrl && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Apple className="h-4 w-4" />
                      <span className="font-medium">iOS</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">App URL: {selectedDeepLink.iosUrl}</p>
                    {selectedDeepLink.iosFallback && (
                      <p className="text-sm text-gray-500">Fallback: {selectedDeepLink.iosFallback}</p>
                    )}
                  </div>
                )}
                {selectedDeepLink.androidUrl && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Android</span>
                    </div>
                    <p className="mt-2 break-all text-sm text-gray-500">
                      App URL: {selectedDeepLink.androidUrl}
                    </p>
                    {selectedDeepLink.androidFallback && (
                      <p className="text-sm text-gray-500">Fallback: {selectedDeepLink.androidFallback}</p>
                    )}
                  </div>
                )}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Web Fallback</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{selectedDeepLink.webFallback}</p>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">点击统计</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">iOS</span>
                    <span className="font-medium">{selectedDeepLink.iosClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Android</span>
                    <span className="font-medium">{selectedDeepLink.androidClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Web</span>
                    <span className="font-medium">{selectedDeepLink.webClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="font-medium">总计</span>
                    <span className="font-medium">{selectedDeepLink.clickCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除深度链接</DialogTitle>
            <DialogDescription>
              确定要删除 "{selectedDeepLink?.name}" 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">
                <p className="font-medium">此操作不可撤销</p>
                <p className="mt-1">
                  删除后，此深度链接将无法使用，已有的 {selectedDeepLink?.clickCount.toLocaleString()} 次点击数据将保留但链接失效。
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
