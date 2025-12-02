import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SeoTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: 'general' | 'landing_page' | 'bio_link' | 'product' | 'article' | 'profile';
  // Meta
  metaTitleTemplate?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  metaAuthor?: string;
  metaRobots?: string;
  metaLanguage?: string;
  // Open Graph
  ogTitleTemplate?: string;
  ogDescription?: string;
  ogType?: 'website' | 'article' | 'profile' | 'product';
  ogImage?: string;
  ogSiteName?: string;
  ogLocale?: string;
  // Twitter
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitleTemplate?: string;
  twitterDescription?: string;
  twitterImage?: string;
  // Other
  favicon?: string;
  canonicalUrlPattern?: string;
  customMeta?: Array<{ name: string; content: string }>;
  schemaConfig?: { type?: string; additionalProperties?: Record<string, any> };
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeoTemplateDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: SeoTemplate['category'];
  metaTitleTemplate?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  metaAuthor?: string;
  metaRobots?: string;
  metaLanguage?: string;
  ogTitleTemplate?: string;
  ogDescription?: string;
  ogType?: SeoTemplate['ogType'];
  ogImage?: string;
  ogSiteName?: string;
  ogLocale?: string;
  twitterCard?: SeoTemplate['twitterCard'];
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitleTemplate?: string;
  twitterDescription?: string;
  twitterImage?: string;
  favicon?: string;
  canonicalUrlPattern?: string;
  customMeta?: SeoTemplate['customMeta'];
  schemaConfig?: SeoTemplate['schemaConfig'];
}

const QUERY_KEY = ['seo-templates'];

export function useSeoTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.isFavorite !== undefined) params.append('isFavorite', String(options.isFavorite));
      if (options?.search) params.append('search', options.search);

      const { data } = await api.get(`/api/v1/seo-templates?${params}`);
      return data.data as SeoTemplate[];
    },
  });
}

export function useCreateSeoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateSeoTemplateDto) => {
      const { data } = await api.post('/api/v1/seo-templates', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateSeoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSeoTemplateDto> }) => {
      const response = await api.put(`/api/v1/seo-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteSeoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/seo-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleSeoTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/api/v1/seo-templates/${id}/favorite`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDuplicateSeoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/v1/seo-templates/${id}/duplicate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
