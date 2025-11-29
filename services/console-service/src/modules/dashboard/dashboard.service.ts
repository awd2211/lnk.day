import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface ServiceEndpoints {
  userService: string;
  linkService: string;
  analyticsService: string;
  campaignService: string;
  notificationService: string;
}

export interface ActivityItem {
  id: string;
  type: 'user' | 'link' | 'campaign' | 'team' | 'system';
  action: string;
  description: string;
  userId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly httpClient: AxiosInstance;
  private readonly endpoints: ServiceEndpoints;
  private readonly CACHE_TTL = 60; // 60 seconds

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'x-internal-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    this.endpoints = {
      userService: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
      linkService: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
      analyticsService: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:8000'),
      campaignService: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004'),
      notificationService: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
    };
  }

  async getStats(): Promise<{
    totalUsers: number;
    totalTeams: number;
    totalLinks: number;
    totalClicks: number;
    todayClicks: number;
    activeUsers: number;
    growth: { users: number; links: number; clicks: number };
  }> {
    try {
      const [userStats, linkStats, analyticsStats] = await Promise.all([
        this.fetchUserStats(),
        this.fetchLinkStats(),
        this.fetchAnalyticsStats(),
      ]);

      return {
        totalUsers: userStats.totalUsers,
        totalTeams: userStats.totalTeams,
        totalLinks: linkStats.totalLinks,
        totalClicks: analyticsStats.totalClicks,
        todayClicks: analyticsStats.todayClicks,
        activeUsers: userStats.activeUsers,
        growth: {
          users: userStats.growthRate,
          links: linkStats.growthRate,
          clicks: analyticsStats.growthRate,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch dashboard stats', error);
      return {
        totalUsers: 0,
        totalTeams: 0,
        totalLinks: 0,
        totalClicks: 0,
        todayClicks: 0,
        activeUsers: 0,
        growth: { users: 0, links: 0, clicks: 0 },
      };
    }
  }

  async getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
    try {
      // Fetch activities from multiple services in parallel
      const [userActivities, linkActivities, campaignActivities] = await Promise.all([
        this.fetchUserActivities(Math.ceil(limit / 3)),
        this.fetchLinkActivities(Math.ceil(limit / 3)),
        this.fetchCampaignActivities(Math.ceil(limit / 3)),
      ]);

      // Merge and sort by timestamp
      const allActivities: ActivityItem[] = [
        ...userActivities,
        ...linkActivities,
        ...campaignActivities,
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return allActivities;
    } catch (error) {
      this.logger.error('Failed to fetch recent activity', error);
      return [];
    }
  }

  private async fetchUserActivities(limit: number): Promise<ActivityItem[]> {
    try {
      const response = await this.httpClient.get(`${this.endpoints.userService}/internal/activities`, {
        params: { limit },
      });
      return (response.data || []).map((item: any) => ({
        id: item.id,
        type: 'user' as const,
        action: item.action,
        description: item.description || `User ${item.action}`,
        userId: item.userId,
        teamId: item.teamId,
        metadata: item.metadata,
        timestamp: item.createdAt || item.timestamp,
      }));
    } catch {
      return [];
    }
  }

  private async fetchLinkActivities(limit: number): Promise<ActivityItem[]> {
    try {
      const response = await this.httpClient.get(`${this.endpoints.linkService}/internal/activities`, {
        params: { limit },
      });
      return (response.data || []).map((item: any) => ({
        id: item.id,
        type: 'link' as const,
        action: item.action,
        description: item.description || `Link ${item.action}`,
        userId: item.userId,
        teamId: item.teamId,
        metadata: { linkId: item.linkId, shortCode: item.shortCode, ...item.metadata },
        timestamp: item.createdAt || item.timestamp,
      }));
    } catch {
      return [];
    }
  }

  private async fetchCampaignActivities(limit: number): Promise<ActivityItem[]> {
    try {
      const response = await this.httpClient.get(`${this.endpoints.campaignService}/internal/activities`, {
        params: { limit },
      });
      return (response.data || []).map((item: any) => ({
        id: item.id,
        type: 'campaign' as const,
        action: item.action,
        description: item.description || `Campaign ${item.action}`,
        userId: item.userId,
        teamId: item.teamId,
        metadata: { campaignId: item.campaignId, ...item.metadata },
        timestamp: item.createdAt || item.timestamp,
      }));
    } catch {
      return [];
    }
  }

  async getTopLinks(limit: number = 10): Promise<any[]> {
    try {
      const response = await this.httpClient.get(`${this.endpoints.linkService}/links/internal/top`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch top links', error);
      return [];
    }
  }

  async getSystemHealth(): Promise<{
    services: Array<{ name: string; status: 'healthy' | 'unhealthy'; latency: number }>;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const services = [
      { name: 'user-service', url: `${this.endpoints.userService}/health` },
      { name: 'link-service', url: `${this.endpoints.linkService}/health` },
      { name: 'analytics-service', url: `${this.endpoints.analyticsService}/health` },
    ];

    const results = await Promise.all(
      services.map(async (service) => {
        const start = Date.now();
        try {
          await this.httpClient.get(service.url, { timeout: 3000 });
          return {
            name: service.name,
            status: 'healthy' as const,
            latency: Date.now() - start,
          };
        } catch {
          return {
            name: service.name,
            status: 'unhealthy' as const,
            latency: -1,
          };
        }
      }),
    );

    const healthyCount = results.filter((r) => r.status === 'healthy').length;
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyCount === 0) overall = 'unhealthy';
    else if (healthyCount < results.length) overall = 'degraded';

    return { services: results, overall };
  }

  async getUsageMetrics(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    timeSeries: Array<{ date: string; clicks: number; users: number }>;
    summary: { avgDailyClicks: number; avgDailyUsers: number; peakHour: string };
  }> {
    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Fetch time series data from analytics service
      const [timeSeriesResponse, summaryResponse] = await Promise.all([
        this.httpClient.get(`${this.endpoints.analyticsService}/api/analytics/timeseries`, {
          params: {
            start_date: startDate.toISOString(),
            end_date: now.toISOString(),
            granularity: period === 'day' ? 'hour' : 'day',
          },
        }),
        this.httpClient.get(`${this.endpoints.analyticsService}/api/analytics/summary`, {
          params: {
            start_date: startDate.toISOString(),
            end_date: now.toISOString(),
          },
        }),
      ]);

      const timeSeries = (timeSeriesResponse.data?.data || []).map((item: any) => ({
        date: item.date || item.timestamp,
        clicks: item.clicks || 0,
        users: item.unique_visitors || item.users || 0,
      }));

      // Calculate summary metrics
      const totalClicks = timeSeries.reduce((sum: number, item: any) => sum + item.clicks, 0);
      const totalUsers = timeSeries.reduce((sum: number, item: any) => sum + item.users, 0);
      const days = timeSeries.length || 1;

      // Find peak hour from hourly data if available
      let peakHour = '14:00';
      if (summaryResponse.data?.peakHour) {
        peakHour = summaryResponse.data.peakHour;
      } else if (period === 'day' && timeSeries.length > 0) {
        const maxClicks = Math.max(...timeSeries.map((t: any) => t.clicks));
        const peakItem = timeSeries.find((t: any) => t.clicks === maxClicks);
        if (peakItem) {
          const hour = new Date(peakItem.date).getHours();
          peakHour = `${hour.toString().padStart(2, '0')}:00`;
        }
      }

      return {
        timeSeries,
        summary: {
          avgDailyClicks: Math.round(totalClicks / days),
          avgDailyUsers: Math.round(totalUsers / days),
          peakHour,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch usage metrics', error);
      return {
        timeSeries: [],
        summary: { avgDailyClicks: 0, avgDailyUsers: 0, peakHour: '14:00' },
      };
    }
  }

  private async fetchUserStats() {
    try {
      const response = await this.httpClient.get(`${this.endpoints.userService}/internal/stats`);
      return response.data;
    } catch {
      return { totalUsers: 0, totalTeams: 0, activeUsers: 0, growthRate: 0 };
    }
  }

  private async fetchLinkStats() {
    try {
      const response = await this.httpClient.get(`${this.endpoints.linkService}/internal/stats`);
      return response.data;
    } catch {
      return { totalLinks: 0, growthRate: 0 };
    }
  }

  private async fetchAnalyticsStats() {
    try {
      const response = await this.httpClient.get(`${this.endpoints.analyticsService}/api/analytics/summary`);
      return response.data;
    } catch {
      return { totalClicks: 0, todayClicks: 0, growthRate: 0 };
    }
  }
}
