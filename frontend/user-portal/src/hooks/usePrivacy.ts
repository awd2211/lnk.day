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
      const response = await api.get<PrivacySettings>('/api/v1/privacy/overview');
      return response.data;
    },
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PrivacySettings>) => {
      // 更新同意设置
      const consents = [];
      if (settings.consentSettings) {
        for (const [key, value] of Object.entries(settings.consentSettings)) {
          consents.push({ type: key, granted: value });
        }
      }
      const response = await api.post('/api/v1/privacy/consents/bulk', { consents });
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
      const response = await api.get<{ requests: DataExportRequest[] }>('/api/v1/privacy/requests');
      // 过滤出导出请求
      return response.data.requests.filter((r: any) => r.type === 'export');
    },
  });
}

export function useRequestDataExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_format: 'json' | 'csv') => {
      const response = await api.post<{ request: DataExportRequest }>('/api/v1/privacy/export');
      return response.data.request;
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
      const response = await api.get<{ requests: DataDeletionRequest[] }>('/api/v1/privacy/requests');
      // 过滤出删除请求
      return response.data.requests.filter((r: any) => r.type === 'delete');
    },
  });
}

export function useRequestDataDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dataTypes: string[]) => {
      const response = await api.post<{ requestId: string }>('/api/v1/privacy/delete-account', {
        reason: `Delete data types: ${dataTypes.join(', ')}`
      });
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
      await api.delete(`/api/v1/privacy/delete-account/${requestId}`);
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
      const response = await api.get<UsageQuota>('/api/v1/billing/quota');
      return response.data;
    },
    refetchInterval: 60000, // 每分钟刷新一次
  });
}
