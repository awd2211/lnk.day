import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DeepLinkTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: 'social' | 'commerce' | 'media' | 'utility' | 'custom';
  ios?: {
    bundleId?: string;
    appStoreId?: string;
    customScheme?: string;
    universalLink?: string;
    fallbackUrl?: string;
  };
  android?: {
    packageName?: string;
    playStoreUrl?: string;
    customScheme?: string;
    appLinks?: string[];
    fallbackUrl?: string;
  };
  fallbackUrl?: string;
  enableDeferred?: boolean;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeepLinkTemplateDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  ios?: DeepLinkTemplate['ios'];
  android?: DeepLinkTemplate['android'];
  fallbackUrl?: string;
  enableDeferred?: boolean;
}

const QUERY_KEY = ['deeplink-templates'];

export function useDeepLinkTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.isFavorite !== undefined) params.append('isFavorite', String(options.isFavorite));
      if (options?.search) params.append('search', options.search);

      const { data } = await api.get(`/api/v1/deeplink-templates?${params}`);
      return data.data as DeepLinkTemplate[];
    },
  });
}

export function useDeepLinkTemplate(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/deeplink-templates/${id}`);
      return data as DeepLinkTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateDeepLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateDeepLinkTemplateDto) => {
      const { data } = await api.post('/api/v1/deeplink-templates', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateDeepLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateDeepLinkTemplateDto> }) => {
      const response = await api.put(`/api/v1/deeplink-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteDeepLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/deeplink-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleDeepLinkTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/deeplink-templates/${id}/favorite`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDuplicateDeepLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/deeplink-templates/${id}/duplicate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
