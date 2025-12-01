import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: string | number | string[] | [number, number];
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface CreateSavedSearchDto {
  name: string;
  description?: string;
  filters: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
  isShared?: boolean;
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      const response = await api.get<SavedSearch[]>('/api/v1/search/saved');
      return response.data;
    },
  });
}

export function useSavedSearch(id: string) {
  return useQuery({
    queryKey: ['saved-searches', id],
    queryFn: async () => {
      const response = await api.get<SavedSearch>(`/api/v1/search/saved/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSavedSearchDto) => {
      const response = await api.post<SavedSearch>('/api/v1/search/saved', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSavedSearchDto> }) => {
      const response = await api.patch<SavedSearch>(`/api/v1/search/saved/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/search/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

export function useApplySavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ results: any[] }>(`/api/v1/search/saved/${id}/apply`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', id] });
    },
  });
}

export function useSetDefaultSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SavedSearch>(`/api/v1/search/saved/${id}/set-default`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

export function useDuplicateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SavedSearch>(`/api/v1/search/saved/${id}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}
