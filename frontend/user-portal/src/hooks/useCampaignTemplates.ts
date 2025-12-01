import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CampaignType } from './useCampaigns';

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  channels: string[];
  utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  defaultBudget?: number;
  defaultDuration?: number; // days
  tags: string[];
  goal?: {
    type: 'clicks' | 'conversions' | 'revenue';
    target: number;
  };
  settings: {
    autoArchiveOnEnd?: boolean;
    notifyOnGoalReached?: boolean;
  };
  isSystem?: boolean; // System templates provided by platform
  isPublic?: boolean; // Shared with team
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export interface CreateCampaignTemplateDto {
  name: string;
  description?: string;
  type: CampaignType;
  channels?: string[];
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  defaultBudget?: number;
  defaultDuration?: number;
  tags?: string[];
  goal?: {
    type: 'clicks' | 'conversions' | 'revenue';
    target: number;
  };
  settings?: {
    autoArchiveOnEnd?: boolean;
    notifyOnGoalReached?: boolean;
  };
  isPublic?: boolean;
}

export interface CampaignTemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: CampaignTemplate[];
}

// Get all templates
export function useCampaignTemplates(options?: { includeSystem?: boolean }) {
  return useQuery({
    queryKey: ['campaign-templates', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.includeSystem) {
        params.append('includeSystem', 'true');
      }
      const response = await api.get<CampaignTemplate[]>(`/api/v1/campaign-templates?${params.toString()}`);
      return response.data;
    },
  });
}

// Get a single template
export function useCampaignTemplate(id: string) {
  return useQuery({
    queryKey: ['campaign-templates', id],
    queryFn: async () => {
      const response = await api.get<CampaignTemplate>(`/api/v1/campaign-templates/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Get template categories (for system templates)
export function useCampaignTemplateCategories() {
  return useQuery({
    queryKey: ['campaign-template-categories'],
    queryFn: async () => {
      const response = await api.get<CampaignTemplateCategory[]>('/api/v1/campaign-templates/categories');
      return response.data;
    },
  });
}

// Create a template
export function useCreateCampaignTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignTemplateDto) => {
      const response = await api.post<CampaignTemplate>('/api/v1/campaign-templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
  });
}

// Save campaign as template
export function useSaveCampaignAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, templateName, description, isPublic }: {
      campaignId: string;
      templateName: string;
      description?: string;
      isPublic?: boolean;
    }) => {
      const response = await api.post<CampaignTemplate>(`/api/v1/campaign-templates/from-campaign/${campaignId}`, {
        name: templateName,
        description,
        isPublic,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
  });
}

// Update a template
export function useUpdateCampaignTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCampaignTemplateDto> }) => {
      const response = await api.put<CampaignTemplate>(`/api/v1/campaign-templates/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-templates', variables.id] });
    },
  });
}

// Delete a template
export function useDeleteCampaignTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/campaign-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
  });
}

// Duplicate a template
export function useDuplicateCampaignTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CampaignTemplate>(`/api/v1/campaign-templates/${id}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
  });
}

// Create campaign from template
export function useCreateCampaignFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, overrides }: {
      templateId: string;
      overrides?: {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        budget?: number;
      };
    }) => {
      const response = await api.post(`/api/v1/campaign-templates/${templateId}/create-campaign`, overrides);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-templates'] }); // Update usage count
    },
  });
}

// System template types for common use cases
export const systemTemplateTypes = [
  {
    id: 'social-media',
    name: '社交媒体营销',
    description: '适用于 Facebook、Instagram、Twitter 等社交平台推广',
    icon: 'share-2',
  },
  {
    id: 'email-marketing',
    name: '邮件营销',
    description: '适用于电子邮件推广活动',
    icon: 'mail',
  },
  {
    id: 'paid-ads',
    name: '付费广告',
    description: '适用于 Google Ads、Facebook Ads 等付费广告',
    icon: 'dollar-sign',
  },
  {
    id: 'influencer',
    name: '网红合作',
    description: '适用于 KOL/网红推广活动',
    icon: 'users',
  },
  {
    id: 'product-launch',
    name: '产品发布',
    description: '适用于新产品或功能发布推广',
    icon: 'rocket',
  },
  {
    id: 'seasonal',
    name: '季节性促销',
    description: '适用于节假日、购物节等促销活动',
    icon: 'calendar',
  },
  {
    id: 'referral',
    name: '推荐计划',
    description: '适用于用户推荐/邀请活动',
    icon: 'gift',
  },
  {
    id: 'content-marketing',
    name: '内容营销',
    description: '适用于博客、视频等内容推广',
    icon: 'file-text',
  },
];
