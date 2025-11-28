import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';

export type ReportType = 'summary' | 'links' | 'campaigns' | 'geographic' | 'devices' | 'custom';
export type ReportFormat = 'pdf' | 'csv' | 'xlsx';
export type ReportSchedule = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReportConfig {
  type: ReportType;
  name: string;
  description?: string;
  dateRange: {
    start: string;
    end: string;
  };
  filters?: {
    linkIds?: string[];
    folderId?: string;
    tags?: string[];
    countries?: string[];
    devices?: string[];
  };
  metrics: string[];
  groupBy?: string;
  format: ReportFormat;
  schedule?: ReportSchedule;
  recipients?: string[];
}

export interface Report {
  id: string;
  type: ReportType;
  name: string;
  description?: string;
  config: ReportConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  config: ReportConfig;
  schedule: ReportSchedule;
  nextRunAt: string;
  lastRunAt?: string;
  isActive: boolean;
  createdAt: string;
}

// Query: Get all reports
export function useReports(params?: { page?: number; limit?: number; type?: ReportType }) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const { data } = await analyticsApi.get('/api/reports', { params });
      return data as { items: Report[]; total: number };
    },
  });
}

// Query: Get single report
export function useReport(id: string | null) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await analyticsApi.get(`/api/reports/${id}`);
      return data as Report;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch every 5 seconds if report is processing
      const data = query.state.data;
      return data?.status === 'processing' ? 5000 : false;
    },
  });
}

// Query: Get scheduled reports
export function useScheduledReports() {
  return useQuery({
    queryKey: ['reports', 'scheduled'],
    queryFn: async () => {
      const { data } = await analyticsApi.get('/api/reports/scheduled');
      return data as ScheduledReport[];
    },
  });
}

// Mutation: Generate report
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<ReportConfig, 'schedule'>) => {
      const { data } = await analyticsApi.post('/api/reports/generate', config);
      return data as Report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Mutation: Schedule report
export function useScheduleReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: ReportConfig) => {
      const { data } = await analyticsApi.post('/api/reports/schedule', config);
      return data as ScheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
    },
  });
}

// Mutation: Delete report
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await analyticsApi.delete(`/api/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Mutation: Toggle scheduled report
export function useToggleScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await analyticsApi.post(`/api/reports/scheduled/${id}/toggle`);
      return data as ScheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
    },
  });
}

// Mutation: Delete scheduled report
export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await analyticsApi.delete(`/api/reports/scheduled/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
    },
  });
}

// Available metrics
export const REPORT_METRICS = [
  { id: 'clicks', label: '点击数', category: 'basic' },
  { id: 'unique_clicks', label: '独立点击', category: 'basic' },
  { id: 'conversion_rate', label: '转化率', category: 'basic' },
  { id: 'bounce_rate', label: '跳出率', category: 'basic' },
  { id: 'avg_time_to_click', label: '平均点击时间', category: 'engagement' },
  { id: 'devices', label: '设备分布', category: 'demographic' },
  { id: 'browsers', label: '浏览器分布', category: 'demographic' },
  { id: 'countries', label: '国家分布', category: 'demographic' },
  { id: 'cities', label: '城市分布', category: 'demographic' },
  { id: 'referrers', label: '来源网站', category: 'traffic' },
  { id: 'utm_source', label: 'UTM 来源', category: 'traffic' },
  { id: 'utm_medium', label: 'UTM 媒介', category: 'traffic' },
  { id: 'utm_campaign', label: 'UTM 活动', category: 'traffic' },
];

// Report type labels
export const REPORT_TYPE_LABELS: Record<ReportType, { label: string; description: string }> = {
  summary: { label: '综合报告', description: '全面的数据概览和趋势分析' },
  links: { label: '链接报告', description: '特定链接的详细分析' },
  campaigns: { label: '活动报告', description: '营销活动效果分析' },
  geographic: { label: '地理分布报告', description: '访问者地理位置分析' },
  devices: { label: '设备报告', description: '设备和浏览器分析' },
  custom: { label: '自定义报告', description: '自定义指标和维度' },
};

// Schedule labels
export const SCHEDULE_LABELS: Record<ReportSchedule, string> = {
  once: '仅一次',
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

// Format labels
export const FORMAT_LABELS: Record<ReportFormat, { label: string; icon: string }> = {
  pdf: { label: 'PDF', icon: 'file-text' },
  csv: { label: 'CSV', icon: 'file-spreadsheet' },
  xlsx: { label: 'Excel', icon: 'file-spreadsheet' },
};
