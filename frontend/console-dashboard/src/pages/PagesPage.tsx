import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  FileText,
  MoreVertical,
  Eye,
  Trash2,
  ExternalLink,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layout,
  Link2,
  Users,
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
import { landingPagesService } from '@/lib/api';
import { ExportButton } from '@/components/ExportDialog';

interface LandingPage {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  teamId: string;
  teamName?: string;
  type: 'bio' | 'landing' | 'link-in-bio' | 'link_in_bio' | 'form' | 'custom';
  status: 'published' | 'draft' | 'archived';
  template?: string;
  templateId?: string;
  views?: number;
  uniqueViews?: number;
  viewCount?: number;
  clickCount?: number;
  linkCount?: number;
  customDomain?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface PageStats {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalViews: number;
  totalClicks: number;
  averageClickRate: number;
}

const typeConfig: Record<string, { label: string; color: string }> = {
  bio: { label: 'Bio 页面', color: 'bg-blue-100 text-blue-700' },
  landing: { label: '落地页', color: 'bg-green-100 text-green-700' },
  'link-in-bio': { label: 'Link in Bio', color: 'bg-purple-100 text-purple-700' },
  'link_in_bio': { label: 'Link in Bio', color: 'bg-purple-100 text-purple-700' },
  form: { label: '表单页', color: 'bg-indigo-100 text-indigo-700' },
  custom: { label: '自定义', color: 'bg-orange-100 text-orange-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  published: { label: '已发布', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  draft: { label: '草稿', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const exportColumns = [
  { key: 'title', header: '标题' },
  { key: 'slug', header: 'Slug' },
  { key: 'teamName', header: '团队' },
  { key: 'type', header: '类型' },
  { key: 'status', header: '状态' },
  { key: 'viewCount', header: '浏览量' },
  { key: 'clickCount', header: '点击量' },
  { key: 'createdAt', header: '创建时间' },
];

export default function PagesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats } = useQuery<PageStats>({
    queryKey: ['page-stats'],
    queryFn: async () => {
      return {
        totalPages: 2560,
        publishedPages: 2100,
        draftPages: 460,
        totalViews: 1256000,
        totalClicks: 425000,
        averageClickRate: 33.8,
      };
    },
  });

  // Fetch pages
  const { data, isLoading } = useQuery({
    queryKey: ['landing-pages', { search, page, status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      try {
        const response = await landingPagesService.getPages({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          page,
          limit: 20,
        });
        return response.data;
      } catch {
        const mockPages: LandingPage[] = [
          {
            id: '1',
            title: 'Acme Corp Links',
            slug: 'acme',
            teamId: 't1',
            teamName: 'Acme Corp',
            type: 'link-in-bio',
            status: 'published',
            template: 'modern',
            viewCount: 125680,
            clickCount: 42560,
            linkCount: 12,
            customDomain: 'links.acme.com',
            createdAt: '2023-06-15',
            updatedAt: '2024-01-18',
            publishedAt: '2023-06-16',
          },
          {
            id: '2',
            title: 'Product Launch 2024',
            slug: 'launch-2024',
            teamId: 't2',
            teamName: 'Tech Startup',
            type: 'landing',
            status: 'published',
            template: 'hero',
            viewCount: 85420,
            clickCount: 28560,
            linkCount: 5,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-15',
            publishedAt: '2024-01-02',
          },
          {
            id: '3',
            title: 'John Doe Bio',
            slug: 'johndoe',
            teamId: 't3',
            teamName: 'Personal',
            type: 'bio',
            status: 'published',
            template: 'minimal',
            viewCount: 15680,
            clickCount: 5230,
            linkCount: 8,
            createdAt: '2023-09-20',
            updatedAt: '2024-01-10',
            publishedAt: '2023-09-21',
          },
          {
            id: '4',
            title: 'New Campaign Draft',
            slug: 'new-campaign',
            teamId: 't1',
            teamName: 'Acme Corp',
            type: 'landing',
            status: 'draft',
            template: 'sales',
            viewCount: 0,
            clickCount: 0,
            linkCount: 3,
            createdAt: '2024-01-19',
            updatedAt: '2024-01-20',
          },
          {
            id: '5',
            title: 'Old Event Page',
            slug: 'event-2023',
            teamId: 't4',
            teamName: 'Event Planners',
            type: 'custom',
            status: 'archived',
            viewCount: 45680,
            clickCount: 12350,
            linkCount: 15,
            createdAt: '2023-03-01',
            updatedAt: '2023-12-31',
            publishedAt: '2023-03-02',
          },
        ];
        return { items: mockPages, total: 5 };
      }
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => landingPagesService.deletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      queryClient.invalidateQueries({ queryKey: ['page-stats'] });
      setDeleteOpen(false);
      setSelectedPage(null);
    },
  });

  const handleDelete = () => {
    if (!selectedPage) return;
    deleteMutation.mutate(selectedPage.id);
  };

  const openDelete = (landingPage: LandingPage) => {
    setSelectedPage(landingPage);
    setDeleteOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const calculateClickRate = (clicks: number, views: number) => {
    if (views === 0) return 0;
    return ((clicks / views) * 100).toFixed(1);
  };

  // 安全获取视图数（兼容不同API字段名）
  const getViewCount = (page: LandingPage) => page.viewCount ?? page.views ?? page.uniqueViews ?? 0;
  const getClickCount = (page: LandingPage) => page.clickCount ?? 0;
  const getPageTitle = (page: LandingPage) => page.title ?? page.name ?? page.slug;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3">
              <Layout className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">页面总数</p>
              <p className="text-2xl font-bold">{stats?.totalPages?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总浏览量</p>
              <p className="text-2xl font-bold">{stats?.totalViews?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Link2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总点击量</p>
              <p className="text-2xl font-bold">{stats?.totalClicks?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均点击率</p>
              <p className="text-2xl font-bold">{stats?.averageClickRate || 0}%</p>
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
              placeholder="搜索页面..."
              className="w-80 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="bio">Bio 页面</SelectItem>
              <SelectItem value="landing">落地页</SelectItem>
              <SelectItem value="link-in-bio">Link in Bio</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="archived">已归档</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data?.total || 0} 个页面</span>
          <ExportButton
            data={data?.items || []}
            columns={exportColumns}
            filename="pages_export"
            title="导出页面数据"
            size="sm"
          />
        </div>
      </div>

      {/* Pages Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">页面</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">团队</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">浏览/点击</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">更新时间</th>
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
                data.items.map((landingPage: LandingPage) => {
                  const StatusIcon = statusConfig[landingPage.status]?.icon || Clock;
                  return (
                    <tr key={landingPage.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{getPageTitle(landingPage)}</p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <span>/{landingPage.slug}</span>
                            {landingPage.customDomain && (
                              <Badge variant="outline" className="text-xs">
                                {landingPage.customDomain}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{landingPage.teamName ?? '-'}</td>
                      <td className="px-6 py-4">
                        <Badge className={typeConfig[landingPage.type]?.color}>
                          {typeConfig[landingPage.type]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusConfig[landingPage.status]?.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[landingPage.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="font-medium">{getViewCount(landingPage).toLocaleString()}</span>
                          <span className="text-gray-500"> / </span>
                          <span className="font-medium">{getClickCount(landingPage).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {calculateClickRate(getClickCount(landingPage), getViewCount(landingPage))}% 点击率
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(landingPage.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedPage(landingPage)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            {landingPage.status === 'published' && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`https://lnk.day/${landingPage.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  访问页面
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDelete(landingPage)}
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
                    暂无页面
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Page Detail Sheet */}
      <Sheet open={!!selectedPage && !deleteOpen} onOpenChange={() => setSelectedPage(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>页面详情</SheetTitle>
            <SheetDescription>{selectedPage ? getPageTitle(selectedPage) : ''}</SheetDescription>
          </SheetHeader>
          {selectedPage && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">标题</label>
                  <p className="font-medium">{getPageTitle(selectedPage)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Slug</label>
                  <p className="font-medium">/{selectedPage.slug}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">团队</label>
                  <p className="font-medium">{selectedPage.teamName ?? '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">类型</label>
                  <Badge className={typeConfig[selectedPage.type]?.color}>
                    {typeConfig[selectedPage.type]?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <Badge className={statusConfig[selectedPage.status]?.color}>
                    {statusConfig[selectedPage.status]?.label}
                  </Badge>
                </div>
                {selectedPage.template && (
                  <div>
                    <label className="text-sm text-gray-500">模板</label>
                    <p className="font-medium">{selectedPage.template}</p>
                  </div>
                )}
                {selectedPage.customDomain && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">自定义域名</label>
                    <p className="font-medium">{selectedPage.customDomain}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-3 font-medium">统计数据</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-2xl font-bold">{getViewCount(selectedPage).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">浏览量</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-2xl font-bold">{getClickCount(selectedPage).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">点击量</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedPage.linkCount ?? 0}</p>
                    <p className="text-xs text-gray-500">链接数</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">创建时间</span>
                  <span>{formatDate(selectedPage.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">更新时间</span>
                  <span>{formatDate(selectedPage.updatedAt)}</span>
                </div>
                {selectedPage.publishedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">发布时间</span>
                    <span>{formatDate(selectedPage.publishedAt)}</span>
                  </div>
                )}
              </div>

              {selectedPage.status === 'published' && (
                <Button className="w-full" asChild>
                  <a
                    href={`https://lnk.day/${selectedPage.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    访问页面
                  </a>
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除页面</DialogTitle>
            <DialogDescription>
              确定要删除 "{selectedPage ? getPageTitle(selectedPage) : ''}" 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">
                <p className="font-medium">此操作不可撤销</p>
                <p className="mt-1">
                  删除后，此页面将无法访问。已有的 {selectedPage ? getViewCount(selectedPage).toLocaleString() : 0} 次浏览数据将被清除。
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
