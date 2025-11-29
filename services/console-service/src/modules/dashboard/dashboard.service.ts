import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios, { AxiosInstance } from 'axios';

interface ServiceEndpoints {
  analyticsService: string;
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

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource('usersConnection')
    private readonly usersDataSource: DataSource,
    @InjectDataSource('linksConnection')
    private readonly linksDataSource: DataSource,
  ) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'x-internal-api-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    this.endpoints = {
      analyticsService: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
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
      // Ensure limit is a valid number
      const validLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;

      // Fetch recent users and links from databases
      const [userActivities, linkActivities] = await Promise.all([
        this.fetchUserActivities(Math.ceil(validLimit / 2)),
        this.fetchLinkActivities(Math.ceil(validLimit / 2)),
      ]);

      // Merge and sort by timestamp
      const allActivities: ActivityItem[] = [
        ...userActivities,
        ...linkActivities,
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return allActivities;
    } catch (error: any) {
      this.logger.error(`Failed to fetch recent activity: ${error.message}`);
      return [];
    }
  }

  private async fetchUserActivities(limit: number): Promise<ActivityItem[]> {
    try {
      const validLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;

      // Query recent users from database (using camelCase column names)
      const users = await this.usersDataSource.query(`
        SELECT id, name, email, "createdAt", "lastLoginAt"
        FROM users
        WHERE "deletedAt" IS NULL
        ORDER BY GREATEST(COALESCE("lastLoginAt", "createdAt"), "createdAt") DESC
        LIMIT $1
      `, [validLimit * 2]);

      // Convert users to activities
      const activities: ActivityItem[] = [];

      users.forEach((user: any) => {
        // Registration activity
        if (user.createdAt) {
          activities.push({
            id: `user-reg-${user.id}`,
            type: 'user',
            action: 'registered',
            description: `用户 ${user.name || user.email} 注册了账户`,
            userId: user.id,
            metadata: { email: user.email },
            timestamp: user.createdAt,
          });
        }

        // Login activity
        if (user.lastLoginAt && user.lastLoginAt !== user.createdAt) {
          activities.push({
            id: `user-login-${user.id}-${user.lastLoginAt}`,
            type: 'user',
            action: 'logged_in',
            description: `用户 ${user.name || user.email} 登录了系统`,
            userId: user.id,
            metadata: { email: user.email },
            timestamp: user.lastLoginAt,
          });
        }
      });

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error: any) {
      this.logger.warn(`Failed to fetch user activities: ${error.message}`);
      return [];
    }
  }

  private async fetchLinkActivities(limit: number): Promise<ActivityItem[]> {
    try {
      const validLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;

      // Query recent links from database (using camelCase column names)
      const links = await this.linksDataSource.query(`
        SELECT id, "shortCode", "originalUrl", "userId", "teamId", "createdAt"
        FROM links
        ORDER BY "createdAt" DESC
        LIMIT $1
      `, [validLimit]);

      // Convert links to activities
      return links.map((link: any) => ({
        id: `link-create-${link.id}`,
        type: 'link' as const,
        action: 'created',
        description: `创建了短链接 ${link.shortCode}`,
        userId: link.userId,
        teamId: link.teamId,
        metadata: {
          linkId: link.id,
          shortCode: link.shortCode,
          originalUrl: link.originalUrl?.substring(0, 50),
        },
        timestamp: link.createdAt,
      }));
    } catch (error: any) {
      this.logger.warn(`Failed to fetch link activities: ${error.message}`);
      return [];
    }
  }

  async getTopLinks(limit: number = 10): Promise<any[]> {
    try {
      // Query top links by click count from database (using camelCase column names)
      const links = await this.linksDataSource.query(`
        SELECT id, "shortCode", "originalUrl", title, "totalClicks", "createdAt"
        FROM links
        ORDER BY "totalClicks" DESC NULLS LAST
        LIMIT $1
      `, [limit]);

      return links.map((link: any) => ({
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        title: link.title || link.shortCode,
        clicks: link.totalClicks || 0,
        createdAt: link.createdAt,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to fetch top links: ${error.message}`);
      return [];
    }
  }

  async getSystemHealth(): Promise<{
    services: Array<{ name: string; status: 'healthy' | 'unhealthy'; latency: number }>;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const services = [
      { name: 'user-service', url: 'http://localhost:60002/api/v1/health' },
      { name: 'link-service', url: 'http://localhost:60003/api/v1/health' },
      { name: 'analytics-service', url: 'http://localhost:60050/health' },
      { name: 'campaign-service', url: 'http://localhost:60004/api/v1/health' },
      { name: 'qr-service', url: 'http://localhost:60005/api/v1/health' },
      { name: 'page-service', url: 'http://localhost:60007/api/v1/health' },
      { name: 'deeplink-service', url: 'http://localhost:60008/api/v1/health' },
      { name: 'notification-service', url: 'http://localhost:60020/api/v1/health' },
      { name: 'domain-service', url: 'http://localhost:60014/api/v1/health' },
      { name: 'redirect-service', url: 'http://localhost:60080/health' },
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
      // Query users database directly (using camelCase column names as per TypeORM convention)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const [
        totalUsersResult,
        totalTeamsResult,
        activeUsersResult,
        recentUsersResult,
        previousUsersResult,
      ] = await Promise.all([
        this.usersDataSource.query('SELECT COUNT(*) as count FROM users WHERE "deletedAt" IS NULL'),
        this.usersDataSource.query('SELECT COUNT(*) as count FROM teams'),
        this.usersDataSource.query(
          'SELECT COUNT(*) as count FROM users WHERE "lastLoginAt" > $1 AND "deletedAt" IS NULL',
          [sevenDaysAgo],
        ),
        this.usersDataSource.query(
          'SELECT COUNT(*) as count FROM users WHERE "createdAt" > $1 AND "deletedAt" IS NULL',
          [sevenDaysAgo],
        ),
        this.usersDataSource.query(
          'SELECT COUNT(*) as count FROM users WHERE "createdAt" > $1 AND "createdAt" <= $2 AND "deletedAt" IS NULL',
          [fourteenDaysAgo, sevenDaysAgo],
        ),
      ]);

      const totalUsers = parseInt(totalUsersResult[0]?.count || '0', 10);
      const totalTeams = parseInt(totalTeamsResult[0]?.count || '0', 10);
      const activeUsers = parseInt(activeUsersResult[0]?.count || '0', 10);
      const recentUsers = parseInt(recentUsersResult[0]?.count || '0', 10);
      const previousUsers = parseInt(previousUsersResult[0]?.count || '0', 10);

      const growthRate = previousUsers > 0
        ? Math.round(((recentUsers - previousUsers) / previousUsers) * 100)
        : (recentUsers > 0 ? 100 : 0);

      return { totalUsers, totalTeams, activeUsers, growthRate };
    } catch (error: any) {
      this.logger.error(`Failed to fetch user stats: ${error.message}`);
      return { totalUsers: 0, totalTeams: 0, activeUsers: 0, growthRate: 0 };
    }
  }

  private async fetchLinkStats() {
    try {
      // Query links database directly (links table doesn't have deletedAt)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const [totalLinksResult, recentLinksResult, previousLinksResult] = await Promise.all([
        this.linksDataSource.query('SELECT COUNT(*) as count FROM links'),
        this.linksDataSource.query(
          'SELECT COUNT(*) as count FROM links WHERE "createdAt" > $1',
          [sevenDaysAgo],
        ),
        this.linksDataSource.query(
          'SELECT COUNT(*) as count FROM links WHERE "createdAt" > $1 AND "createdAt" <= $2',
          [fourteenDaysAgo, sevenDaysAgo],
        ),
      ]);

      const totalLinks = parseInt(totalLinksResult[0]?.count || '0', 10);
      const recentLinks = parseInt(recentLinksResult[0]?.count || '0', 10);
      const previousLinks = parseInt(previousLinksResult[0]?.count || '0', 10);

      const growthRate = previousLinks > 0
        ? Math.round(((recentLinks - previousLinks) / previousLinks) * 100)
        : (recentLinks > 0 ? 100 : 0);

      return { totalLinks, growthRate };
    } catch (error: any) {
      this.logger.error(`Failed to fetch link stats: ${error.message}`);
      return { totalLinks: 0, growthRate: 0 };
    }
  }

  private async fetchAnalyticsStats() {
    try {
      // Try to get analytics summary from analytics-service
      const response = await this.httpClient.get(`${this.endpoints.analyticsService}/api/analytics/summary`);
      const data = response.data;

      return {
        totalClicks: data?.total_clicks || data?.totalClicks || 0,
        todayClicks: data?.today_clicks || data?.todayClicks || 0,
        growthRate: data?.growth_rate || data?.growthRate || 0,
      };
    } catch (error: any) {
      this.logger.warn(`Analytics service unavailable: ${error.message}`);
      // Return mock data when analytics service is down
      return { totalClicks: 0, todayClicks: 0, growthRate: 0 };
    }
  }
}
