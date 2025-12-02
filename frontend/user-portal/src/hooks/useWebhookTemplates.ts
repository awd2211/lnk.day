import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface WebhookTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  platform: 'slack' | 'discord' | 'teams' | 'custom';
  url?: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  slackConfig?: {
    channel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };
  discordConfig?: {
    username?: string;
    avatarUrl?: string;
  };
  teamsConfig?: {
    themeColor?: string;
    sections?: any[];
  };
  payloadTemplate?: Record<string, any>;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookTemplateDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  platform: WebhookTemplate['platform'];
  url?: string;
  method?: WebhookTemplate['method'];
  headers?: Record<string, string>;
  slackConfig?: WebhookTemplate['slackConfig'];
  discordConfig?: WebhookTemplate['discordConfig'];
  teamsConfig?: WebhookTemplate['teamsConfig'];
  payloadTemplate?: Record<string, any>;
}

const QUERY_KEY = ['webhook-templates'];

export function useWebhookTemplates(options?: { platform?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.platform) params.append('platform', options.platform);
      if (options?.isFavorite !== undefined) params.append('isFavorite', String(options.isFavorite));
      if (options?.search) params.append('search', options.search);

      const { data } = await api.get(`/api/v1/webhook-templates?${params}`);
      return data.data as WebhookTemplate[];
    },
  });
}

export function useCreateWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateWebhookTemplateDto) => {
      const { data } = await api.post('/api/v1/webhook-templates', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWebhookTemplateDto> }) => {
      const response = await api.put(`/api/v1/webhook-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/webhook-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleWebhookTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/webhook-templates/${id}/favorite`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDuplicateWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/webhook-templates/${id}/duplicate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
