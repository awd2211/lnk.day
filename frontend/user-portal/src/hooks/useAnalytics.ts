import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api';

export interface AnalyticsSummary {
  totalClicks: number;
  todayClicks: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; clicks: number }>;
  topDevices: Array<{ device: string; clicks: number }>;
  topBrowsers: Array<{ browser: string; clicks: number }>;
}

export interface HourlyActivityData {
  hour: number;
  day: number; // 0 = Sunday, 1 = Monday, etc.
  clicks: number;
}

export interface LinkAnalytics {
  linkId: string;
  totalClicks: number;
  uniqueClicks: number;
  clicksByDay: Array<{ date: string; clicks: number }>;
  clicksByHour: Array<{ hour: number; clicks: number }>;
  hourlyActivity?: HourlyActivityData[];
  countries: Array<{ country: string; clicks: number; percentage: number }>;
  devices: Array<{ device: string; clicks: number; percentage: number }>;
  browsers: Array<{ browser: string; clicks: number; percentage: number }>;
  referrers: Array<{ referrer: string; clicks: number; percentage: number }>;
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const { data } = await analyticsService.getSummary();
      return data as AnalyticsSummary;
    },
  });
}

export function useLinkAnalytics(linkId: string, params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['analytics', 'link', linkId, params],
    queryFn: async () => {
      const { data } = await analyticsService.getLinkAnalytics(linkId, params);
      return data as LinkAnalytics;
    },
    enabled: !!linkId,
  });
}

export function useTeamAnalytics(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['analytics', 'team', params],
    queryFn: async () => {
      const { data } = await analyticsService.getTeamAnalytics(params);
      return data;
    },
  });
}

export function useRealtimeAnalytics(linkId: string) {
  return useQuery({
    queryKey: ['analytics', 'realtime', linkId],
    queryFn: async () => {
      const { data } = await analyticsService.getRealtime(linkId);
      return data;
    },
    enabled: !!linkId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
