import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkService } from '@/lib/api';

export interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  tags: string[];
  clicks: number;
  status: 'active' | 'inactive' | 'archived';
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  folderId?: string;
}

export function useLinks(params?: LinkQueryParams) {
  return useQuery({
    queryKey: ['links', params],
    queryFn: async () => {
      const { data } = await linkService.getAll(params);
      return data as { items: Link[]; total: number; page: number; limit: number };
    },
  });
}

export function useLink(id: string) {
  return useQuery({
    queryKey: ['links', id],
    queryFn: async () => {
      const { data } = await linkService.getOne(id);
      return data as Link;
    },
    enabled: !!id,
  });
}

export function useLinkStats(id: string) {
  return useQuery({
    queryKey: ['links', id, 'stats'],
    queryFn: async () => {
      const { data } = await linkService.getStats(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { originalUrl: string; customCode?: string; title?: string; tags?: string[] }) =>
      linkService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

export function useUpdateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => linkService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['links', id] });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => linkService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

export function useBulkOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, operation, data }: { ids: string[]; operation: string; data?: any }) =>
      linkService.bulkOperation(ids, operation, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}
