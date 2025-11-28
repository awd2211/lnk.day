import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyService } from '@/lib/api';

// Types
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  lastUsedAt?: string;
  expiresAt?: string;
  ipWhitelist: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key, only returned on creation
}

export interface ApiScope {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'delete' | 'admin';
}

// Hooks
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await apiKeyService.getAll();
      return data as { keys: ApiKey[] };
    },
  });
}

export function useApiKey(id: string) {
  return useQuery({
    queryKey: ['api-keys', id],
    queryFn: async () => {
      const { data } = await apiKeyService.getOne(id);
      return data as ApiKey;
    },
    enabled: !!id,
  });
}

export function useApiKeyScopes() {
  return useQuery({
    queryKey: ['api-keys', 'scopes'],
    queryFn: async () => {
      const { data } = await apiKeyService.getScopes();
      return data as { scopes: ApiScope[] };
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      scopes: string[];
      expiresAt?: string;
      ipWhitelist?: string[];
    }) => apiKeyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; scopes?: string[]; ipWhitelist?: string[] };
    }) => apiKeyService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['api-keys', id] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyService.regenerate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
