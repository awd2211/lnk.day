import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Link2,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Shield,
  Ban,
  RefreshCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  parentId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  reportCount: number;
  reportReasons?: string[];
  likes: number;
  dislikes: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
  reportedToday: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="h-3 w-3" /> },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  spam: { label: '垃圾评论', color: 'bg-gray-100 text-gray-700', icon: <Ban className="h-3 w-3" /> },
};

export default function CommentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 获取评论统计
  const { data: stats } = useQuery<CommentStats>({
    queryKey: ['comments-stats'],
    queryFn: () => api.get('/proxy/comments/stats').then((r) => r.data),
  });

  // 获取评论列表
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['comments', statusFilter, searchQuery, currentPage],
    queryFn: () =>
      api.get('/proxy/comments', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery || undefined,
          page: currentPage,
          limit: 20,
        },
      }).then((r) => r.data),
  });

  const comments: Comment[] = commentsData?.items || commentsData?.comments || [];
  const totalPages = commentsData?.pagination?.totalPages || commentsData?.totalPages || 1;

  // 审核评论
  const moderateMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject' | 'spam'; reason?: string }) =>
      api.post(`/proxy/comments/${id}/moderate`, { action, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['comments-stats'] });
      toast({ title: '成功', description: '评论已处理' });
      setShowDetailDialog(false);
      setRejectReason('');
    },
    onError: () => {
      toast({ title: '错误', description: '操作失败', variant: 'destructive' });
    },
  });

  // 删除评论
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proxy/comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['comments-stats'] });
      toast({ title: '成功', description: '评论已删除' });
      setShowDeleteDialog(false);
      setSelectedComment(null);
    },
    onError: () => {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    },
  });

  // 批量审核
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const batchModerateMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' | 'spam' }) =>
      api.post('/proxy/comments/batch-moderate', { ids, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['comments-stats'] });
      toast({ title: '成功', description: '批量操作完成' });
      setSelectedIds([]);
    },
    onError: () => {
      toast({ title: '错误', description: '批量操作失败', variant: 'destructive' });
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === comments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(comments.map((c) => c.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">评论管理</h2>
          <p className="text-muted-foreground">审核和管理用户评论</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['comments'] })}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全部评论</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审核</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已通过</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已拒绝</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">垃圾评论</CardTitle>
            <Ban className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.spam || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日举报</CardTitle>
            <Flag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.reportedToday || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索评论内容或用户..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                  <SelectItem value="spam">垃圾评论</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">已选 {selectedIds.length} 条</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchModerateMutation.mutate({ ids: selectedIds, action: 'approve' })}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  批量通过
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchModerateMutation.mutate({ ids: selectedIds, action: 'reject' })}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  批量拒绝
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchModerateMutation.mutate({ ids: selectedIds, action: 'spam' })}
                >
                  <Ban className="mr-1 h-4 w-4" />
                  标记垃圾
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === comments.length && comments.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>评论内容</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>页面</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>互动</TableHead>
                <TableHead>时间</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无评论
                  </TableCell>
                </TableRow>
              ) : (
                comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(comment.id)}
                        onChange={() => handleSelect(comment.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm">{truncateText(comment.content, 80)}</p>
                        {comment.reportCount > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                            <Flag className="h-3 w-3" />
                            被举报 {comment.reportCount} 次
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{comment.authorName}</p>
                          <p className="text-xs text-muted-foreground">{comment.authorEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Link2 className="h-3 w-3" />
                        {truncateText(comment.pageTitle || '未知页面', 20)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[comment.status]?.color}>
                        {STATUS_CONFIG[comment.status]?.icon}
                        <span className="ml-1">{STATUS_CONFIG[comment.status]?.label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {comment.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" />
                          {comment.dislikes}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(comment.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedComment(comment); setShowDetailDialog(true); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {comment.status !== 'approved' && (
                            <DropdownMenuItem onClick={() => moderateMutation.mutate({ id: comment.id, action: 'approve' })}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              通过
                            </DropdownMenuItem>
                          )}
                          {comment.status !== 'rejected' && (
                            <DropdownMenuItem onClick={() => { setSelectedComment(comment); setShowDetailDialog(true); }}>
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              拒绝
                            </DropdownMenuItem>
                          )}
                          {comment.status !== 'spam' && (
                            <DropdownMenuItem onClick={() => moderateMutation.mutate({ id: comment.id, action: 'spam' })}>
                              <Ban className="mr-2 h-4 w-4" />
                              标记垃圾
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSelectedComment(comment); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {currentPage} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 评论详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>评论详情</DialogTitle>
          </DialogHeader>
          {selectedComment && (
            <div className="space-y-4">
              {/* 评论内容 */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{selectedComment.content}</p>
              </div>

              {/* 用户信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">用户</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedComment.authorName}</p>
                      <p className="text-sm text-muted-foreground">{selectedComment.authorEmail}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">页面</Label>
                  <p className="mt-1">{selectedComment.pageTitle}</p>
                  <p className="text-sm text-muted-foreground">{selectedComment.pageUrl}</p>
                </div>
              </div>

              {/* 元信息 */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">IP 地址</Label>
                  <p>{selectedComment.ipAddress || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p>{formatDate(selectedComment.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">当前状态</Label>
                  <Badge className={STATUS_CONFIG[selectedComment.status]?.color + ' mt-1'}>
                    {STATUS_CONFIG[selectedComment.status]?.label}
                  </Badge>
                </div>
              </div>

              {/* 举报信息 */}
              {selectedComment.reportCount > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Flag className="h-4 w-4" />
                    <span className="font-medium">被举报 {selectedComment.reportCount} 次</span>
                  </div>
                  {selectedComment.reportReasons && selectedComment.reportReasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedComment.reportReasons.map((reason, i) => (
                        <Badge key={i} variant="outline" className="text-orange-700">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 拒绝原因输入 */}
              {selectedComment.status !== 'rejected' && (
                <div>
                  <Label>拒绝原因（可选）</Label>
                  <Textarea
                    placeholder="输入拒绝原因..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  关闭
                </Button>
                {selectedComment.status !== 'approved' && (
                  <Button
                    variant="default"
                    onClick={() => moderateMutation.mutate({ id: selectedComment.id, action: 'approve' })}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    通过
                  </Button>
                )}
                {selectedComment.status !== 'rejected' && (
                  <Button
                    variant="destructive"
                    onClick={() => moderateMutation.mutate({ id: selectedComment.id, action: 'reject', reason: rejectReason })}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    拒绝
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条评论吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedComment && deleteMutation.mutate(selectedComment.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
