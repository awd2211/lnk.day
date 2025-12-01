import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/lib/api';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  joinedAt: string;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  isPersonal?: boolean; // 是否是个人工作区
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  invitedAt: string;
  expiresAt: string;
}

export function useCurrentTeam() {
  return useQuery({
    queryKey: ['team', 'current'],
    queryFn: async () => {
      const { data } = await userService.getCurrentTeam();
      return data as Team;
    },
  });
}

export function useTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ['team', teamId, 'members'],
    queryFn: async () => {
      const { data } = await userService.getTeamMembers(teamId!);
      return data as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useTeamInvitations(teamId?: string) {
  return useQuery({
    queryKey: ['team', teamId, 'invitations'],
    queryFn: async () => {
      const { data } = await userService.getTeamInvitations(teamId!);
      return data as TeamInvitation[];
    },
    enabled: !!teamId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, email, role }: { teamId: string; email: string; role: string }) =>
      userService.inviteTeamMember(teamId, { email, role }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'invitations'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      memberId,
      role,
    }: {
      teamId: string;
      memberId: string;
      role: string;
    }) => userService.updateTeamMemberRole(teamId, memberId, { role }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      userService.removeTeamMember(teamId, memberId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, invitationId }: { teamId: string; invitationId: string }) =>
      userService.cancelTeamInvitation(teamId, invitationId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'invitations'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, invitationId }: { teamId: string; invitationId: string }) =>
      userService.resendTeamInvitation(teamId, invitationId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'invitations'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: Partial<Team> }) =>
      userService.updateTeam(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => userService.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}
