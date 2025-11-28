import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Integration {
  id: string;
  name: string;
  type: 'zapier' | 'hubspot' | 'salesforce' | 'shopify' | 'slack' | 'teams' | 'google_analytics' | 'facebook_pixel' | 'custom';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  description?: string;
  icon?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  config?: Record<string, any>;
  permissions?: string[];
  webhookUrl?: string;
  errorMessage?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'teams' | 'sms' | 'webhook' | 'push';
  enabled: boolean;
  config: Record<string, any>;
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AvailableIntegration {
  type: Integration['type'];
  name: string;
  description: string;
  icon: string;
  category: 'crm' | 'automation' | 'analytics' | 'communication' | 'ecommerce';
  features: string[];
  setupUrl?: string;
}

export interface CreateChannelDto {
  name: string;
  type: NotificationChannel['type'];
  config: Record<string, any>;
  events: string[];
  enabled?: boolean;
}

// 集成相关
export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await api.get<Integration[]>('/integrations');
      return response.data;
    },
  });
}

export function useAvailableIntegrations() {
  return useQuery({
    queryKey: ['integrations', 'available'],
    queryFn: async () => {
      const response = await api.get<AvailableIntegration[]>('/integrations/available');
      return response.data;
    },
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, config }: { type: Integration['type']; config?: Record<string, any> }) => {
      const response = await api.post<{ authUrl?: string; integration?: Integration }>(`/integrations/${type}/connect`, config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useSyncIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Integration>(`/integrations/${id}/sync`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useUpdateIntegrationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, any> }) => {
      const response = await api.patch<Integration>(`/integrations/${id}`, { config });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

// 通知渠道相关
export function useNotificationChannels() {
  return useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      const response = await api.get<NotificationChannel[]>('/notifications/channels');
      return response.data;
    },
  });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChannelDto) => {
      const response = await api.post<NotificationChannel>('/notifications/channels', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useUpdateNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateChannelDto> }) => {
      const response = await api.patch<NotificationChannel>(`/notifications/channels/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useToggleNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await api.patch<NotificationChannel>(`/notifications/channels/${id}`, { enabled });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useTestNotificationChannel() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message?: string }>(`/notifications/channels/${id}/test`);
      return response.data;
    },
  });
}

export function useNotificationEvents() {
  return useQuery({
    queryKey: ['notification-events'],
    queryFn: async () => {
      const response = await api.get<{ event: string; name: string; description: string }[]>('/notifications/events');
      return response.data;
    },
  });
}
