import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webhookTemplateService } from '@/lib/api';
import type { WebhookTemplate, CreateWebhookTemplateDto } from '@lnk/shared-types';

export type { WebhookTemplate, CreateWebhookTemplateDto };

const QUERY_KEY = ['webhook-templates'];

export function useWebhookTemplates(options?: { platform?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const { data } = await webhookTemplateService.getAll(options);
      return data.data as WebhookTemplate[];
    },
  });
}

export function useCreateWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateWebhookTemplateDto) => {
      const { data } = await webhookTemplateService.create(dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWebhookTemplateDto> }) => {
      const response = await webhookTemplateService.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await webhookTemplateService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleWebhookTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await webhookTemplateService.toggleFavorite(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDuplicateWebhookTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await webhookTemplateService.duplicate(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
