import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'expired';
export type DomainType = 'custom' | 'subdomain';

export interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
}

export interface CustomDomain {
  id: string;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  isDefault: boolean;
  sslEnabled: boolean;
  sslExpiresAt?: string;
  dnsRecords: DnsRecord[];
  verifiedAt?: string;
  lastCheckedAt?: string;
  errorMessage?: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDomainData {
  domain: string;
  type?: DomainType;
}

export interface UpdateDomainData {
  isDefault?: boolean;
  sslEnabled?: boolean;
}

// Query: Get all domains
export function useDomains() {
  return useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data } = await api.get('/domains');
      return data as CustomDomain[];
    },
  });
}

// Query: Get single domain
export function useDomain(id: string | null) {
  return useQuery({
    queryKey: ['domains', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/domains/${id}`);
      return data as CustomDomain;
    },
    enabled: !!id,
  });
}

// Query: Verify domain DNS
export function useDomainVerification(id: string | null) {
  return useQuery({
    queryKey: ['domains', id, 'verify'],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/domains/${id}/verify`);
      return data as { isValid: boolean; errors: string[] };
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Keep checking if not verified
      return query.state.data?.isValid ? false : 30000;
    },
  });
}

// Mutation: Add domain
export function useAddDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDomainData) => {
      const response = await api.post('/domains', data);
      return response.data as CustomDomain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

// Mutation: Update domain
export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDomainData }) => {
      const response = await api.patch(`/domains/${id}`, data);
      return response.data as CustomDomain;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domains', id] });
    },
  });
}

// Mutation: Remove domain
export function useRemoveDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

// Mutation: Verify domain
export function useVerifyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/domains/${id}/verify`);
      return response.data as CustomDomain;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domains', id] });
    },
  });
}

// Mutation: Set default domain
export function useSetDefaultDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/domains/${id}/set-default`);
      return response.data as CustomDomain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}

// Status labels and colors
export const DOMAIN_STATUS_CONFIG: Record<
  DomainStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: '待验证', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  verifying: { label: '验证中', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  active: { label: '已激活', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: '验证失败', color: 'text-red-600', bgColor: 'bg-red-100' },
  expired: { label: '已过期', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};
