import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, Method } from 'axios';
import { CircuitBreakerService, HttpRetryService } from '@lnk/nestjs-common';

export interface ServiceRoute {
  name: string;
  prefix: string;
  url: string;
  targetPrefix?: string; // 目标服务的路径前缀，如 /api/v1
  requireAuth?: boolean;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly routes: ServiceRoute[];

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly httpRetry: HttpRetryService,
  ) {
    this.routes = [
      // User Service (60002)
      {
        name: 'user-service-auth',
        prefix: '/api/auth',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: false,
      },
      {
        name: 'user-service-users',
        prefix: '/api/users',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-teams',
        prefix: '/api/teams',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-api-keys',
        prefix: '/api/api-keys',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-billing',
        prefix: '/api/billing',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-stripe',
        prefix: '/api/stripe',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-privacy',
        prefix: '/api/privacy',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-quota',
        prefix: '/api/quota',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      // Link Service (60003)
      {
        name: 'link-service-links',
        prefix: '/api/links',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-folders',
        prefix: '/api/folders',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-ab-tests',
        prefix: '/api/ab-tests',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-templates',
        prefix: '/api/link-templates',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-redirect-rules',
        prefix: '/api/redirect-rules',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-security',
        prefix: '/api/security',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-saved-searches',
        prefix: '/api/saved-searches',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      // Campaign Service (60004)
      {
        name: 'campaign-service-campaigns',
        prefix: '/api/campaigns',
        url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004'),
        requireAuth: true,
      },
      {
        name: 'campaign-service-goals',
        prefix: '/api/goals',
        url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004'),
        requireAuth: true,
      },
      // QR Service (60005)
      {
        name: 'qr-service',
        prefix: '/api/qr',
        url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'),
        requireAuth: true,
      },
      // Page Service (60007)
      {
        name: 'page-service-pages',
        prefix: '/api/pages',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: true,
      },
      {
        name: 'page-service-bio-links',
        prefix: '/api/bio-links',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: true,
      },
      // Deeplink Service (60008)
      {
        name: 'deeplink-service',
        prefix: '/api/deeplinks',
        url: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60008'),
        requireAuth: true,
      },
      // Console Service (60009)
      {
        name: 'console-service-admin',
        prefix: '/api/admin',
        url: this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009'),
        requireAuth: true,
      },
      {
        name: 'console-service-dashboard',
        prefix: '/api/dashboard',
        url: this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009'),
        requireAuth: true,
      },
      {
        name: 'console-service-system',
        prefix: '/api/system',
        url: this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009'),
        requireAuth: true,
      },
      {
        name: 'console-service-proxy',
        prefix: '/api/proxy',
        url: this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009'),
        requireAuth: true,
      },
      {
        name: 'console-service-audit',
        prefix: '/api/audit',
        url: this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009'),
        requireAuth: true,
      },
      {
        name: 'console-service-alerts',
        prefix: '/api/alerts',
        url: this.configService.get('CONSOLE_SERVICE_URL', 'http://localhost:60009'),
        requireAuth: true,
      },
      // Domain Service (60014)
      {
        name: 'domain-service',
        prefix: '/api/domains',
        url: this.configService.get('DOMAIN_SERVICE_URL', 'http://localhost:60014'),
        requireAuth: true,
      },
      // Notification Service (60020)
      {
        name: 'notification-service',
        prefix: '/api/notifications',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
        requireAuth: true,
      },
      // Webhook Service (60017)
      {
        name: 'webhook-service',
        prefix: '/api/webhooks',
        url: this.configService.get('WEBHOOK_SERVICE_URL', 'http://localhost:60017'),
        requireAuth: true,
      },
      {
        name: 'webhook-service-automation',
        prefix: '/api/automation',
        url: this.configService.get('WEBHOOK_SERVICE_URL', 'http://localhost:60017'),
        targetPrefix: '/api/v1/webhooks', // 映射到 webhooks controller
        requireAuth: true,
      },
      // Integration Service (60016)
      {
        name: 'integration-service-zapier',
        prefix: '/api/zapier',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: true,
      },
      {
        name: 'integration-service-hubspot',
        prefix: '/api/hubspot',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: true,
      },
      {
        name: 'integration-service-salesforce',
        prefix: '/api/salesforce',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: true,
      },
      {
        name: 'integration-service-shopify',
        prefix: '/api/shopify',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: true,
      },
      {
        name: 'integration-service-integrations',
        prefix: '/api/integrations',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: true,
      },
      // Analytics Service (60050) - Python FastAPI, 使用 /api 前缀（无版本号）
      {
        name: 'analytics-service',
        prefix: '/api/analytics',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        targetPrefix: '/api', // FastAPI 不使用版本前缀
        requireAuth: true,
      },
      {
        name: 'analytics-service-reports',
        prefix: '/api/reports',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        targetPrefix: '/api',
        requireAuth: true,
      },
      {
        name: 'analytics-service-export',
        prefix: '/api/export',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        targetPrefix: '/api',
        requireAuth: true,
      },
      {
        name: 'analytics-service-schedules',
        prefix: '/api/schedules',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        targetPrefix: '/api',
        requireAuth: true,
      },
      {
        name: 'analytics-service-funnels',
        prefix: '/api/funnels',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        targetPrefix: '/api',
        requireAuth: true,
      },
      {
        name: 'analytics-service-cohorts',
        prefix: '/api/cohorts',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        targetPrefix: '/api',
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

    // Transform path - 保留资源路径部分，加上目标服务的前缀
    const resourcePath = path.replace(route.prefix, '');
    const targetPrefix = route.targetPrefix || '/api/v1';
    const routeSuffix = route.prefix.replace('/api', ''); // /api/links -> /links
    const targetUrl = `${route.url}${targetPrefix}${routeSuffix}${resourcePath}`;

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
      // 使用熔断器和重试保护
      const response = await this.circuitBreaker.execute(
        `proxy-${route.name}`,
        () => this.httpRetry.executeWithRetry(
          () => axios(config),
          {
            maxRetries: 2,
            initialDelay: 500,
            retryableErrors: [408, 429, 502, 503, 504],
            onRetry: (attempt, error) => {
              this.logger.warn(`Proxy retry ${route.name} attempt ${attempt}: ${error.message}`);
            },
          },
        ),
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 30000, // 熔断器打开持续时间
        },
      );

      return {
        statusCode: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error: any) {
      this.logger.error(`Proxy error for ${route.name}: ${error.message}`);

      // 检查是否是熔断器打开
      if (error.message?.includes('Circuit breaker is open')) {
        throw new HttpException('Service temporarily unavailable (circuit open)', 503);
      }

      throw new HttpException(
        error.response?.data?.message || 'Service unavailable',
        error.response?.status || 503,
      );
    }
  }
}
