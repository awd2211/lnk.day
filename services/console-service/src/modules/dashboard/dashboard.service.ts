import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface ServiceEndpoints {
  userService: string;
  linkService: string;
  analyticsService: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly httpClient: AxiosInstance;
  private readonly endpoints: ServiceEndpoints;

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'x-internal-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    this.endpoints = {
      userService: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
      linkService: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
      analyticsService: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60020'),
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

  async getRecentActivity(limit: number = 20): Promise<any[]> {
    // In a real implementation, this would aggregate activity from multiple services
    return [];
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
    // Placeholder - would fetch from analytics service
    return {
      timeSeries: [],
      summary: { avgDailyClicks: 0, avgDailyUsers: 0, peakHour: '14:00' },
    };
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
