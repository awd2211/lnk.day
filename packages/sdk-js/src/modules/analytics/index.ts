import type { HttpClient } from '../../utils/http';
import type {
  AnalyticsSummary,
  ClickEvent,
  TimeSeriesData,
  AnalyticsQuery,
  PaginationParams,
  PaginatedResponse,
} from '../../types';

export interface RealtimeData {
  activeVisitors: number;
  clicksLast5Minutes: number;
  clicksLastHour: number;
  topActiveLinks: Array<{
    linkId: string;
    shortCode: string;
    activeVisitors: number;
  }>;
  topCountries: Array<{ country: string; visitors: number }>;
}

export interface GeoData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  clicks: number;
  uniqueVisitors: number;
  latitude?: number;
  longitude?: number;
}

export interface DeviceData {
  device: string;
  browser: string;
  os: string;
  clicks: number;
  percentage: number;
}

export interface ReferrerData {
  referrer: string;
  domain: string;
  clicks: number;
  percentage: number;
}

export class AnalyticsModule {
  constructor(private http: HttpClient) {}

  async getSummary(
    startDate: string,
    endDate: string,
    linkId?: string,
    campaignId?: string
  ): Promise<AnalyticsSummary> {
    return this.http.get('/analytics/summary', {
      startDate,
      endDate,
      linkId,
      campaignId,
    });
  }

  async getTimeSeries(query: AnalyticsQuery): Promise<TimeSeriesData[]> {
    return this.http.get('/analytics/timeseries', query);
  }

  async getClicks(
    query: AnalyticsQuery,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ClickEvent>> {
    return this.http.get('/analytics/clicks', {
      ...query,
      ...pagination,
    });
  }

  async getRealtime(linkId?: string): Promise<RealtimeData> {
    return this.http.get('/analytics/realtime', { linkId });
  }

  async getGeoData(
    startDate: string,
    endDate: string,
    linkId?: string
  ): Promise<GeoData[]> {
    return this.http.get('/analytics/geo', {
      startDate,
      endDate,
      linkId,
    });
  }

  async getDeviceData(
    startDate: string,
    endDate: string,
    linkId?: string
  ): Promise<DeviceData[]> {
    return this.http.get('/analytics/devices', {
      startDate,
      endDate,
      linkId,
    });
  }

  async getReferrerData(
    startDate: string,
    endDate: string,
    linkId?: string
  ): Promise<ReferrerData[]> {
    return this.http.get('/analytics/referrers', {
      startDate,
      endDate,
      linkId,
    });
  }

  async getTopLinks(
    startDate: string,
    endDate: string,
    limit?: number
  ): Promise<Array<{
    linkId: string;
    shortCode: string;
    originalUrl: string;
    clicks: number;
    uniqueVisitors: number;
  }>> {
    return this.http.get('/analytics/top-links', {
      startDate,
      endDate,
      limit,
    });
  }

  async getUtmBreakdown(
    startDate: string,
    endDate: string,
    groupBy: 'source' | 'medium' | 'campaign' | 'term' | 'content'
  ): Promise<Array<{
    value: string;
    clicks: number;
    uniqueVisitors: number;
    conversions: number;
  }>> {
    return this.http.get('/analytics/utm', {
      startDate,
      endDate,
      groupBy,
    });
  }

  async export(
    query: AnalyticsQuery,
    format: 'csv' | 'xlsx' | 'json' = 'csv'
  ): Promise<Blob> {
    return this.http.get('/analytics/export', {
      ...query,
      format,
    });
  }

  async createReport(config: {
    name: string;
    query: AnalyticsQuery;
    format: 'csv' | 'xlsx' | 'pdf';
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string;
      recipients: string[];
    };
  }): Promise<{
    reportId: string;
    status: 'pending' | 'processing' | 'completed';
    downloadUrl?: string;
  }> {
    return this.http.post('/analytics/reports', config);
  }

  async getReport(reportId: string): Promise<{
    reportId: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    downloadUrl?: string;
    error?: string;
    createdAt: string;
    completedAt?: string;
  }> {
    return this.http.get(`/analytics/reports/${reportId}`);
  }

  async getScheduledReports(): Promise<Array<{
    id: string;
    name: string;
    schedule: {
      frequency: string;
      time: string;
      recipients: string[];
    };
    lastRun?: string;
    nextRun?: string;
    enabled: boolean;
  }>> {
    return this.http.get('/analytics/reports/scheduled');
  }

  async deleteScheduledReport(reportId: string): Promise<void> {
    await this.http.delete(`/analytics/reports/scheduled/${reportId}`);
  }

  async trackConversion(
    linkId: string,
    conversionData: {
      type: string;
      value?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.http.post('/analytics/conversions', {
      linkId,
      ...conversionData,
    });
  }
}
