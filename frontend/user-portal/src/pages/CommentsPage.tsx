import { useState } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Trash2,
  Pin,
  PinOff,
  ThumbsUp,
  Reply,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings2,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

interface Comment {
  id: string;
  pageId: string;
  pageName: string;
  authorName: string;
  authorEmail?: string;
  authorWebsite?: string;
  authorAvatar?: string;
  content: string;
  status: CommentStatus;
  likes: number;
  ipAddress?: string;
  country?: string;
  city?: string;
  parentId?: string;
  isPinned: boolean;
  isOwnerReply: boolean;
  createdAt: string;
  replies?: Comment[];
}

interface GuestbookSettings {
  enabled: boolean;
  requireApproval: boolean;
  requireEmail: boolean;
  allowAnonymous: boolean;
  allowReplies: boolean;
  maxLength: number;
  placeholder: string;
  title: string;
  emptyMessage: string;
  successMessage: string;
  enableLikes: boolean;
  enableEmojis: boolean;
  sortOrder: 'newest' | 'oldest' | 'popular';
  displayCount: number;
  showAvatars: boolean;
  enableNotifications: boolean;
  notificationEmail?: string;
  blockedWords: string[];
  blockedIps: string[];
}

// Mock data
const mockComments: Comment[] = [
  {
    id: '1',
    pageId: 'page-1',
    pageName: '我的个人主页',
    authorName: '张三',
    authorEmail: 'zhangsan@example.com',
    content: '很棒的页面！设计非常精美，内容也很丰富。',
    status: 'pending',
    likes: 5,
    ipAddress: '192.168.1.1',
    country: '中国',
    city: '上海',
    isPinned: false,
    isOwnerReply: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    replies: [],
  },
  {
    id: '2',
    pageId: 'page-1',
    pageName: '我的个人主页',
    authorName: '李四',
    authorEmail: 'lisi@example.com',
    authorWebsite: 'https://lisi.com',
    content: '谢谢分享！我从你的链接中找到了很多有用的资源。',
    status: 'approved',
    likes: 12,
    ipAddress: '192.168.1.2',
    country: '中国',
    city: '北京',
    isPinned: true,
    isOwnerReply: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    replies: [
      {
        id: '2-1',
        pageId: 'page-1',
        pageName: '我的个人主页',
        authorName: '页面作者',
        content: '谢谢支持！如果有问题随时联系我。',
        status: 'approved',
        likes: 3,
        isPinned: false,
        isOwnerReply: true,
        createdAt: new Date(Date.now() - 82800000).toISOString(),
      },
    ],
  },
  {
    id: '3',
    pageId: 'page-2',
    pageName: '产品介绍页',
    authorName: 'Spammer',
    content: 'Buy cheap products at xxx.com!!!',
    status: 'spam',
    likes: 0,
    ipAddress: '10.0.0.1',
    country: '未知',
    isPinned: false,
    isOwnerReply: false,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '4',
    pageId: 'page-1',
    pageName: '我的个人主页',
    authorName: '王五',
    content: '请问有联系方式吗？想进一步合作。',
    status: 'pending',
    likes: 2,
    ipAddress: '192.168.1.3',
    country: '中国',
    city: '深圳',
    isPinned: false,
    isOwnerReply: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const mockSettings: GuestbookSettings = {
  enabled: true,
  requireApproval: true,
  requireEmail: false,
  allowAnonymous: true,
  allowReplies: true,
  maxLength: 500,
  placeholder: '写下你的留言...',
  title: '访客留言',
  emptyMessage: '还没有留言，来第一个留言吧！',
  successMessage: '感谢你的留言！',
  enableLikes: true,
  enableEmojis: true,
  sortOrder: 'newest',
  displayCount: 20,
  showAvatars: true,
  enableNotifications: false,
  blockedWords: [],
  blockedIps: [],
};

const statusConfig = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800', icon: XCircle },
  spam: { label: '垃圾信息', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
};

export default function CommentsPage() {
  const { toast } = useToast();

  // State
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [settings, setSettings] = useState<GuestbookSettings>(mockSettings);
  const [selectedStatus, setSelectedStatus] = useState<CommentStatus | 'all'>('all');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [detailComment, setDetailComment] = useState<Comment | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filter comments
  const filteredComments = comments.filter((comment) => {
    if (selectedStatus !== 'all' && comment.status !== selectedStatus) return false;
    if (selectedPage !== 'all' && comment.pageId !== selectedPage) return false;
    if (search && !comment.content.toLowerCase().includes(search.toLowerCase()) &&
        !comment.authorName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginatedComments = filteredComments.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredComments.length / limit);

  // Stats
  const stats = {
    total: comments.length,
    pending: comments.filter(c => c.status === 'pending').length,
    approved: comments.filter(c => c.status === 'approved').length,
    spam: comments.filter(c => c.status === 'spam').length,
  };

  // Unique pages
  const uniquePages = Array.from(new Set(comments.map(c => ({ id: c.pageId, name: c.pageName }))))
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  // Handlers
  const handleApprove = (id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' as CommentStatus } : c));
    toast({ title: '留言已通过' });
  };

  const handleReject = (id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' as CommentStatus } : c));
    toast({ title: '留言已拒绝' });
  };

  const handleMarkSpam = (id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'spam' as CommentStatus } : c));
    toast({ title: '已标记为垃圾信息' });
  };

  const handleDelete = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    setSelectedComments(prev => prev.filter(cId => cId !== id));
    toast({ title: '留言已删除' });
  };

  const handleTogglePin = (id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
    toast({ title: '置顶状态已更新' });
  };

  const handleBulkAction = (action: 'approve' | 'reject' | 'spam' | 'delete') => {
    if (selectedComments.length === 0) return;

    if (action === 'delete') {
      setComments(prev => prev.filter(c => !selectedComments.includes(c.id)));
    } else {
      const statusMap: Record<string, CommentStatus> = {
        approve: 'approved',
        reject: 'rejected',
        spam: 'spam',
      };
      setComments(prev => prev.map(c =>
        selectedComments.includes(c.id) ? { ...c, status: statusMap[action] } : c
      ));
    }

    toast({ title: `已批量${action === 'delete' ? '删除' : '更新'} ${selectedComments.length} 条留言` });
    setSelectedComments([]);
  };

  const handleReply = () => {
    if (!replyingTo || !replyContent.trim()) return;

    const newReply: Comment = {
      id: `reply-${Date.now()}`,
      pageId: replyingTo.pageId,
      pageName: replyingTo.pageName,
      authorName: '页面作者',
      content: replyContent,
      status: 'approved',
      likes: 0,
      isPinned: false,
      isOwnerReply: true,
      createdAt: new Date().toISOString(),
    };

    setComments(prev => prev.map(c =>
      c.id === replyingTo.id
        ? { ...c, replies: [...(c.replies || []), newReply] }
        : c
    ));

    toast({ title: '回复已发送' });
    setReplyDialogOpen(false);
    setReplyingTo(null);
    setReplyContent('');
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === paginatedComments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(paginatedComments.map(c => c.id));
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">留言管理</h1>
            <p className="text-muted-foreground">管理页面访客留言</p>
          </div>
          <Button variant="outline" onClick={() => setSettingsSheetOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            留言设置
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">全部留言</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">待审核</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">已通过</p>
                  <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">垃圾信息</p>
                  <p className="text-2xl font-bold text-gray-700">{stats.spam}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="搜索留言内容或作者..."
                className="w-64 pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v as any); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
                <SelectItem value="spam">垃圾信息</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPage} onValueChange={(v) => { setSelectedPage(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择页面" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部页面</SelectItem>
                {uniquePages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedComments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                已选 {selectedComments.length} 条
              </span>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')}>
                <Check className="mr-1 h-4 w-4" />
                批量通过
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('spam')}>
                <AlertTriangle className="mr-1 h-4 w-4" />
                标记垃圾
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="mr-1 h-4 w-4" />
                批量删除
              </Button>
            </div>
          )}
        </div>

        {/* Comments List */}
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="flex items-center gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
              <Checkbox
                checked={selectedComments.length === paginatedComments.length && paginatedComments.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <div className="flex-1">留言内容</div>
              <div className="w-24 text-center">状态</div>
              <div className="w-20 text-center">点赞</div>
              <div className="w-32">时间</div>
              <div className="w-24">操作</div>
            </div>

            {/* Comments */}
            {paginatedComments.length > 0 ? (
              <div className="divide-y">
                {paginatedComments.map((comment) => {
                  const StatusIcon = statusConfig[comment.status].icon;
                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        'flex items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/50',
                        comment.isPinned && 'bg-blue-50'
                      )}
                    >
                      <Checkbox
                        checked={selectedComments.includes(comment.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedComments(prev => [...prev, comment.id]);
                          } else {
                            setSelectedComments(prev => prev.filter(id => id !== comment.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={comment.authorAvatar} />
                            <AvatarFallback className="text-xs">
                              {comment.authorName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{comment.authorName}</span>
                          {comment.authorEmail && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {comment.authorEmail}
                            </span>
                          )}
                          {comment.isPinned && (
                            <Badge variant="secondary" className="text-xs">
                              <Pin className="h-3 w-3 mr-1" />
                              置顶
                            </Badge>
                          )}
                          {comment.isOwnerReply && (
                            <Badge className="text-xs">作者回复</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{comment.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{comment.pageName}</span>
                          {comment.country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {comment.city ? `${comment.city}, ${comment.country}` : comment.country}
                            </span>
                          )}
                        </div>
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 ml-4 border-l-2 pl-3 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="text-sm">
                                <span className="font-medium">{reply.authorName}</span>
                                {reply.isOwnerReply && (
                                  <Badge variant="secondary" className="ml-1 text-xs">作者</Badge>
                                )}
                                <span className="text-muted-foreground"> · </span>
                                <span className="text-muted-foreground text-xs">
                                  {format(new Date(reply.createdAt), 'MM-dd HH:mm')}
                                </span>
                                <p className="text-gray-600 mt-0.5">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-24 text-center">
                        <Badge className={cn('text-xs', statusConfig[comment.status].color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[comment.status].label}
                        </Badge>
                      </div>
                      <div className="w-20 text-center">
                        <span className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <ThumbsUp className="h-3 w-3" />
                          {comment.likes}
                        </span>
                      </div>
                      <div className="w-32 text-sm text-muted-foreground">
                        {format(new Date(comment.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </div>
                      <div className="w-24">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailComment(comment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            {comment.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(comment.id)}>
                                  <Check className="mr-2 h-4 w-4" />
                                  通过
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(comment.id)}>
                                  <X className="mr-2 h-4 w-4" />
                                  拒绝
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => { setReplyingTo(comment); setReplyDialogOpen(true); }}>
                              <Reply className="mr-2 h-4 w-4" />
                              回复
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePin(comment.id)}>
                              {comment.isPinned ? (
                                <>
                                  <PinOff className="mr-2 h-4 w-4" />
                                  取消置顶
                                </>
                              ) : (
                                <>
                                  <Pin className="mr-2 h-4 w-4" />
                                  置顶
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {comment.status !== 'spam' && (
                              <DropdownMenuItem onClick={() => handleMarkSpam(comment.id)}>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                标记垃圾
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(comment.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无留言</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {filteredComments.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {filteredComments.length} 条留言
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>回复留言</DialogTitle>
              <DialogDescription>
                回复 {replyingTo?.authorName} 的留言
              </DialogDescription>
            </DialogHeader>
            {replyingTo && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{replyingTo.authorName}</p>
                <p className="text-muted-foreground mt-1">{replyingTo.content}</p>
              </div>
            )}
            <div>
              <Label htmlFor="reply">回复内容</Label>
              <Textarea
                id="reply"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="输入回复内容..."
                className="mt-1"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleReply} disabled={!replyContent.trim()}>
                发送回复
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comment Detail Sheet */}
        <Sheet open={!!detailComment} onOpenChange={(open) => !open && setDetailComment(null)}>
          <SheetContent className="w-[500px] sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>留言详情</SheetTitle>
              <SheetDescription>查看完整留言信息</SheetDescription>
            </SheetHeader>
            {detailComment && (
              <div className="mt-6 space-y-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={detailComment.authorAvatar} />
                    <AvatarFallback>{detailComment.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{detailComment.authorName}</p>
                    {detailComment.authorEmail && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {detailComment.authorEmail}
                      </p>
                    )}
                    {detailComment.authorWebsite && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {detailComment.authorWebsite}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">留言内容</Label>
                  <p className="mt-1 text-sm">{detailComment.content}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">状态</Label>
                    <div className="mt-1">
                      <Badge className={statusConfig[detailComment.status].color}>
                        {statusConfig[detailComment.status].label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">点赞数</Label>
                    <p className="mt-1 text-sm">{detailComment.likes}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">所属页面</Label>
                    <p className="mt-1 text-sm">{detailComment.pageName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">创建时间</Label>
                    <p className="mt-1 text-sm">
                      {format(new Date(detailComment.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                    </p>
                  </div>
                  {detailComment.ipAddress && (
                    <div>
                      <Label className="text-muted-foreground">IP 地址</Label>
                      <p className="mt-1 text-sm font-mono">{detailComment.ipAddress}</p>
                    </div>
                  )}
                  {detailComment.country && (
                    <div>
                      <Label className="text-muted-foreground">位置</Label>
                      <p className="mt-1 text-sm">
                        {detailComment.city ? `${detailComment.city}, ${detailComment.country}` : detailComment.country}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {detailComment.status === 'pending' && (
                    <>
                      <Button onClick={() => { handleApprove(detailComment.id); setDetailComment(null); }}>
                        <Check className="mr-2 h-4 w-4" />
                        通过
                      </Button>
                      <Button variant="outline" onClick={() => { handleReject(detailComment.id); setDetailComment(null); }}>
                        <X className="mr-2 h-4 w-4" />
                        拒绝
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(detailComment);
                      setDetailComment(null);
                      setReplyDialogOpen(true);
                    }}
                  >
                    <Reply className="mr-2 h-4 w-4" />
                    回复
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { handleDelete(detailComment.id); setDetailComment(null); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Settings Sheet */}
        <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>留言设置</SheetTitle>
              <SheetDescription>配置页面留言功能</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>启用留言功能</Label>
                  <p className="text-sm text-muted-foreground">允许访客在页面上留言</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>需要审核</Label>
                  <p className="text-sm text-muted-foreground">新留言需要审核后才能显示</p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={(requireApproval) => setSettings({ ...settings, requireApproval })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>必填邮箱</Label>
                  <p className="text-sm text-muted-foreground">要求访客填写邮箱</p>
                </div>
                <Switch
                  checked={settings.requireEmail}
                  onCheckedChange={(requireEmail) => setSettings({ ...settings, requireEmail })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>允许回复</Label>
                  <p className="text-sm text-muted-foreground">允许访客回复其他留言</p>
                </div>
                <Switch
                  checked={settings.allowReplies}
                  onCheckedChange={(allowReplies) => setSettings({ ...settings, allowReplies })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>启用点赞</Label>
                  <p className="text-sm text-muted-foreground">允许访客给留言点赞</p>
                </div>
                <Switch
                  checked={settings.enableLikes}
                  onCheckedChange={(enableLikes) => setSettings({ ...settings, enableLikes })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>显示头像</Label>
                  <p className="text-sm text-muted-foreground">显示访客头像</p>
                </div>
                <Switch
                  checked={settings.showAvatars}
                  onCheckedChange={(showAvatars) => setSettings({ ...settings, showAvatars })}
                />
              </div>

              <div>
                <Label htmlFor="maxLength">最大字数</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={settings.maxLength}
                  onChange={(e) => setSettings({ ...settings, maxLength: parseInt(e.target.value) || 500 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="placeholder">输入框占位文本</Label>
                <Input
                  id="placeholder"
                  value={settings.placeholder}
                  onChange={(e) => setSettings({ ...settings, placeholder: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="title">留言区标题</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>排序方式</Label>
                <Select
                  value={settings.sortOrder}
                  onValueChange={(sortOrder: any) => setSettings({ ...settings, sortOrder })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">最新优先</SelectItem>
                    <SelectItem value="oldest">最早优先</SelectItem>
                    <SelectItem value="popular">热门优先</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>新留言通知</Label>
                  <p className="text-sm text-muted-foreground">收到新留言时发送邮件通知</p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(enableNotifications) => setSettings({ ...settings, enableNotifications })}
                />
              </div>

              {settings.enableNotifications && (
                <div>
                  <Label htmlFor="notificationEmail">通知邮箱</Label>
                  <Input
                    id="notificationEmail"
                    type="email"
                    value={settings.notificationEmail || ''}
                    onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                    placeholder="your@email.com"
                    className="mt-1"
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  toast({ title: '设置已保存' });
                  setSettingsSheetOpen(false);
                }}
              >
                保存设置
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
