import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api';

export interface AnalyticsSummary {
  totalClicks: number;
  todayClicks: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; clicks: number; percentage?: number }>;
  topDevices: Array<{ device: string; clicks: number; percentage?: number }>;
  topBrowsers: Array<{ browser: string; clicks: number; percentage?: number }>;
  clicksByDay?: Array<{ date: string; clicks: number }>;
  // 变化率（与上一周期对比）
  clicksChange?: number;
  visitorsChange?: number;
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
      // 映射后端返回的字段名到前端期望的格式
      return {
        totalClicks: data.totalClicks || 0,
        todayClicks: data.todayClicks || 0,
        uniqueVisitors: data.uniqueVisitors || 0,
        topCountries: data.countries || [],
        topDevices: data.devices || [],
        topBrowsers: data.browsers || [],
        clicksByDay: data.clicksByDay || [],
      } as AnalyticsSummary;
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

export interface TeamRealtimeStats {
  team_id: string;
  clicks_this_minute: number;
  clicks_last_5_minutes: number;
  clicks_this_hour: number;
  timestamp: string;
}

export function useTeamRealtimeAnalytics(teamId?: string) {
  return useQuery({
    queryKey: ['analytics', 'realtime', 'team', teamId],
    queryFn: async () => {
      const { data } = await analyticsService.getTeamRealtime(teamId!);
      return data as TeamRealtimeStats;
    },
    enabled: !!teamId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useClickTrends(period: string = '7d') {
  return useQuery({
    queryKey: ['analytics', 'trends', period],
    queryFn: async () => {
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
      startDate.setDate(endDate.getDate() - days);

      const { data } = await analyticsService.getTeamAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      return {
        period,
        data: data?.clicksByDay || [],
      };
    },
  });
}
