import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum CampaignType {
  MARKETING = 'marketing',
  SOCIAL = 'social',
  EMAIL = 'email',
  AFFILIATE = 'affiliate',
  OTHER = 'other',
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface CampaignGoal {
  type: 'clicks' | 'conversions' | 'revenue';
  target: number;
  current: number;
}

export interface CampaignSettings {
  autoArchiveOnEnd?: boolean;
  notifyOnGoalReached?: boolean;
  dailyBudgetLimit?: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  userId: string;
  type: CampaignType;
  status: CampaignStatus;
  channels: string[];
  utmParams: UTMParams;
  goal?: CampaignGoal;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent: number;
  tags: string[];
  linkIds: string[];
  totalLinks: number;
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  settings: CampaignSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  clicksByDay: { date: string; clicks: number }[];
  topLinks: { id: string; shortUrl: string; clicks: number }[];
  topCountries: { country: string; clicks: number }[];
  topDevices: { device: string; clicks: number }[];
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  type?: CampaignType;
  channels?: string[];
  utmParams?: UTMParams;
  goal?: Omit<CampaignGoal, 'current'>;
  startDate?: string;
  endDate?: string;
  budget?: number;
  tags?: string[];
  settings?: CampaignSettings;
}

export interface UpdateCampaignData extends Partial<CreateCampaignData> {}

// Query: Get all campaigns
export function useCampaigns(status?: CampaignStatus) {
  return useQuery({
    queryKey: ['campaigns', { status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const { data } = await api.get(`/api/v1/campaigns?${params}`);
      return data as Campaign[];
    },
  });
}

// Query: Get active campaigns
export function useActiveCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/campaigns/active');
      return data as Campaign[];
    },
  });
}

// Query: Get single campaign
export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/api/v1/campaigns/${id}`);
      return data as Campaign;
    },
    enabled: !!id,
  });
}

// Query: Get campaign stats
export function useCampaignStats(id: string | null) {
  return useQuery({
    queryKey: ['campaigns', id, 'stats'],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/api/v1/campaigns/${id}/stats`);
      return data as CampaignStats;
    },
    enabled: !!id,
  });
}

// Mutation: Create campaign
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      const response = await api.post('/api/v1/campaigns', data);
      return response.data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Mutation: Update campaign
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCampaignData }) => {
      const response = await api.put(`/api/v1/campaigns/${id}`, data);
      return response.data as Campaign;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

// Mutation: Start campaign
export function useStartCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/campaigns/${id}/start`);
      return response.data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Mutation: Pause campaign
export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/campaigns/${id}/pause`);
      return response.data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Mutation: Complete campaign
export function useCompleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/campaigns/${id}/complete`);
      return response.data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Mutation: Archive campaign
export function useArchiveCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/campaigns/${id}/archive`);
      return response.data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Mutation: Add links to campaign
export function useAddLinksToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, linkIds }: { id: string; linkIds: string[] }) => {
      const response = await api.post(`/api/v1/campaigns/${id}/links`, { linkIds });
      return response.data as Campaign;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

// Mutation: Remove links from campaign
export function useRemoveLinksFromCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, linkIds }: { id: string; linkIds: string[] }) => {
      const response = await api.delete(`/api/v1/campaigns/${id}/links`, {
        data: { linkIds },
      });
      return response.data as Campaign;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

// Mutation: Duplicate campaign
export function useDuplicateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/v1/campaigns/${id}/duplicate`);
      return response.data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// Mutation: Delete campaign
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// UTM Builder
export function useBuildUtmUrl() {
  return useMutation({
    mutationFn: async ({
      baseUrl,
      utmParams,
    }: {
      baseUrl: string;
      utmParams: UTMParams;
    }) => {
      const response = await api.post('/api/v1/campaigns/utm-builder', {
        baseUrl,
        utmParams,
      });
      return response.data as { url: string };
    },
  });
}

// Status config
export const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string; bgColor: string }
> = {
  [CampaignStatus.DRAFT]: {
    label: '草稿',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  [CampaignStatus.SCHEDULED]: {
    label: '已计划',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  [CampaignStatus.ACTIVE]: {
    label: '进行中',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  [CampaignStatus.PAUSED]: {
    label: '已暂停',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  [CampaignStatus.COMPLETED]: {
    label: '已完成',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  [CampaignStatus.ARCHIVED]: {
    label: '已归档',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

export const CAMPAIGN_TYPE_CONFIG: Record<
  CampaignType,
  { label: string; icon: string }
> = {
  [CampaignType.MARKETING]: { label: '营销活动', icon: 'megaphone' },
  [CampaignType.SOCIAL]: { label: '社交媒体', icon: 'share2' },
  [CampaignType.EMAIL]: { label: '邮件营销', icon: 'mail' },
  [CampaignType.AFFILIATE]: { label: '联盟营销', icon: 'users' },
  [CampaignType.OTHER]: { label: '其他', icon: 'folder' },
};

export const CHANNEL_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'display', label: 'Display Ads' },
  { value: 'search', label: 'Search Ads' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'other', label: '其他' },
];
