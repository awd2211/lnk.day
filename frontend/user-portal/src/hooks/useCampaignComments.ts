import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CampaignComment {
  id: string;
  campaignId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  content: string;
  mentions?: string[]; // user IDs mentioned
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  parentId?: string; // for replies
  replies?: CampaignComment[];
  reactions?: {
    emoji: string;
    users: { id: string; name: string }[];
  }[];
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentDto {
  content: string;
  mentions?: string[];
  parentId?: string;
  attachments?: File[];
}

export interface UpdateCommentDto {
  content: string;
  mentions?: string[];
}

export interface CampaignActivity {
  id: string;
  campaignId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'status_change' | 'edit' | 'comment' | 'goal_reached' | 'link_added' | 'link_removed' | 'member_added' | 'member_removed';
  description: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface CampaignCollaborator {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: string;
  addedBy: string;
}

// Get comments for a campaign
export function useCampaignComments(campaignId: string) {
  return useQuery({
    queryKey: ['campaigns', campaignId, 'comments'],
    queryFn: async () => {
      const response = await api.get<CampaignComment[]>(`/api/v1/campaigns/${campaignId}/comments`);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

// Get activity log for a campaign
export function useCampaignActivity(campaignId: string) {
  return useQuery({
    queryKey: ['campaigns', campaignId, 'activity'],
    queryFn: async () => {
      const response = await api.get<CampaignActivity[]>(`/api/v1/campaigns/${campaignId}/activity`);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

// Get collaborators for a campaign
export function useCampaignCollaborators(campaignId: string) {
  return useQuery({
    queryKey: ['campaigns', campaignId, 'collaborators'],
    queryFn: async () => {
      const response = await api.get<CampaignCollaborator[]>(`/api/v1/campaigns/${campaignId}/collaborators`);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

// Add a comment
export function useAddComment(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCommentDto) => {
      const formData = new FormData();
      formData.append('content', data.content);
      if (data.mentions) {
        formData.append('mentions', JSON.stringify(data.mentions));
      }
      if (data.parentId) {
        formData.append('parentId', data.parentId);
      }
      if (data.attachments) {
        data.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await api.post<CampaignComment>(`/api/v1/campaigns/${campaignId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'activity'] });
    },
  });
}

// Update a comment
export function useUpdateComment(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, data }: { commentId: string; data: UpdateCommentDto }) => {
      const response = await api.patch<CampaignComment>(`/api/v1/campaigns/${campaignId}/comments/${commentId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] });
    },
  });
}

// Delete a comment
export function useDeleteComment(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/api/v1/campaigns/${campaignId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'activity'] });
    },
  });
}

// Pin/unpin a comment
export function usePinComment(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, pinned }: { commentId: string; pinned: boolean }) => {
      const response = await api.post<CampaignComment>(`/api/v1/campaigns/${campaignId}/comments/${commentId}/pin`, { pinned });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] });
    },
  });
}

// Add reaction to a comment
export function useAddReaction(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      const response = await api.post(`/api/v1/campaigns/${campaignId}/comments/${commentId}/reactions`, { emoji });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] });
    },
  });
}

// Remove reaction from a comment
export function useRemoveReaction(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      await api.delete(`/api/v1/campaigns/${campaignId}/comments/${commentId}/reactions/${emoji}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] });
    },
  });
}

// Add collaborator
export function useAddCollaborator(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'editor' | 'viewer' }) => {
      const response = await api.post<CampaignCollaborator>(`/api/v1/campaigns/${campaignId}/collaborators`, { userId, role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'activity'] });
    },
  });
}

// Update collaborator role
export function useUpdateCollaborator(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collaboratorId, role }: { collaboratorId: string; role: 'editor' | 'viewer' }) => {
      const response = await api.patch<CampaignCollaborator>(`/api/v1/campaigns/${campaignId}/collaborators/${collaboratorId}`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'collaborators'] });
    },
  });
}

// Remove collaborator
export function useRemoveCollaborator(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collaboratorId: string) => {
      await api.delete(`/api/v1/campaigns/${campaignId}/collaborators/${collaboratorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'activity'] });
    },
  });
}

// Activity type labels
export const activityTypeLabels: Record<CampaignActivity['type'], string> = {
  status_change: '状态变更',
  edit: '编辑',
  comment: '评论',
  goal_reached: '达成目标',
  link_added: '添加链接',
  link_removed: '移除链接',
  member_added: '添加成员',
  member_removed: '移除成员',
};

// Common reaction emojis
export const commonReactions = ['👍', '❤️', '🎉', '🤔', '👀', '🚀'];
