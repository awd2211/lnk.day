import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DataStreamDestination {
  type: 'bigquery' | 's3' | 'snowflake' | 'redshift' | 'gcs' | 'azure_blob' | 'kafka' | 'http';
  // BigQuery
  projectId?: string;
  datasetId?: string;
  tableId?: string;
  // S3/GCS/Azure
  bucket?: string;
  prefix?: string;
  region?: string;
  fileFormat?: 'parquet' | 'json' | 'csv';
  compression?: 'gzip' | 'snappy' | 'none';
  // Snowflake/Redshift
  host?: string;
  database?: string;
  schema?: string;
  table?: string;
  // Kafka
  brokers?: string[];
  topic?: string;
  // HTTP
  url?: string;
  headers?: Record<string, string>;
  // Credentials (encrypted)
  credentials?: Record<string, string>;
}

export interface DataStreamSchema {
  mode: 'auto' | 'custom';
  fields?: {
    name: string;
    type: string;
    description?: string;
  }[];
}

export interface DataStreamFilters {
  linkTags?: string[];
  campaignIds?: string[];
  domainIds?: string[];
  excludeBots?: boolean;
  excludeInternal?: boolean;
}

export interface DataStreamDelivery {
  mode: 'realtime' | 'batch';
  batchSize?: number;
  batchIntervalSeconds?: number;
}

export interface DataStream {
  id: string;
  name: string;
  description?: string;
  destination: DataStreamDestination;
  schema: DataStreamSchema;
  filters: DataStreamFilters;
  delivery: DataStreamDelivery;
  partitioning?: {
    enabled: boolean;
    pattern?: string;
  };
  status: 'active' | 'paused' | 'error' | 'pending';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  stats?: {
    eventsDelivered: number;
    bytesDelivered: number;
    lastDeliveryAt?: string;
    failedDeliveries: number;
  };
}

export interface DataStreamStats {
  totalStreams: number;
  activeStreams: number;
  eventsToday: number;
  bytesToday: number;
  failuresLast24h: number;
}

export interface CreateDataStreamDto {
  name: string;
  description?: string;
  destination: DataStreamDestination;
  schema?: DataStreamSchema;
  filters?: DataStreamFilters;
  delivery?: DataStreamDelivery;
  partitioning?: {
    enabled: boolean;
    pattern?: string;
  };
}

export interface BackfillRequest {
  startDate: string;
  endDate: string;
  filters?: {
    linkIds?: string[];
    campaignIds?: string[];
  };
}

export function useDataStreams() {
  return useQuery({
    queryKey: ['data-streams'],
    queryFn: async () => {
      const response = await api.get<DataStream[]>('/api/v1/data-streams');
      return response.data;
    },
  });
}

export function useDataStream(id: string) {
  return useQuery({
    queryKey: ['data-streams', id],
    queryFn: async () => {
      const response = await api.get<DataStream>(`/api/v1/data-streams/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useDataStreamStats() {
  return useQuery({
    queryKey: ['data-streams', 'stats'],
    queryFn: async () => {
      const response = await api.get<DataStreamStats>('/api/v1/data-streams/stats');
      return response.data;
    },
  });
}

export function useCreateDataStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDataStreamDto) => {
      const response = await api.post<DataStream>('/api/v1/data-streams', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-streams'] });
    },
  });
}

export function useUpdateDataStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateDataStreamDto> }) => {
      const response = await api.put<DataStream>(`/api/v1/data-streams/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-streams'] });
    },
  });
}

export function useDeleteDataStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/data-streams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-streams'] });
    },
  });
}

export function usePauseDataStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<DataStream>(`/api/v1/data-streams/${id}/pause`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-streams'] });
    },
  });
}

export function useResumeDataStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<DataStream>(`/api/v1/data-streams/${id}/resume`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-streams'] });
    },
  });
}

export function useTestDataStream() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message?: string; latency?: number }>(`/api/v1/data-streams/${id}/test`);
      return response.data;
    },
  });
}

export function useBackfillDataStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: BackfillRequest }) => {
      const response = await api.post<{ jobId: string; estimatedEvents: number }>(`/api/v1/data-streams/${id}/backfill`, request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-streams'] });
    },
  });
}

export function useDataStreamLogs(id: string) {
  return useQuery({
    queryKey: ['data-streams', id, 'logs'],
    queryFn: async () => {
      const response = await api.get<{
        timestamp: string;
        level: 'info' | 'warning' | 'error';
        message: string;
        details?: Record<string, any>;
      }[]>(`/api/v1/data-streams/${id}/logs`);
      return response.data;
    },
    enabled: !!id,
  });
}

// 目标类型配置
export const destinationTypes = [
  { value: 'bigquery', label: 'Google BigQuery', icon: 'database', category: 'data-warehouse' },
  { value: 's3', label: 'Amazon S3', icon: 'cloud', category: 'storage' },
  { value: 'gcs', label: 'Google Cloud Storage', icon: 'cloud', category: 'storage' },
  { value: 'azure_blob', label: 'Azure Blob Storage', icon: 'cloud', category: 'storage' },
  { value: 'snowflake', label: 'Snowflake', icon: 'database', category: 'data-warehouse' },
  { value: 'redshift', label: 'Amazon Redshift', icon: 'database', category: 'data-warehouse' },
  { value: 'kafka', label: 'Apache Kafka', icon: 'zap', category: 'streaming' },
  { value: 'http', label: 'HTTP Endpoint', icon: 'globe', category: 'custom' },
];
