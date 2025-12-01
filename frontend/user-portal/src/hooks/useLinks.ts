import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkService } from '@/lib/api';

export interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  tags: string[];
  clicks: number;
  totalClicks?: number;
  uniqueClicks?: number;
  status: 'active' | 'inactive' | 'archived' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  folderId?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  folderId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'clicks' | 'title' | 'shortCode';
  sortOrder?: 'ASC' | 'DESC';
}

export function useLinks(params?: LinkQueryParams) {
  return useQuery({
    queryKey: ['links', params],
    queryFn: async () => {
      const { data } = await linkService.getAll(params);
      // 后端返回 { links: [...], total: N }，需要映射为前端期望的格式
      const rawLinks = data.links || data.items || [];
      const items = rawLinks.map((link: any) => ({
        ...link,
        // 映射 totalClicks -> clicks (如果 clicks 不存在)
        clicks: link.clicks ?? link.totalClicks ?? 0,
        // 统一状态为小写
        status: (link.status || 'active').toLowerCase(),
      }));
      return {
        items,
        total: data.total || 0,
        page: data.page || params?.page || 1,
        limit: data.limit || params?.limit || 10,
      } as { items: Link[]; total: number; page: number; limit: number };
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
    mutationFn: (data: { originalUrl: string; customCode?: string; title?: string; tags?: string[]; folderId?: string }) =>
      linkService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
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
