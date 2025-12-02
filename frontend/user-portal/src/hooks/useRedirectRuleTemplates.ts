import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RedirectRuleTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: 'ab_test' | 'geo' | 'device' | 'time' | 'custom';
  abTestVariants?: Array<{
    name: string;
    url: string;
    weight: number;
  }>;
  geoPresets?: Array<{
    name: string;
    countries: string[];
    regions?: string[];
    url: string;
  }>;
  devicePresets?: Array<{
    name: string;
    devices: string[];
    os?: string[];
    browsers?: string[];
    url: string;
  }>;
  timePresets?: Array<{
    name: string;
    startTime: string;
    endTime: string;
    days: number[];
    timezone: string;
    url: string;
  }>;
  defaultUrl?: string;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRedirectRuleTemplateDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: RedirectRuleTemplate['category'];
  abTestVariants?: RedirectRuleTemplate['abTestVariants'];
  geoPresets?: RedirectRuleTemplate['geoPresets'];
  devicePresets?: RedirectRuleTemplate['devicePresets'];
  timePresets?: RedirectRuleTemplate['timePresets'];
  defaultUrl?: string;
}

const QUERY_KEY = ['redirect-rule-templates'];

export function useRedirectRuleTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.isFavorite !== undefined) params.append('isFavorite', String(options.isFavorite));
      if (options?.search) params.append('search', options.search);

      const { data } = await api.get(`/api/v1/redirect-rule-templates?${params}`);
      return data.data as RedirectRuleTemplate[];
    },
  });
}

export function useCreateRedirectRuleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateRedirectRuleTemplateDto) => {
      const { data } = await api.post('/api/v1/redirect-rule-templates', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateRedirectRuleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateRedirectRuleTemplateDto> }) => {
      const response = await api.put(`/api/v1/redirect-rule-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteRedirectRuleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/redirect-rule-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleRedirectRuleTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/redirect-rule-templates/${id}/favorite`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDuplicateRedirectRuleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/redirect-rule-templates/${id}/duplicate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
