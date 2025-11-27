import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, Method } from 'axios';

export interface ServiceRoute {
  name: string;
  prefix: string;
  url: string;
  requireAuth?: boolean;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly routes: ServiceRoute[];

  constructor(private readonly configService: ConfigService) {
    this.routes = [
      {
        name: 'link-service',
        prefix: '/api/links',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service',
        prefix: '/api/users',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60001'),
        requireAuth: true,
      },
      {
        name: 'user-service-teams',
        prefix: '/api/teams',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60001'),
        requireAuth: true,
      },
      {
        name: 'analytics-service',
        prefix: '/api/analytics',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'qr-service',
        prefix: '/api/qr',
        url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60004'),
        requireAuth: true,
      },
      {
        name: 'page-service',
        prefix: '/api/pages',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60005'),
        requireAuth: true,
      },
      {
        name: 'notification-service',
        prefix: '/api/notifications',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60006'),
        requireAuth: true,
      },
      {
        name: 'domain-service',
        prefix: '/api/domains',
        url: this.configService.get('DOMAIN_SERVICE_URL', 'http://localhost:60014'),
        requireAuth: true,
      },
      {
        name: 'campaign-service',
        prefix: '/api/campaigns',
        url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: true,
      },
    ];
  }

  getRoutes(): ServiceRoute[] {
    return this.routes;
  }

  findRoute(path: string): ServiceRoute | undefined {
    return this.routes.find((route) => path.startsWith(route.prefix));
  }

  async proxyRequest(
    method: Method,
    path: string,
    headers: Record<string, string>,
    body?: any,
    query?: Record<string, any>,
  ): Promise<any> {
    const route = this.findRoute(path);

    if (!route) {
      throw new HttpException('Route not found', 404);
    }

    // Transform path
    const targetPath = path.replace(route.prefix, '');
    const targetUrl = `${route.url}${targetPath}`;

    this.logger.debug(`Proxying ${method} ${path} -> ${targetUrl}`);

    const config: AxiosRequestConfig = {
      method,
      url: targetUrl,
      headers: {
        ...headers,
        host: undefined, // Remove host header
      },
      params: query,
      data: body,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on error status
    };

    try {
      const response = await axios(config);

      return {
        statusCode: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error: any) {
      this.logger.error(`Proxy error: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Service unavailable',
        error.response?.status || 503,
      );
    }
  }
}
