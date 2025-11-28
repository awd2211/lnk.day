import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ========== Slack Types ==========

export interface SlackInstallation {
  installed: boolean;
  workspaceName?: string;
  installedAt?: string;
  settings?: SlackSettings;
  defaultChannel?: string;
}

export interface SlackSettings {
  notifyOnLinkCreate?: boolean;
  notifyOnMilestone?: boolean;
  notifyOnAlert?: boolean;
  weeklyReport?: boolean;
  milestoneThresholds?: number[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

// ========== Teams Types ==========

export interface TeamsInstallation {
  id: string;
  teamId: string;
  name: string;
  webhookUrl: string;
  channelName?: string;
  settings: TeamsSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamsSettings {
  notifyOnLinkCreate?: boolean;
  notifyOnMilestone?: boolean;
  notifyOnAlert?: boolean;
  weeklyReport?: boolean;
  milestoneThresholds?: number[];
  notifyOnQRScan?: boolean;
  dailyDigest?: boolean;
  digestTime?: string;
}

export interface CreateTeamsInstallationDto {
  teamId: string;
  name: string;
  webhookUrl: string;
  channelName?: string;
  settings?: TeamsSettings;
}

export interface UpdateTeamsSettingsDto {
  name?: string;
  webhookUrl?: string;
  channelName?: string;
  settings?: Partial<TeamsSettings>;
  isActive?: boolean;
}

// ========== Slack Hooks ==========

export function useSlackInstallation(teamId: string) {
  return useQuery({
    queryKey: ['slack-installation', teamId],
    queryFn: async () => {
      const { data } = await api.get<SlackInstallation>('/slack/installation', {
        params: { teamId },
      });
      return data;
    },
    enabled: !!teamId,
  });
}

export function useSlackChannels(teamId: string) {
  return useQuery({
    queryKey: ['slack-channels', teamId],
    queryFn: async () => {
      const { data } = await api.get<{ channels: SlackChannel[] }>('/slack/channels', {
        params: { teamId },
      });
      return data.channels;
    },
    enabled: !!teamId,
  });
}

export function useUpdateSlackSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      settings,
    }: {
      teamId: string;
      settings: Partial<SlackSettings>;
    }) => {
      const { data } = await api.put('/slack/settings', settings, {
        params: { teamId },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['slack-installation', variables.teamId] });
    },
  });
}

export function useUninstallSlack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete('/slack/uninstall', { params: { teamId } });
    },
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({ queryKey: ['slack-installation', teamId] });
    },
  });
}

// ========== Teams Hooks ==========

export function useTeamsInstallations(teamId: string) {
  return useQuery({
    queryKey: ['teams-installations', teamId],
    queryFn: async () => {
      const { data } = await api.get<{ installations: TeamsInstallation[] }>(
        '/teams-notifications/installations',
        { params: { teamId } },
      );
      return data.installations;
    },
    enabled: !!teamId,
  });
}

export function useCreateTeamsInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTeamsInstallationDto) => {
      const { data } = await api.post<{ installation: TeamsInstallation }>(
        '/teams-notifications/installations',
        dto,
      );
      return data.installation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams-installations', variables.teamId] });
    },
  });
}

export function useUpdateTeamsInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      dto,
    }: {
      id: string;
      teamId: string;
      dto: UpdateTeamsSettingsDto;
    }) => {
      const { data } = await api.put<{ installation: TeamsInstallation }>(
        `/teams-notifications/installations/${id}`,
        dto,
        { params: { teamId } },
      );
      return data.installation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams-installations', variables.teamId] });
    },
  });
}

export function useDeleteTeamsInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      await api.delete(`/teams-notifications/installations/${id}`, {
        params: { teamId },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams-installations', variables.teamId] });
    },
  });
}

export function useTestTeamsInstallation() {
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { data } = await api.post<{ success: boolean }>(
        `/teams-notifications/installations/${id}/test`,
        {},
        { params: { teamId } },
      );
      return data.success;
    },
  });
}

export function useValidateTeamsWebhook() {
  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      const { data } = await api.post<{ valid: boolean }>(
        '/teams-notifications/validate-webhook',
        { webhookUrl },
      );
      return data.valid;
    },
  });
}

// ========== Notification Settings Types ==========

export type NotificationType =
  | 'link_created'
  | 'milestone'
  | 'alert'
  | 'weekly_report'
  | 'qr_scan'
  | 'daily_digest';

export interface NotificationPreferences {
  slack: {
    enabled: boolean;
    types: NotificationType[];
  };
  teams: {
    enabled: boolean;
    types: NotificationType[];
  };
  email: {
    enabled: boolean;
    types: NotificationType[];
  };
}
