import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ReportTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: 'traffic' | 'conversion' | 'engagement' | 'comparison' | 'custom';
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: {
    type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';
    startDate?: string;
    endDate?: string;
    compareWithPrevious?: boolean;
  };
  groupBy?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  limitResults?: number;
  format: 'pdf' | 'csv' | 'excel' | 'json';
  includeCharts: boolean;
  includeSummary: boolean;
  customBranding?: string;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    recipients: string[];
  };
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  lastGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportTemplateDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: ReportTemplate['category'];
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: ReportTemplate['dateRange'];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limitResults?: number;
  format?: 'pdf' | 'csv' | 'excel' | 'json';
  includeCharts?: boolean;
  includeSummary?: boolean;
  customBranding?: string;
  schedule?: ReportTemplate['schedule'];
}

const QUERY_KEY = ['report-templates'];

export function useReportTemplates(options?: { category?: string; isFavorite?: boolean; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.isFavorite !== undefined) params.append('isFavorite', String(options.isFavorite));
      if (options?.search) params.append('search', options.search);

      const { data } = await api.get(`/api/v1/report-templates?${params}`);
      return data.data as ReportTemplate[];
    },
  });
}

export function useCreateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateReportTemplateDto) => {
      const { data } = await api.post('/api/v1/report-templates', dto);
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
      const response = await api.put(`/api/v1/report-templates/${id}`, data);
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
      await api.delete(`/api/v1/report-templates/${id}`);
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
      const { data } = await api.patch(`/api/v1/report-templates/${id}/favorite`);
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
      const { data } = await api.post(`/api/v1/report-templates/${id}/duplicate`);
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
      const { data } = await api.post(`/api/v1/report-templates/${id}/generate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
