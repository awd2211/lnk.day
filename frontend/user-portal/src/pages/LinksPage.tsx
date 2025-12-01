import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  ExternalLink,
  Trash2,
  Edit,
  BarChart3,
  QrCode,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Folder,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { LinkEditDialog } from '@/components/LinkEditDialog';
import { BulkOperationsBar } from '@/components/BulkOperationsBar';
import { FolderSidebar } from '@/components/links/FolderSidebar';
import { LinkQRDialog } from '@/components/links/LinkQRDialog';
import { EmptyState, NoSearchResultsEmptyState } from '@/components/EmptyState';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useLinks,
  useCreateLink,
  useUpdateLink,
  useDeleteLink,
  useBulkOperation,
  Link as LinkType,
} from '@/hooks/useLinks';
import { useBatchMoveToFolder } from '@/hooks/useBatchLinks';
import { useFolders } from '@/hooks/useFolders';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive' | 'archived';

export default function LinksPage() {
  const navigate = useNavigate();

  // Form state
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Sort state
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'clicks' | 'title' | 'shortCode'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderSidebar, setShowFolderSidebar] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // QR dialog state
  const [qrLink, setQrLink] = useState<LinkType | null>(null);

  // Delete confirmation state
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  const { toast } = useToast();

  // Queries
  const { data: folders } = useFolders();
  const { data: linksData, isLoading } = useLinks({
    page,
    limit,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
    folderId: selectedFolderId || undefined,
    sortBy,
    sortOrder,
  });
  // 单独获取所有链接的总数（用于侧边栏显示）
  const { data: allLinksData } = useLinks({ page: 1, limit: 1 });

  // Get current folder name
  const currentFolderName = selectedFolderId
    ? folders?.find((f) => f.id === selectedFolderId)?.name
    : null;

  // Mutations
  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const bulkOperation = useBulkOperation();
  const batchMoveToFolder = useBatchMoveToFolder();

  const links = linksData?.items || [];
  const totalPages = linksData ? Math.ceil(linksData.total / limit) : 1;

  // Sort handler
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      // 切换排序方向
      setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
    setPage(1); // 排序时重置到第一页
  };

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: typeof sortBy; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
    >
      {children}
      {sortBy === field ? (
        sortOrder === 'DESC' ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  );

  // Selection helpers
  const allSelected = links.length > 0 && links.every((link) => selectedIds.has(link.id));
  const someSelected = links.some((link) => selectedIds.has(link.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(links.map((link) => link.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 确保 URL 有协议前缀
  const ensureProtocol = (inputUrl: string): string => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return trimmed;
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // Handlers
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const normalizedUrl = ensureProtocol(url);

    try {
      await createLink.mutateAsync({
        originalUrl: normalizedUrl,
        customCode: customCode || undefined,
        title: title || undefined,
        folderId: selectedFolderId || undefined,
      });
      setUrl('');
      setCustomCode('');
      setTitle('');
      setShowAdvanced(false);
      toast({ title: '创建成功', description: '短链接已创建' });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (link: LinkType) => {
    const shortUrl = `https://lnk.day/${link.shortCode}`;
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: '已复制', description: shortUrl });
  };

  const handleDelete = async () => {
    if (!deletingLinkId) return;
    try {
      await deleteLink.mutateAsync(deletingLinkId);
      toast({ title: '删除成功' });
      setDeletingLinkId(null);
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleEditSave = async (data: any) => {
    if (!editingLink) return;
    try {
      await updateLink.mutateAsync({ id: editingLink.id, data });
      setEditingLink(null);
      toast({ title: '保存成功' });
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    try {
      await bulkOperation.mutateAsync({
        ids: Array.from(selectedIds),
        operation: 'delete',
      });
      setSelectedIds(new Set());
      toast({ title: '删除成功', description: `已删除 ${selectedIds.size} 个链接` });
    } catch {
      toast({ title: '批量删除失败', variant: 'destructive' });
    }
  };

  const handleBulkAddTags = async (tags: string[]) => {
    try {
      await bulkOperation.mutateAsync({
        ids: Array.from(selectedIds),
        operation: 'addTags',
        data: { tags },
      });
      setSelectedIds(new Set());
      toast({ title: '标签添加成功' });
    } catch {
      toast({ title: '添加标签失败', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const selectedLinks = links.filter((link) => selectedIds.has(link.id));
    const csv = [
      ['短链接', '原链接', '标题', '点击数', '创建时间'].join(','),
      ...selectedLinks.map((link) =>
        [
          `https://lnk.day/${link.shortCode}`,
          link.originalUrl,
          link.title || '',
          link.clicks,
          link.createdAt,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `links-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '导出成功' });
  };

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    try {
      await batchMoveToFolder.mutateAsync({
        linkIds: Array.from(selectedIds),
        folderId,
      });
      setSelectedIds(new Set());
      toast({
        title: '移动成功',
        description: `已将 ${selectedIds.size} 个链接移动到${folderId ? '指定文件夹' : '根目录'}`
      });
    } catch {
      toast({ title: '移动失败', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Folder Sidebar */}
        <div
          className={cn(
            'hidden shrink-0 transition-all duration-300 md:block',
            showFolderSidebar ? 'w-64' : 'w-0 overflow-hidden'
          )}
        >
          <FolderSidebar
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setPage(1);
            }}
            totalLinksCount={allLinksData?.total}
            className="h-full"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 md:flex"
                onClick={() => setShowFolderSidebar(!showFolderSidebar)}
                title={showFolderSidebar ? '隐藏文件夹' : '显示文件夹'}
              >
                {showFolderSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  {currentFolderName ? (
                    <>
                      <Folder className="h-6 w-6" style={{ color: folders?.find(f => f.id === selectedFolderId)?.color }} />
                      {currentFolderName}
                    </>
                  ) : (
                    '链接管理'
                  )}
                </h1>
                <p className="text-muted-foreground">
                  {currentFolderName ? `文件夹内的链接` : '创建和管理您的短链接'}
                </p>
              </div>
            </div>
          </div>

          {/* Create Link Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5" />
                创建新链接
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="输入长链接 URL，例如 https://example.com/very-long-url"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={createLink.isPending || !url}>
                    {createLink.isPending ? '创建中...' : '创建短链接'}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-primary hover:underline"
                >
                  {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
                </button>

                {showAdvanced && (
                  <div className="grid gap-4 rounded-lg border bg-muted/50 p-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="customCode">自定义短码（可选）</Label>
                      <div className="mt-1 flex items-center">
                        <span className="rounded-l border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                          lnk.day/
                        </span>
                        <Input
                          id="customCode"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value)}
                          placeholder="my-link"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="title">标题（可选）</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="链接标题"
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Filters & Bulk Operations */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索链接..."
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value: StatusFilter) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                  <SelectItem value="archived">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedIds.size > 0 && (
              <BulkOperationsBar
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                onDelete={handleBulkDelete}
                onAddTags={handleBulkAddTags}
                onMoveToFolder={handleBulkMoveToFolder}
                onExport={handleExport}
                isOperating={bulkOperation.isPending || batchMoveToFolder.isPending}
                folders={folders?.map(f => ({ id: f.id, name: f.name })) || []}
              />
            )}
          </div>

          {/* Links Table */}
          <Card>
            <ResponsiveTable>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="全选"
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader field="shortCode">短链接</SortableHeader>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">原链接</TableHead>
                  <TableHead className="text-center">
                    <SortableHeader field="clicks">点击</SortableHeader>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <SortableHeader field="createdAt">创建时间</SortableHeader>
                  </TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="mx-auto h-4 w-12" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : links.length > 0 ? (
                  links.map((link) => (
                    <TableRow key={link.id} className={selectedIds.has(link.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(link.id)}
                          onCheckedChange={() => toggleSelect(link.id)}
                          aria-label={`选择 ${link.shortCode}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://lnk.day/${link.shortCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              lnk.day/{link.shortCode}
                            </a>
                            <button
                              onClick={() => copyToClipboard(link)}
                              className="rounded p-1 hover:bg-muted"
                              title="复制"
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          {link.title && (
                            <p className="text-sm text-muted-foreground">{link.title}</p>
                          )}
                          {link.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {link.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {link.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{link.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate md:table-cell">
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <span className="truncate">{link.originalUrl}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{link.clicks.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(link.createdAt), 'MM/dd/yyyy', { locale: zhCN })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="查看统计"
                            onClick={() => navigate(`/links/${link.id}`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="生成二维码"
                            onClick={() => setQrLink(link)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="编辑"
                            onClick={() => setEditingLink(link)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="删除"
                            onClick={() => setDeletingLinkId(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48">
                      {search ? (
                        <NoSearchResultsEmptyState
                          searchTerm={search}
                          onClear={() => setSearch('')}
                          size="sm"
                        />
                      ) : (
                        <EmptyState
                          icon={Link2}
                          title="暂无链接"
                          description="在上方表单创建你的第一个短链接，开始追踪点击数据"
                          size="sm"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </ResponsiveTable>

            {/* Pagination */}
            {linksData && linksData.total > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    共 {linksData.total} 条记录
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value={10}>每页 10 条</option>
                    <option value={20}>每页 20 条</option>
                    <option value={50}>每页 50 条</option>
                    <option value={100}>每页 100 条</option>
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
          </Card>

          {/* Edit Dialog */}
          <LinkEditDialog
            link={editingLink}
            open={!!editingLink}
            onOpenChange={(open) => !open && setEditingLink(null)}
            onSave={handleEditSave}
            saving={updateLink.isPending}
            folders={folders?.map(f => ({ id: f.id, name: f.name })) || []}
          />

          {/* QR Code Dialog */}
          <LinkQRDialog
            link={qrLink}
            open={!!qrLink}
            onOpenChange={(open) => !open && setQrLink(null)}
          />

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            open={!!deletingLinkId}
            onOpenChange={(open) => !open && setDeletingLinkId(null)}
            title="删除链接"
            description="确定要删除这个链接吗？此操作不可撤销。"
            confirmText="删除"
            onConfirm={handleDelete}
            isLoading={deleteLink.isPending}
            variant="destructive"
          />
        </div>
      </div>
    </Layout>
  );
}
