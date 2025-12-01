import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Send,
  MoreHorizontal,
  Pin,
  Pencil,
  Trash2,
  Reply,
  MessageSquare,
  Activity,
  Users,
  UserPlus,
  Loader2,
  Smile,
  Clock,
  Crown,
  Eye,
  Edit3,
} from 'lucide-react';
import {
  useCampaignComments,
  useCampaignActivity,
  useCampaignCollaborators,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  usePinComment,
  useAddReaction,
  useRemoveReaction,
  useAddCollaborator,
  useUpdateCollaborator,
  useRemoveCollaborator,
  activityTypeLabels,
  commonReactions,
  type CampaignComment,
  type CampaignActivity,
  type CampaignCollaborator,
} from '@/hooks/useCampaignComments';
import { useTeamMembers } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface CampaignCollaborationProps {
  campaignId: string;
}

export function CampaignCollaboration({ campaignId }: CampaignCollaborationProps) {
  return (
    <Tabs defaultValue="comments" className="mt-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="comments" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          评论
        </TabsTrigger>
        <TabsTrigger value="activity" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          动态
        </TabsTrigger>
        <TabsTrigger value="collaborators" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          协作者
        </TabsTrigger>
      </TabsList>

      <TabsContent value="comments" className="mt-4">
        <CommentsPanel campaignId={campaignId} />
      </TabsContent>

      <TabsContent value="activity" className="mt-4">
        <ActivityPanel campaignId={campaignId} />
      </TabsContent>

      <TabsContent value="collaborators" className="mt-4">
        <CollaboratorsPanel campaignId={campaignId} />
      </TabsContent>
    </Tabs>
  );
}

// Comments Panel
function CommentsPanel({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  const { data: comments, isLoading } = useCampaignComments(campaignId);
  const addComment = useAddComment(campaignId);
  const updateComment = useUpdateComment(campaignId);
  const deleteComment = useDeleteComment(campaignId);
  const pinComment = usePinComment(campaignId);
  const addReaction = useAddReaction(campaignId);

  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<CampaignComment | null>(null);
  const [editingComment, setEditingComment] = useState<CampaignComment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        content: newComment,
        parentId: replyTo?.id,
      });
      setNewComment('');
      setReplyTo(null);
      toast({ title: '评论已发送' });
    } catch {
      toast({ title: '发送失败', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editingComment || !editContent.trim()) return;

    try {
      await updateComment.mutateAsync({
        commentId: editingComment.id,
        data: { content: editContent },
      });
      setEditingComment(null);
      setEditContent('');
      toast({ title: '评论已更新' });
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingCommentId) return;

    try {
      await deleteComment.mutateAsync(deletingCommentId);
      setDeletingCommentId(null);
      toast({ title: '评论已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handlePin = async (comment: CampaignComment) => {
    try {
      await pinComment.mutateAsync({
        commentId: comment.id,
        pinned: !comment.isPinned,
      });
      toast({ title: comment.isPinned ? '已取消置顶' : '已置顶' });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      await addReaction.mutateAsync({ commentId, emoji });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const pinnedComments = comments?.filter((c) => c.isPinned) || [];
  const regularComments = comments?.filter((c) => !c.isPinned) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Reply className="h-4 w-4" />
            回复 {replyTo.userName}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setReplyTo(null)}
            >
              取消
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="添加评论..."
            className="min-h-[80px]"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            发送
          </Button>
        </div>
      </div>

      {/* Pinned Comments */}
      {pinnedComments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Pin className="h-4 w-4" />
            置顶评论
          </h4>
          {pinnedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyTo(comment)}
              onEdit={() => {
                setEditingComment(comment);
                setEditContent(comment.content);
              }}
              onDelete={() => setDeletingCommentId(comment.id)}
              onPin={() => handlePin(comment)}
              onReaction={handleReaction}
            />
          ))}
        </div>
      )}

      {/* Regular Comments */}
      <div className="space-y-2">
        {regularComments.length > 0 ? (
          regularComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyTo(comment)}
              onEdit={() => {
                setEditingComment(comment);
                setEditContent(comment.content);
              }}
              onDelete={() => setDeletingCommentId(comment.id)}
              onPin={() => handlePin(comment)}
              onReaction={handleReaction}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            暂无评论
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingComment} onOpenChange={() => setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑评论</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingComment(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateComment.isPending}>
              {updateComment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Comment Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingCommentId}
        onOpenChange={(open) => !open && setDeletingCommentId(null)}
        title="删除评论"
        description="确定要删除这条评论吗？此操作无法撤销。"
        confirmText="删除"
        onConfirm={handleDelete}
        isLoading={deleteComment.isPending}
        variant="destructive"
      />
    </div>
  );
}

// Comment Item
function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReaction,
}: {
  comment: CampaignComment;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReaction: (commentId: string, emoji: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className={`rounded-lg border p-4 ${comment.isPinned ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.userAvatar} />
          <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground">(已编辑)</span>
            )}
            {comment.isPinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                置顶
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>

          {/* Reactions */}
          {comment.reactions && comment.reactions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {comment.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => onReaction(comment.id, reaction.emoji)}
                >
                  {reaction.emoji}
                  <span>{reaction.users.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onReply}>
              <Reply className="h-3 w-3 mr-1" />
              回复
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowReactions(!showReactions)}
              >
                <Smile className="h-3 w-3 mr-1" />
                表情
              </Button>
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-lg border bg-white dark:bg-gray-800 p-1 shadow-lg">
                  {commonReactions.map((emoji) => (
                    <button
                      key={emoji}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      onClick={() => {
                        onReaction(comment.id, emoji);
                        setShowReactions(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {comment.isPinned ? '取消置顶' : '置顶'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-500">
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 pl-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={reply.userAvatar} />
                      <AvatarFallback>{reply.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{reply.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                  <p className="mt-1 ml-8">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Activity Panel
function ActivityPanel({ campaignId }: { campaignId: string }) {
  const { data: activities, isLoading } = useCampaignActivity(campaignId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2" />
        暂无动态
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.userAvatar} />
              <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            {index < activities.length - 1 && (
              <div className="absolute left-4 top-8 h-full w-px bg-gray-200 dark:bg-gray-700" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{activity.userName}</span>
              <Badge variant="outline" className="text-xs">
                {activityTypeLabels[activity.type]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(activity.createdAt), {
                addSuffix: true,
                locale: zhCN,
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Collaborators Panel
function CollaboratorsPanel({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  const { data: collaborators, isLoading } = useCampaignCollaborators(campaignId);
  const { data: teamMembers } = useTeamMembers();
  const addCollaborator = useAddCollaborator(campaignId);
  const updateCollaborator = useUpdateCollaborator(campaignId);
  const removeCollaborator = useRemoveCollaborator(campaignId);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('viewer');

  const handleAdd = async () => {
    if (!selectedUserId) return;

    try {
      await addCollaborator.mutateAsync({ userId: selectedUserId, role: selectedRole });
      toast({ title: '协作者已添加' });
      setAddDialogOpen(false);
      setSelectedUserId('');
    } catch {
      toast({ title: '添加失败', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (collaboratorId: string, role: 'editor' | 'viewer') => {
    try {
      await updateCollaborator.mutateAsync({ collaboratorId, role });
      toast({ title: '权限已更新' });
    } catch {
      toast({ title: '更新失败', variant: 'destructive' });
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    if (!confirm('确定要移除此协作者吗？')) return;

    try {
      await removeCollaborator.mutateAsync(collaboratorId);
      toast({ title: '协作者已移除' });
    } catch {
      toast({ title: '移除失败', variant: 'destructive' });
    }
  };

  const roleConfig = {
    owner: { label: '所有者', icon: Crown, color: 'text-yellow-500' },
    editor: { label: '编辑者', icon: Edit3, color: 'text-blue-500' },
    viewer: { label: '查看者', icon: Eye, color: 'text-gray-500' },
  };

  const existingUserIds = collaborators?.map((c) => c.userId) || [];
  const availableMembers = teamMembers?.filter((m) => !existingUserIds.includes(m.userId)) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">协作者列表</h4>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          添加协作者
        </Button>
      </div>

      {collaborators?.length ? (
        <div className="space-y-2">
          {collaborators.map((collaborator) => {
            const config = roleConfig[collaborator.role];
            const RoleIcon = config.icon;

            return (
              <div
                key={collaborator.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={collaborator.userAvatar} />
                    <AvatarFallback>{collaborator.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{collaborator.userName}</div>
                    <div className="text-sm text-muted-foreground">
                      {collaborator.userEmail}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {collaborator.role === 'owner' ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <RoleIcon className={`h-3 w-3 ${config.color}`} />
                      {config.label}
                    </Badge>
                  ) : (
                    <>
                      <Select
                        value={collaborator.role}
                        onValueChange={(v) =>
                          handleUpdateRole(collaborator.id, v as 'editor' | 'viewer')
                        }
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">
                            <div className="flex items-center gap-2">
                              <Edit3 className="h-3 w-3 text-blue-500" />
                              编辑者
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3 w-3 text-gray-500" />
                              查看者
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemove(collaborator.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2" />
          暂无协作者
        </div>
      )}

      {/* Add Collaborator Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加协作者</DialogTitle>
            <DialogDescription>选择团队成员添加为此活动的协作者</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择成员</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择团队成员" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length > 0 ? (
                    availableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      没有可添加的团队成员
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">权限</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'editor' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-blue-500" />
                      编辑者 - 可以编辑活动内容
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-500" />
                      查看者 - 只能查看活动
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={!selectedUserId || addCollaborator.isPending}>
              {addCollaborator.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CampaignCollaboration;
