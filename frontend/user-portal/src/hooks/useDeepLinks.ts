import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deepLinkService, api } from '@/lib/api';

// Query params interface
export interface DeepLinkQueryParams {
  status?: 'enabled' | 'disabled';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'enabled' | 'clicks' | 'installs';
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface DeepLinkListResponse {
  items: DeepLinkConfig[];
  total: number;
  page: number;
  limit: number;
}

// Types
export interface DeepLinkIosConfig {
  appStoreId?: string;
  bundleId?: string;
  universalLink?: string;
  customScheme?: string;
}

export interface DeepLinkAndroidConfig {
  packageName?: string;
  sha256Fingerprint?: string;
  appLink?: string;
  customScheme?: string;
}

export interface DeepLinkConfig {
  id: string;
  linkId: string;
  iosConfig?: DeepLinkIosConfig;
  androidConfig?: DeepLinkAndroidConfig;
  fallbackUrl?: string;
  fallbackBehavior: 'redirect' | 'app_store' | 'custom';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeepLinkResolveResult {
  platform: 'ios' | 'android' | 'other';
  action: 'app' | 'store' | 'fallback';
  targetUrl: string;
  appScheme?: string;
}

// Hooks

// Get all deep links with pagination/sorting
export function useDeepLinks(params?: DeepLinkQueryParams) {
  return useQuery({
    queryKey: ['deep-links', 'list', params],
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      if (params?.status) urlParams.append('status', params.status);
      if (params?.page) urlParams.append('page', String(params.page));
      if (params?.limit) urlParams.append('limit', String(params.limit));
      if (params?.sortBy) urlParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) urlParams.append('sortOrder', params.sortOrder);
      if (params?.search) urlParams.append('search', params.search);

      const queryString = urlParams.toString();
      const { data } = await api.get<DeepLinkListResponse>(`/api/v1/deeplinks${queryString ? `?${queryString}` : ''}`);

      return {
        items: data.items,
        total: data.total,
        page: data.page,
        limit: data.limit,
      };
    },
  });
}

export function useDeepLink(linkId: string | null) {
  return useQuery({
    queryKey: ['deep-links', linkId],
    queryFn: async () => {
      if (!linkId) return null;
      try {
        const { data } = await deepLinkService.get(linkId);
        return data as DeepLinkConfig;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!linkId,
  });
}

export function useCreateDeepLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      linkId,
      data,
    }: {
      linkId: string;
      data: {
        iosConfig?: DeepLinkIosConfig;
        androidConfig?: DeepLinkAndroidConfig;
        fallbackUrl?: string;
        fallbackBehavior?: 'redirect' | 'app_store' | 'custom';
      };
    }) => deepLinkService.create({ linkId, ...data }),
    onSuccess: (_, { linkId }) => {
      queryClient.invalidateQueries({ queryKey: ['deep-links', linkId] });
    },
  });
}

export function useUpdateDeepLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      linkId,
      data,
    }: {
      linkId: string;
      data: Partial<{
        iosConfig: DeepLinkIosConfig;
        androidConfig: DeepLinkAndroidConfig;
        fallbackUrl: string;
        fallbackBehavior: 'redirect' | 'app_store' | 'custom';
        isActive: boolean;
      }>;
    }) => deepLinkService.update(linkId, data),
    onSuccess: (_, { linkId }) => {
      queryClient.invalidateQueries({ queryKey: ['deep-links', linkId] });
    },
  });
}

export function useDeleteDeepLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => deepLinkService.delete(linkId),
    onSuccess: (_, linkId) => {
      queryClient.invalidateQueries({ queryKey: ['deep-links', linkId] });
    },
  });
}

export function useResolveDeepLink() {
  return useMutation({
    mutationFn: ({ linkId, userAgent }: { linkId: string; userAgent?: string }) =>
      deepLinkService.resolve(linkId, userAgent),
  });
}
