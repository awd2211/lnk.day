import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Link2,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  BarChart3,
  Check,
  Palette,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import {
  useBioLinks,
  useCreateBioLink,
  useDeleteBioLink,
  useToggleBioLinkPublish,
  BioLink,
} from '@/hooks/useBioLinks';
import { cn } from '@/lib/utils';
import { getBioLinkPublicUrl } from '@/lib/api';

export default function BioLinksPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingBioLink, setDeletingBioLink] = useState<BioLink | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState({ username: '', name: '', bio: '' });

  // Pagination & sorting state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalViews' | 'totalClicks' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Queries
  const { data: bioLinksData, isLoading } = useBioLinks({
    search: search || undefined,
    page,
    limit,
    sortBy,
    sortOrder,
  });
  const bioLinks = bioLinksData?.items || [];
  const totalPages = bioLinksData ? Math.ceil(bioLinksData.total / limit) : 1;

  // Mutations
  const createBioLink = useCreateBioLink();
  const deleteBioLink = useDeleteBioLink();
  const togglePublish = useToggleBioLinkPublish();

  const handleCreate = async () => {
    if (!formData.username.trim() || !formData.name.trim()) return;

    try {
      const bioLink = await createBioLink.mutateAsync({
        username: formData.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        title: formData.name.trim(),
        profile: {
          name: formData.name.trim(),
          bio: formData.bio.trim() || undefined,
        },
      });
      setIsCreateDialogOpen(false);
      setFormData({ username: '', name: '', bio: '' });
      toast({ title: 'Bio Link 创建成功' });
      navigate(`/bio-links/${bioLink.id}/edit`);
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingBioLink) return;

    try {
      await deleteBioLink.mutateAsync(deletingBioLink.id);
      setDeletingBioLink(null);
      toast({ title: 'Bio Link 已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (bioLink: BioLink) => {
    try {
      await togglePublish.mutateAsync({ id: bioLink.id, isPublished: bioLink.isPublished });
      toast({
        title: bioLink.isPublished ? '已取消发布' : '已发布',
        description: bioLink.isPublished
          ? '页面不再公开可访问'
          : '页面现在可以公开访问',
      });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const copyLink = async (username: string) => {
    const url = getBioLinkPublicUrl(username);
    await navigator.clipboard.writeText(url);
    setCopiedSlug(username);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({ title: '链接已复制' });
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bio Link 页面</h1>
            <p className="text-muted-foreground">创建和管理你的个人主页</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建页面
          </Button>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="搜索页面..."
              className="w-full sm:w-64 pl-9"
            />
          </div>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(v) => {
              const [field, order] = v.split('-') as [typeof sortBy, 'ASC' | 'DESC'];
              setSortBy(field);
              setSortOrder(order);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-DESC">最新创建</SelectItem>
              <SelectItem value="createdAt-ASC">最早创建</SelectItem>
              <SelectItem value="totalViews-DESC">浏览最多</SelectItem>
              <SelectItem value="totalClicks-DESC">点击最多</SelectItem>
              <SelectItem value="title-ASC">名称 A-Z</SelectItem>
              <SelectItem value="title-DESC">名称 Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bio Links Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bioLinks && bioLinks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bioLinks.map((bioLink: BioLink) => (
              <Card
                key={bioLink.id}
                className="group relative overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Preview Image */}
                <div
                  className="h-32"
                  style={{
                    background: bioLink.theme.backgroundGradient || bioLink.theme.backgroundColor,
                  }}
                >
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    {bioLink.avatarUrl ? (
                      <img
                        src={bioLink.avatarUrl}
                        alt={bioLink.title}
                        className="mb-2 h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
                        style={{
                          backgroundColor: bioLink.theme.buttonColor,
                          color: bioLink.theme.buttonTextColor,
                        }}
                      >
                        {bioLink.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p
                      className="text-sm font-medium"
                      style={{ color: bioLink.theme.textColor }}
                    >
                      {bioLink.title}
                    </p>
                  </div>
                </div>

                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{bioLink.title}</h3>
                        <Badge
                          variant={bioLink.isPublished ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {bioLink.isPublished ? '已发布' : '草稿'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <a
                          href={getBioLinkPublicUrl(bioLink.username)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          lnk.day/u/{bioLink.username}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() => copyLink(bioLink.username)}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          {copiedSlug === bioLink.username ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/bio-links/${bioLink.id}/edit`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePublish(bioLink)}>
                          {bioLink.isPublished ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              取消发布
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              发布
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(getBioLinkPublicUrl(bioLink.username, true), '_blank')
                          }
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          预览
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingBioLink(bioLink)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Stats */}
                  {bioLink.analytics && (
                    <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {bioLink.analytics.views.toLocaleString()} 浏览
                      </span>
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {bioLink.analytics.clicks.toLocaleString()} 点击
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {bioLink.blocks?.length || 0} 区块
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium">创建你的第一个 Bio Link</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Bio Link 是一个简洁的个人主页，可以集中展示你的所有链接
              </p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                开始创建
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {bioLinksData && bioLinksData.total > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                共 {bioLinksData.total} 个页面
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                <option value={12}>每页 12 个</option>
                <option value={24}>每页 24 个</option>
                <option value={48}>每页 48 个</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新建 Bio Link</DialogTitle>
              <DialogDescription>创建一个新的个人主页</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="username">页面地址 *</Label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                    lnk.day/u/
                  </span>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                      })
                    }
                    placeholder="mypage"
                    className="rounded-l-none"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  只能包含小写字母、数字、下划线和连字符
                </p>
              </div>

              <div>
                <Label htmlFor="name">显示名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="我的主页"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bio">简介</Label>
                <Input
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder="一句话介绍"
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !formData.username.trim() ||
                  !formData.name.trim() ||
                  createBioLink.isPending
                }
              >
                {createBioLink.isPending ? '创建中...' : '创建并编辑'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!deletingBioLink}
          onOpenChange={(open) => !open && setDeletingBioLink(null)}
          title="删除 Bio Link"
          description={`确定要删除 "${deletingBioLink?.title}" 吗？此操作不可撤销。`}
          confirmText="删除"
          onConfirm={handleDelete}
          isLoading={deleteBioLink.isPending}
          variant="destructive"
        />
      </div>
    </Layout>
  );
}
