import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';

type ServiceName = 'user' | 'link' | 'analytics' | 'qr' | 'page' | 'deeplink' | 'notification' | 'campaign';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly httpClient: AxiosInstance;
  private readonly serviceUrls: Record<ServiceName, string>;

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'x-internal-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    this.serviceUrls = {
      user: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
      link: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
      analytics: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60020'),
      qr: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'),
      page: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60006'),
      deeplink: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60007'),
      notification: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60010'),
      campaign: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60008'),
    };
  }

  async forward(
    service: ServiceName,
    path: string,
    options: {
      method?: Method;
      data?: any;
      params?: any;
      headers?: Record<string, string>;
    } = {},
  ): Promise<any> {
    const { method = 'GET', data, params, headers = {} } = options;
    const baseUrl = this.serviceUrls[service];

    if (!baseUrl) {
      throw new HttpException(`Unknown service: ${service}`, HttpStatus.BAD_REQUEST);
    }

    const url = `${baseUrl}${path}`;
    const config: AxiosRequestConfig = {
      method,
      url,
      params,
      headers: { ...headers },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = data;
    }

    try {
      const response = await this.httpClient.request(config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Proxy error to ${service}: ${error.message}`, error.stack);

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      throw new HttpException(
        { message: `Service ${service} unavailable`, error: error.message },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // User Service Proxies
  async getUsers(params?: { page?: number; limit?: number; search?: string }): Promise<any> {
    return this.forward('user', '/users', { params });
  }

  async getUser(id: string): Promise<any> {
    return this.forward('user', `/users/${id}`);
  }

  async updateUser(id: string, data: any): Promise<any> {
    return this.forward('user', `/users/${id}`, { method: 'PUT', data });
  }

  async deleteUser(id: string): Promise<any> {
    return this.forward('user', `/users/${id}`, { method: 'DELETE' });
  }

  async getTeams(params?: { page?: number; limit?: number }): Promise<any> {
    return this.forward('user', '/teams', { params });
  }

  async getTeam(id: string): Promise<any> {
    return this.forward('user', `/teams/${id}`);
  }

  // Link Service Proxies
  async getLinks(teamId: string, params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    return this.forward('link', '/links', { params: { ...params, teamId } });
  }

  async getLink(id: string): Promise<any> {
    return this.forward('link', `/links/${id}`);
  }

  async deleteLink(id: string): Promise<any> {
    return this.forward('link', `/links/${id}`, { method: 'DELETE' });
  }

  async getLinkStats(): Promise<any> {
    return this.forward('link', '/internal/stats');
  }

  // Analytics Service Proxies
  async getAnalyticsSummary(): Promise<any> {
    return this.forward('analytics', '/api/analytics/summary');
  }

  async getLinkAnalytics(linkId: string, params?: { startDate?: string; endDate?: string }): Promise<any> {
    return this.forward('analytics', `/api/analytics/links/${linkId}`, { params });
  }

  async getTeamAnalytics(teamId: string, params?: { startDate?: string; endDate?: string }): Promise<any> {
    return this.forward('analytics', `/api/analytics/teams/${teamId}`, { params });
  }

  // Campaign Service Proxies
  async getCampaigns(teamId: string, params?: { status?: string }): Promise<any> {
    return this.forward('campaign', '/campaigns', {
      params,
      headers: { 'x-team-id': teamId },
    });
  }

  async getCampaign(id: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}`);
  }

  async deleteCampaign(id: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}`, { method: 'DELETE' });
  }

  // Page Service Proxies
  async getPages(teamId: string, params?: { status?: string }): Promise<any> {
    return this.forward('page', '/pages', {
      params,
      headers: { 'x-team-id': teamId },
    });
  }

  async getPage(id: string): Promise<any> {
    return this.forward('page', `/pages/${id}`);
  }

  async deletePage(id: string): Promise<any> {
    return this.forward('page', `/pages/${id}`, { method: 'DELETE' });
  }

  // Notification Service Proxies
  async sendBroadcast(data: { subject: string; body: string; recipients: string[] }): Promise<any> {
    return this.forward('notification', '/notifications/broadcast', { method: 'POST', data });
  }
}
