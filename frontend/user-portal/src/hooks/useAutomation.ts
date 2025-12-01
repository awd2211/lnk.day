import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AutomationPlatform = 'zapier' | 'make' | 'n8n' | 'pipedream' | 'custom';

export type WebhookEvent =
  | 'link.created'
  | 'link.clicked'
  | 'link.updated'
  | 'link.deleted'
  | 'link.milestone'
  | 'qr.scanned'
  | 'page.published'
  | 'page.viewed'
  | 'comment.created'
  | 'user.invited'
  | 'campaign.started'
  | 'campaign.ended'
  | 'form.submitted'
  | 'conversion.tracked';

export interface AutomationWebhook {
  id: string;
  teamId: string;
  platform: AutomationPlatform;
  name: string;
  webhookUrl: string;
  event: WebhookEvent;
  enabled: boolean;
  secret?: string;
  filters?: {
    linkIds?: string[];
    pageIds?: string[];
    campaignIds?: string[];
    tags?: string[];
  };
  headers?: Record<string, string>;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookDto {
  name: string;
  platform: AutomationPlatform;
  webhookUrl: string;
  event: WebhookEvent;
  filters?: AutomationWebhook['filters'];
  headers?: Record<string, string>;
}

export interface UpdateWebhookDto {
  name?: string;
  webhookUrl?: string;
  event?: WebhookEvent;
  enabled?: boolean;
  filters?: AutomationWebhook['filters'];
  headers?: Record<string, string>;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface PlatformInfo {
  id: AutomationPlatform;
  name: string;
  description: string;
  websiteUrl: string | null;
  docsUrl: string | null;
  setupGuide: string;
}

export interface EventInfo {
  event: WebhookEvent;
  description: string;
}

export interface AutomationStats {
  total: number;
  enabled: number;
  byPlatform: Record<AutomationPlatform, number>;
  byEvent: Record<string, number>;
  totalSuccesses: number;
  totalFailures: number;
}

// 获取 Webhooks 列表
export function useAutomationWebhooks(platform?: AutomationPlatform) {
  return useQuery({
    queryKey: ['automation', 'webhooks', platform],
    queryFn: async () => {
      const params = platform ? { platform } : {};
      const { data } = await api.get('/api/v1/webhooks', { params });
      return data.webhooks as AutomationWebhook[];
    },
  });
}

// 获取单个 Webhook
export function useAutomationWebhook(id: string | null) {
  return useQuery({
    queryKey: ['automation', 'webhooks', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/api/v1/webhooks/${id}`);
      return data.webhook as AutomationWebhook;
    },
    enabled: !!id,
  });
}

// 获取支持的平台
export function useAutomationPlatforms() {
  return useQuery({
    queryKey: ['automation', 'platforms'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/webhooks/platforms');
      return data.platforms as PlatformInfo[];
    },
    staleTime: Infinity,
  });
}

// 获取可用事件
export function useAutomationEvents() {
  return useQuery({
    queryKey: ['automation', 'events'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/webhooks/events');
      return data.events as EventInfo[];
    },
    staleTime: Infinity,
  });
}

// 获取统计信息
export function useAutomationStats() {
  return useQuery({
    queryKey: ['automation', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/webhooks/stats');
      return data as AutomationStats;
    },
  });
}

// 创建 Webhook
export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateWebhookDto) => {
      const { data } = await api.post('/api/v1/webhooks', dto);
      return data.webhook as AutomationWebhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 更新 Webhook
export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateWebhookDto }) => {
      const { data } = await api.put(`/api/v1/webhooks/${id}`, dto);
      return data.webhook as AutomationWebhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 删除 Webhook
export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 切换 Webhook 状态
export function useToggleWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/webhooks/${id}/toggle`);
      return data.webhook as AutomationWebhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

// 测试 Webhook
export function useTestWebhook() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/webhooks/${id}/test`);
      return data as WebhookTestResult;
    },
  });
}

// 平台图标映射
export const PLATFORM_ICONS: Record<AutomationPlatform, string> = {
  zapier: 'zap',
  make: 'workflow',
  n8n: 'git-branch',
  pipedream: 'code',
  custom: 'webhook',
};

// 平台颜色映射
export const PLATFORM_COLORS: Record<AutomationPlatform, string> = {
  zapier: '#FF4A00',
  make: '#6D28D9',
  n8n: '#EA4B71',
  pipedream: '#2ECC71',
  custom: '#6B7280',
};

// 事件分类
export const EVENT_CATEGORIES = {
  links: ['link.created', 'link.clicked', 'link.updated', 'link.deleted', 'link.milestone'],
  qr: ['qr.scanned'],
  pages: ['page.published', 'page.viewed', 'comment.created'],
  team: ['user.invited'],
  campaigns: ['campaign.started', 'campaign.ended'],
  conversions: ['form.submitted', 'conversion.tracked'],
};
