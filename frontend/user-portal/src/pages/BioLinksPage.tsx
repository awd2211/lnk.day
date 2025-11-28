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
import { useToast } from '@/hooks/use-toast';
import {
  useBioLinks,
  useCreateBioLink,
  useDeleteBioLink,
  useToggleBioLinkPublish,
  BioLink,
} from '@/hooks/useBioLinks';
import { cn } from '@/lib/utils';

export default function BioLinksPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState({ slug: '', title: '', description: '' });

  // Queries
  const { data: bioLinks, isLoading } = useBioLinks();

  // Mutations
  const createBioLink = useCreateBioLink();
  const deleteBioLink = useDeleteBioLink();
  const togglePublish = useToggleBioLinkPublish();

  const handleCreate = async () => {
    if (!formData.slug.trim() || !formData.title.trim()) return;

    try {
      const bioLink = await createBioLink.mutateAsync({
        slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
      });
      setIsCreateDialogOpen(false);
      setFormData({ slug: '', title: '', description: '' });
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

  const handleDelete = async (bioLink: BioLink) => {
    if (!confirm(`确定要删除 "${bioLink.title}" 吗？此操作不可撤销。`)) return;

    try {
      await deleteBioLink.mutateAsync(bioLink.id);
      toast({ title: 'Bio Link 已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (bioLink: BioLink) => {
    try {
      await togglePublish.mutateAsync(bioLink.id);
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

  const copyLink = async (slug: string) => {
    const url = `https://lnk.day/b/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
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
            {bioLinks.map((bioLink) => (
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
                          href={`https://lnk.day/b/${bioLink.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          lnk.day/b/{bioLink.slug}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() => copyLink(bioLink.slug)}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          {copiedSlug === bioLink.slug ? (
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
                            window.open(`https://lnk.day/b/${bioLink.slug}`, '_blank')
                          }
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          预览
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(bioLink)}
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

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新建 Bio Link</DialogTitle>
              <DialogDescription>创建一个新的个人主页</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="slug">页面地址 *</Label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                    lnk.day/b/
                  </span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      })
                    }
                    placeholder="my-page"
                    className="rounded-l-none"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  只能包含小写字母、数字和连字符
                </p>
              </div>

              <div>
                <Label htmlFor="title">页面标题 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="我的主页"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">简介</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                  !formData.slug.trim() ||
                  !formData.title.trim() ||
                  createBioLink.isPending
                }
              >
                {createBioLink.isPending ? '创建中...' : '创建并编辑'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
