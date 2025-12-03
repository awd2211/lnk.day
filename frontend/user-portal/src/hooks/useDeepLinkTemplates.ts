import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deepLinkTemplateService } from '@/lib/api';
import type { DeepLinkTemplate, CreateDeepLinkTemplateDto } from '@lnk/shared-types';

export type { DeepLinkTemplate, CreateDeepLinkTemplateDto };

const QUERY_KEY = ['deeplink-templates'];

export function useDeepLinkTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const { data } = await deepLinkTemplateService.getAll(options);
      return data.data as DeepLinkTemplate[];
    },
  });
}

export function useDeepLinkTemplate(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await deepLinkTemplateService.getOne(id);
      return data as DeepLinkTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateDeepLinkTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateDeepLinkTemplateDto) => {
      const { data } = await deepLinkTemplateService.create(dto);
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
      const response = await deepLinkTemplateService.update(id, data);
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
      await deepLinkTemplateService.delete(id);
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
      const { data } = await deepLinkTemplateService.toggleFavorite(id);
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
      const { data } = await deepLinkTemplateService.duplicate(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
