import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ConsentSettings {
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
  personalization: boolean;
}

export interface PrivacySettings {
  id: string;
  userId: string;
  dataRetentionDays: number;
  anonymizeIp: boolean;
  doNotTrack: boolean;
  consentSettings: ConsentSettings;
  lastUpdated: string;
}

export interface DataExportRequest {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface DataDeletionRequest {
  id: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  requestedAt: string;
  scheduledFor?: string;
  completedAt?: string;
  dataTypes: string[];
}

export interface UsageQuota {
  links: { used: number; limit: number; unlimited: boolean };
  clicks: { used: number; limit: number; unlimited: boolean };
  domains: { used: number; limit: number; unlimited: boolean };
  teamMembers: { used: number; limit: number; unlimited: boolean };
  apiCalls: { used: number; limit: number; unlimited: boolean };
  qrCodes: { used: number; limit: number; unlimited: boolean };
  bioLinks: { used: number; limit: number; unlimited: boolean };
  campaigns: { used: number; limit: number; unlimited: boolean };
  storage: { used: number; limit: number; unlimited: boolean; unit: string };
}

export function usePrivacySettings() {
  return useQuery({
    queryKey: ['privacy-settings'],
    queryFn: async () => {
      const response = await api.get<PrivacySettings>('/privacy/settings');
      return response.data;
    },
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PrivacySettings>) => {
      const response = await api.patch<PrivacySettings>('/privacy/settings', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
    },
  });
}

export function useDataExportRequests() {
  return useQuery({
    queryKey: ['data-export-requests'],
    queryFn: async () => {
      const response = await api.get<DataExportRequest[]>('/privacy/exports');
      return response.data;
    },
  });
}

export function useRequestDataExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (format: 'json' | 'csv') => {
      const response = await api.post<DataExportRequest>('/privacy/exports', { format });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-export-requests'] });
    },
  });
}

export function useDataDeletionRequests() {
  return useQuery({
    queryKey: ['data-deletion-requests'],
    queryFn: async () => {
      const response = await api.get<DataDeletionRequest[]>('/privacy/deletions');
      return response.data;
    },
  });
}

export function useRequestDataDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dataTypes: string[]) => {
      const response = await api.post<DataDeletionRequest>('/privacy/deletions', { dataTypes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-deletion-requests'] });
    },
  });
}

export function useCancelDataDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      await api.delete(`/privacy/deletions/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-deletion-requests'] });
    },
  });
}

export function useUsageQuota() {
  return useQuery({
    queryKey: ['usage-quota'],
    queryFn: async () => {
      const response = await api.get<UsageQuota>('/billing/quota');
      return response.data;
    },
    refetchInterval: 60000, // 每分钟刷新一次
  });
}
