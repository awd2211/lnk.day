import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ========== Types ==========

export type CohortType = 'acquisition' | 'behavioral' | 'attribute' | 'campaign' | 'custom';
export type CohortGranularity = 'daily' | 'weekly' | 'monthly';
export type CohortMetric = 'retention' | 'clicks' | 'unique_visitors' | 'conversions' | 'revenue' | 'qr_scans' | 'page_views';

export interface CohortCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface Cohort {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  type: CohortType;
  granularity: CohortGranularity;
  entry_event?: string;
  entry_conditions: CohortCondition[];
  return_event: string;
  return_conditions: CohortCondition[];
  filters?: Record<string, unknown>;
  periods_to_track: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CohortCreate {
  name: string;
  description?: string;
  type?: CohortType;
  granularity?: CohortGranularity;
  entry_event?: string;
  entry_conditions?: CohortCondition[];
  return_event?: string;
  return_conditions?: CohortCondition[];
  filters?: Record<string, unknown>;
  periods_to_track?: number;
}

export interface CohortUpdate extends Partial<CohortCreate> {
  is_active?: boolean;
}

export interface CohortPeriod {
  period: number;
  period_label: string;
  users: number;
  retained_users: number;
  new_users: number;
  retention_rate: number;
  churn_rate: number;
  total_clicks: number;
  total_conversions: number;
  avg_clicks_per_user: number;
}

export interface CohortRow {
  cohort_id: string;
  cohort_start: string;
  cohort_label: string;
  initial_size: number;
  periods: CohortPeriod[];
}

export interface RetentionMatrix {
  matrix: (number | null)[][];
  row_labels: string[];
  column_labels: string[];
  period_averages: number[];
  best_cohort?: string;
  worst_cohort?: string;
}

export interface CohortAnalysis {
  cohort_id: string;
  cohort_name: string;
  start_date: string;
  end_date: string;
  granularity: CohortGranularity;
  metric: CohortMetric;
  cohorts: CohortRow[];
  retention_matrix: RetentionMatrix;
  total_users: number;
  average_retention_period1: number;
  average_retention_period4: number;
  average_retention_period12: number;
  retention_trend: 'improving' | 'declining' | 'stable';
  trend_percentage: number;
  by_country?: Array<{ country: string; users: number; events: number }>;
  by_device?: Array<{ device: string; users: number; events: number }>;
  by_source?: Array<{ source: string; users: number; events: number }>;
}

export interface CohortSegment {
  segment_name: string;
  segment_value: string;
  user_count: number;
  percentage_of_cohort: number;
  retention_rates: number[];
  avg_retention: number;
  retention_vs_average: number;
}

export interface CohortInsight {
  insight_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  affected_cohorts: string[];
  affected_periods: number[];
  recommendations: string[];
}

export interface PresetCohort {
  id: string;
  name: string;
  description: string;
  type: CohortType;
  granularity: CohortGranularity;
  entry_event?: string;
  return_event: string;
}

export interface QuickRetentionResult {
  period_type: string;
  periods_analyzed: number;
  retention_matrix: RetentionMatrix;
  summary: {
    week1_retention?: number;
    week4_retention?: number;
    month1_retention?: number;
    month3_retention?: number;
    trend: string;
    trend_change: number;
  };
}

export interface AcquisitionTrend {
  period_days: number;
  daily_acquisition: Array<{ date: string; new_users: number }>;
  total_new_users: number;
  average_daily: number;
}

// ========== CRUD Hooks ==========

export function useCohorts(teamId: string, activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['cohorts', teamId, activeOnly],
    queryFn: async () => {
      const { data } = await api.get<{ cohorts: Cohort[]; total: number }>(
        '/analytics/cohorts',
        {
          params: { active_only: activeOnly },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!teamId,
  });
}

export function useCohort(cohortId: string, teamId: string) {
  return useQuery({
    queryKey: ['cohort', cohortId, teamId],
    queryFn: async () => {
      const { data } = await api.get<Cohort>(`/analytics/cohorts/${cohortId}`, {
        headers: { 'X-Team-ID': teamId },
      });
      return data;
    },
    enabled: !!cohortId && !!teamId,
  });
}

export function useCreateCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, cohort }: { teamId: string; cohort: CohortCreate }) => {
      const { data } = await api.post<Cohort>('/analytics/cohorts', cohort, {
        headers: { 'X-Team-ID': teamId },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cohorts', variables.teamId] });
    },
  });
}

export function useUpdateCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cohortId,
      teamId,
      updates,
    }: {
      cohortId: string;
      teamId: string;
      updates: CohortUpdate;
    }) => {
      const { data } = await api.patch<Cohort>(`/analytics/cohorts/${cohortId}`, updates, {
        headers: { 'X-Team-ID': teamId },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cohorts', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['cohort', variables.cohortId] });
    },
  });
}

export function useDeleteCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cohortId, teamId }: { cohortId: string; teamId: string }) => {
      await api.delete(`/analytics/cohorts/${cohortId}`, {
        headers: { 'X-Team-ID': teamId },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cohorts', variables.teamId] });
    },
  });
}

// ========== Analysis Hooks ==========

export function useCohortAnalysis(
  cohortId: string,
  teamId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    metric?: CohortMetric;
    breakdownBy?: string;
  },
) {
  return useQuery({
    queryKey: ['cohort-analysis', cohortId, teamId, options],
    queryFn: async () => {
      const { data } = await api.get<CohortAnalysis>(
        `/analytics/cohorts/${cohortId}/analyze`,
        {
          params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
            metric: options?.metric,
            breakdown_by: options?.breakdownBy,
          },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!cohortId && !!teamId,
  });
}

export function useRetentionMatrix(
  cohortId: string,
  teamId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  },
) {
  return useQuery({
    queryKey: ['retention-matrix', cohortId, teamId, options],
    queryFn: async () => {
      const { data } = await api.get<RetentionMatrix>(
        `/analytics/cohorts/${cohortId}/retention-matrix`,
        {
          params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
          },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!cohortId && !!teamId,
  });
}

export function useCohortSegments(
  cohortId: string,
  teamId: string,
  segmentBy: 'country' | 'device' | 'source',
  options?: {
    startDate?: string;
    endDate?: string;
  },
) {
  return useQuery({
    queryKey: ['cohort-segments', cohortId, teamId, segmentBy, options],
    queryFn: async () => {
      const { data } = await api.get<{ segments: CohortSegment[]; total: number }>(
        `/analytics/cohorts/${cohortId}/segments`,
        {
          params: {
            segment_by: segmentBy,
            start_date: options?.startDate,
            end_date: options?.endDate,
          },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!cohortId && !!teamId,
  });
}

export function useCohortInsights(
  cohortId: string,
  teamId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  },
) {
  return useQuery({
    queryKey: ['cohort-insights', cohortId, teamId, options],
    queryFn: async () => {
      const { data } = await api.get<{ insights: CohortInsight[] }>(
        `/analytics/cohorts/${cohortId}/insights`,
        {
          params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
          },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data.insights;
    },
    enabled: !!cohortId && !!teamId,
  });
}

// ========== Preset Hooks ==========

export function useCohortPresets() {
  return useQuery({
    queryKey: ['cohort-presets'],
    queryFn: async () => {
      const { data } = await api.get<{ presets: PresetCohort[] }>(
        '/analytics/cohorts/presets',
      );
      return data.presets;
    },
  });
}

export function useCreateCohortFromPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      presetId,
      name,
    }: {
      teamId: string;
      presetId: string;
      name?: string;
    }) => {
      const { data } = await api.post<Cohort>(
        '/analytics/cohorts/from-preset',
        { preset_id: presetId, name },
        { headers: { 'X-Team-ID': teamId } },
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cohorts', variables.teamId] });
    },
  });
}

// ========== Quick Analysis Hooks ==========

export function useWeeklyRetention(teamId: string, weeks: number = 12) {
  return useQuery({
    queryKey: ['weekly-retention', teamId, weeks],
    queryFn: async () => {
      const { data } = await api.get<QuickRetentionResult>(
        '/analytics/cohorts/quick/weekly-retention',
        {
          params: { weeks },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!teamId,
  });
}

export function useMonthlyRetention(teamId: string, months: number = 6) {
  return useQuery({
    queryKey: ['monthly-retention', teamId, months],
    queryFn: async () => {
      const { data } = await api.get<QuickRetentionResult>(
        '/analytics/cohorts/quick/monthly-retention',
        {
          params: { months },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!teamId,
  });
}

export function useAcquisitionTrend(teamId: string, days: number = 30) {
  return useQuery({
    queryKey: ['acquisition-trend', teamId, days],
    queryFn: async () => {
      const { data } = await api.get<AcquisitionTrend>(
        '/analytics/cohorts/quick/acquisition-trend',
        {
          params: { days },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
    enabled: !!teamId,
  });
}

// ========== Export Hook ==========

export function useExportCohortData() {
  return useMutation({
    mutationFn: async ({
      cohortId,
      teamId,
      format = 'csv',
      startDate,
      endDate,
    }: {
      cohortId: string;
      teamId: string;
      format?: 'csv' | 'json';
      startDate?: string;
      endDate?: string;
    }) => {
      const { data } = await api.get<{ format: string; data: unknown }>(
        `/analytics/cohorts/${cohortId}/export`,
        {
          params: { format, start_date: startDate, end_date: endDate },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
  });
}

// ========== Comparison Hook ==========

export function useCompareCohortSegments() {
  return useMutation({
    mutationFn: async ({
      cohortId,
      teamId,
      segmentField,
      segmentValues,
      startDate,
      endDate,
    }: {
      cohortId: string;
      teamId: string;
      segmentField: string;
      segmentValues: string[];
      startDate?: string;
      endDate?: string;
    }) => {
      const { data } = await api.post(
        `/analytics/cohorts/${cohortId}/compare`,
        { segment_field: segmentField, segment_values: segmentValues },
        {
          params: { start_date: startDate, end_date: endDate },
          headers: { 'X-Team-ID': teamId },
        },
      );
      return data;
    },
  });
}
