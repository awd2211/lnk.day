import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportTemplateService } from '@/lib/api';
import type { ReportTemplate, CreateReportTemplateDto } from '@lnk/shared-types';

export type { ReportTemplate, CreateReportTemplateDto };

const QUERY_KEY = ['report-templates'];

export function useReportTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const { data } = await reportTemplateService.getAll(options);
      return data.data as ReportTemplate[];
    },
  });
}

export function useCreateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateReportTemplateDto) => {
      const { data } = await reportTemplateService.create(dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateReportTemplateDto> }) => {
      const response = await reportTemplateService.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await reportTemplateService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useToggleReportTemplateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await reportTemplateService.toggleFavorite(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDuplicateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await reportTemplateService.duplicate(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await reportTemplateService.generate(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
