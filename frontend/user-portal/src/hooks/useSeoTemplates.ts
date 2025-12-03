import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seoTemplateService } from '@/lib/api';
import type { SeoTemplate, CreateSeoTemplateDto } from '@lnk/shared-types';

export type { SeoTemplate, CreateSeoTemplateDto };

const QUERY_KEY = ['seo-templates'];

export function useSeoTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const { data } = await seoTemplateService.getAll(options);
      return data.data as SeoTemplate[];
    },
  });
}

export function useCreateSeoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateSeoTemplateDto) => {
      const { data } = await seoTemplateService.create(dto);
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
      const response = await seoTemplateService.update(id, data);
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
      await seoTemplateService.delete(id);
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
      const { data } = await seoTemplateService.toggleFavorite(id);
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
      const { data } = await seoTemplateService.duplicate(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
