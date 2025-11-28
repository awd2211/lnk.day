import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deepLinkService } from '@/lib/api';

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
    }) => deepLinkService.create(linkId, data),
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
