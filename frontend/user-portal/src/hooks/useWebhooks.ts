import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export enum WebhookEventType {
  LINK_CREATED = 'link.created',
  LINK_UPDATED = 'link.updated',
  LINK_DELETED = 'link.deleted',
  LINK_CLICKED = 'link.clicked',
  LINK_MILESTONE = 'link.milestone',
  LINK_EXPIRED = 'link.expired',

  QR_CREATED = 'qr.created',
  QR_SCANNED = 'qr.scanned',
  QR_UPDATED = 'qr.updated',
  QR_DELETED = 'qr.deleted',

  PAGE_CREATED = 'page.created',
  PAGE_PUBLISHED = 'page.published',
  PAGE_UNPUBLISHED = 'page.unpublished',
  PAGE_DELETED = 'page.deleted',

  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_ENDED = 'campaign.ended',
  CAMPAIGN_GOAL_REACHED = 'campaign.goal_reached',

  TEAM_MEMBER_ADDED = 'team.member_added',
  TEAM_MEMBER_REMOVED = 'team.member_removed',
  TEAM_ROLE_CHANGED = 'team.role_changed',

  ANALYTICS_THRESHOLD = 'analytics.threshold',
  ANALYTICS_ANOMALY = 'analytics.anomaly',
}

export type WebhookStatus = 'active' | 'inactive' | 'failing' | 'disabled';

export interface WebhookFilters {
  tags?: string[];
  linkIds?: string[];
  campaignIds?: string[];
  domains?: string[];
  threshold?: {
    metric: 'clicks' | 'conversions' | 'revenue';
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    value: number;
  };
}

export interface Webhook {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  status: WebhookStatus;
  enabled: boolean;
  description?: string;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastErrorMessage?: string;
  headers?: Record<string, string>;
  filters?: WebhookFilters;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  payload: Record<string, any>;
  statusCode?: number;
  responseBody?: string;
  responseTime?: number;
  success: boolean;
  error?: string;
  attemptNumber: number;
  createdAt: string;
}

export interface WebhookEventInfo {
  type: WebhookEventType;
  description: string;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  events: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  filters?: WebhookFilters;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  filters?: WebhookFilters;
}

// Query: Get all webhooks
export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/webhooks');
      return data as { data: Webhook[]; total: number; page: number; limit: number };
    },
  });
}

// Query: Get single webhook
export function useWebhook(id: string | null) {
  return useQuery({
    queryKey: ['webhooks', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/api/v1/webhooks/${id}`);
      return data as Webhook;
    },
    enabled: !!id,
  });
}

// Query: Get webhook event types
export function useWebhookEvents() {
  return useQuery({
    queryKey: ['webhooks', 'events'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/webhooks/events');
      return data as { events: WebhookEventInfo[] };
    },
  });
}

// Query: Get webhook deliveries
export function useWebhookDeliveries(webhookId: string | null) {
  return useQuery({
    queryKey: ['webhooks', webhookId, 'deliveries'],
    queryFn: async () => {
      if (!webhookId) return null;
      const { data } = await api.get(`/api/v1/webhooks/${webhookId}/deliveries`);
      return data as { data: WebhookDelivery[]; total: number };
    },
    enabled: !!webhookId,
  });
}

// Mutation: Create webhook
export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWebhookData) => {
      const response = await api.post('/api/v1/webhooks', data);
      return response.data as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

// Mutation: Update webhook
export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWebhookData }) => {
      const response = await api.put(`/api/v1/webhooks/${id}`, data);
      return response.data as Webhook;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks', id] });
    },
  });
}

// Mutation: Enable webhook
export function useEnableWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/webhooks/${id}/enable`);
      return response.data as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

// Mutation: Disable webhook
export function useDisableWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/webhooks/${id}/disable`);
      return response.data as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

// Mutation: Regenerate secret
export function useRegenerateWebhookSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/webhooks/${id}/regenerate-secret`);
      return response.data as { secret: string };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks', id] });
    },
  });
}

// Mutation: Test webhook
export function useTestWebhook() {
  return useMutation({
    mutationFn: async ({ id, event }: { id: string; event: WebhookEventType }) => {
      const response = await api.post(`/api/v1/webhooks/${id}/test`, { event });
      return response.data as {
        success: boolean;
        statusCode?: number;
        responseTime?: number;
        error?: string;
      };
    },
  });
}

// Mutation: Retry delivery
export function useRetryDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const response = await api.post(`/api/v1/webhooks/deliveries/${deliveryId}/retry`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

// Mutation: Delete webhook
export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

// Status config
export const WEBHOOK_STATUS_CONFIG: Record<
  WebhookStatus,
  { label: string; color: string; bgColor: string }
> = {
  active: { label: '正常', color: 'text-green-600', bgColor: 'bg-green-100' },
  inactive: { label: '未激活', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  failing: { label: '投递失败', color: 'text-red-600', bgColor: 'bg-red-100' },
  disabled: { label: '已禁用', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};

// Event category
export const WEBHOOK_EVENT_CATEGORIES = {
  link: {
    label: '链接事件',
    events: [
      WebhookEventType.LINK_CREATED,
      WebhookEventType.LINK_UPDATED,
      WebhookEventType.LINK_DELETED,
      WebhookEventType.LINK_CLICKED,
      WebhookEventType.LINK_MILESTONE,
      WebhookEventType.LINK_EXPIRED,
    ],
  },
  qr: {
    label: '二维码事件',
    events: [
      WebhookEventType.QR_CREATED,
      WebhookEventType.QR_SCANNED,
      WebhookEventType.QR_UPDATED,
      WebhookEventType.QR_DELETED,
    ],
  },
  page: {
    label: '落地页事件',
    events: [
      WebhookEventType.PAGE_CREATED,
      WebhookEventType.PAGE_PUBLISHED,
      WebhookEventType.PAGE_UNPUBLISHED,
      WebhookEventType.PAGE_DELETED,
    ],
  },
  campaign: {
    label: '营销活动事件',
    events: [
      WebhookEventType.CAMPAIGN_CREATED,
      WebhookEventType.CAMPAIGN_STARTED,
      WebhookEventType.CAMPAIGN_ENDED,
      WebhookEventType.CAMPAIGN_GOAL_REACHED,
    ],
  },
  team: {
    label: '团队事件',
    events: [
      WebhookEventType.TEAM_MEMBER_ADDED,
      WebhookEventType.TEAM_MEMBER_REMOVED,
      WebhookEventType.TEAM_ROLE_CHANGED,
    ],
  },
  analytics: {
    label: '分析事件',
    events: [
      WebhookEventType.ANALYTICS_THRESHOLD,
      WebhookEventType.ANALYTICS_ANOMALY,
    ],
  },
};
