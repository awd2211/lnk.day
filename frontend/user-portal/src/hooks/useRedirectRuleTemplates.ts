import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { redirectRuleTemplateService } from '@/lib/api';
import type { RedirectRuleTemplate, CreateRedirectRuleTemplateDto } from '@lnk/shared-types';

export type { RedirectRuleTemplate, CreateRedirectRuleTemplateDto };

const QUERY_KEY = ['redirect-rule-templates'];

export function useRedirectRuleTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const { data } = await redirectRuleTemplateService.getAll(options);
      return data.data as RedirectRuleTemplate[];
    },
  });
}

export function useCreateRedirectRuleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateRedirectRuleTemplateDto) => {
      const { data } = await redirectRuleTemplateService.create(dto);
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
      const response = await redirectRuleTemplateService.update(id, data);
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
      await redirectRuleTemplateService.delete(id);
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
      const { data } = await redirectRuleTemplateService.toggleFavorite(id);
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
      const { data } = await redirectRuleTemplateService.duplicate(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
