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
        name: 'user-service-subscriptions',
        prefix: '/api/subscriptions',
        url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
        requireAuth: true,
      },
      {
        name: 'user-service-sso',
        prefix: '/api/sso',
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
      // User Security Module (sessions, events) - 注意: 不同于 link-service 的 link-security
      {
        name: 'user-service-security',
        prefix: '/api/security',
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
        name: 'link-service-utm-templates',
        prefix: '/api/utm-templates',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-tags',
        prefix: '/api/tags',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      // link-service 链接安全扫描功能 - 使用独立前缀避免与 user-service /api/security 冲突
      {
        name: 'link-service-security',
        prefix: '/api/link-security',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        targetPrefix: '/api/v1/security', // 映射到 link-service 的 /api/v1/security
        requireAuth: true,
      },
      {
        name: 'link-service-saved-searches',
        prefix: '/api/saved-searches',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-search',
        prefix: '/api/search',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-previews',
        prefix: '/api/previews',
        url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
        requireAuth: true,
      },
      {
        name: 'link-service-moderation',
        prefix: '/api/moderation',
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
      {
        name: 'campaign-service-templates',
        prefix: '/api/campaign-templates',
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
      {
        name: 'qr-service-records',
        prefix: '/api/qr-records',
        url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'),
        requireAuth: true,
      },
      {
        name: 'qr-service-gs1',
        prefix: '/api/gs1',
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
      // Public bio-link endpoints (username lookup, check availability)
      {
        name: 'page-service-bio-links-public-username',
        prefix: '/api/bio-links/username',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: false,
      },
      {
        name: 'page-service-bio-links-public-check',
        prefix: '/api/bio-links/check-username',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: false,
      },
      {
        name: 'page-service-bio-links',
        prefix: '/api/bio-links',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: true,
      },
      {
        name: 'page-service-templates',
        prefix: '/api/templates',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: true,
      },
      {
        name: 'page-service-seo',
        prefix: '/api/seo',
        url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'),
        requireAuth: true,
      },
      {
        name: 'page-service-comments',
        prefix: '/api/comments',
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
      {
        name: 'notification-service-email',
        prefix: '/api/email',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
        requireAuth: true,
      },
      {
        name: 'notification-service-sms',
        prefix: '/api/sms',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
        requireAuth: true,
      },
      {
        name: 'notification-service-slack',
        prefix: '/api/slack',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
        requireAuth: true,
      },
      {
        name: 'notification-service-teams',
        prefix: '/api/teams-notifications',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
        requireAuth: true,
      },
      {
        name: 'notification-service-websocket',
        prefix: '/api/websocket',
        url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'),
        requireAuth: true,
      },
      {
        name: 'notification-service-config',
        prefix: '/api/config',
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
      // Integration Service (60016) - OAuth endpoints (public, must be before auth-required routes)
      {
        name: 'integration-service-hubspot-oauth',
        prefix: '/api/hubspot/oauth',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: false,
      },
      {
        name: 'integration-service-hubspot-webhook',
        prefix: '/api/hubspot/webhook',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: false,
      },
      {
        name: 'integration-service-salesforce-oauth',
        prefix: '/api/salesforce/oauth',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: false,
      },
      {
        name: 'integration-service-shopify-oauth',
        prefix: '/api/shopify/oauth',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: false,
      },
      {
        name: 'integration-service-shopify-webhooks',
        prefix: '/api/shopify/webhooks',
        url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'),
        requireAuth: false,
      },
      // Integration Service (60016) - Auth-required routes
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
      // Analytics Service (60050) - Python FastAPI
      {
        name: 'analytics-service',
        prefix: '/api/analytics',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      {
        name: 'analytics-service-reports',
        prefix: '/api/reports',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      {
        name: 'analytics-service-export',
        prefix: '/api/export',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      {
        name: 'analytics-service-schedules',
        prefix: '/api/schedules',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      {
        name: 'analytics-service-tasks',
        prefix: '/api/tasks',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      {
        name: 'analytics-service-funnels',
        prefix: '/api/funnels',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      {
        name: 'analytics-service-cohorts',
        prefix: '/api/cohorts',
        url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
        requireAuth: true,
      },
      // Datastream Service (60001) - Python FastAPI
      {
        name: 'datastream-service-stream',
        prefix: '/api/stream',
        url: this.configService.get('DATASTREAM_SERVICE_URL', 'http://localhost:60001'),
        requireAuth: true,
      },
      {
        name: 'datastream-service-streams',
        prefix: '/api/data-streams',
        url: this.configService.get('DATASTREAM_SERVICE_URL', 'http://localhost:60001'),
        targetPrefix: '/api/v1', // 映射 /api/data-streams -> /api/v1/data-streams
        requireAuth: true,
      },
    ];
  }

  getRoutes(): ServiceRoute[] {
    return this.routes;
  }

  findRoute(path: string): ServiceRoute | undefined {
    // Find all matching routes and return the one with the longest prefix
    // This ensures more specific routes like /api/teams-notifications
    // take precedence over /api/teams
    const matchingRoutes = this.routes.filter((route) => path.startsWith(route.prefix));
    if (matchingRoutes.length === 0) {
      return undefined;
    }
    return matchingRoutes.reduce((longest, current) =>
      current.prefix.length > longest.prefix.length ? current : longest
    );
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

    let targetUrl: string;
    if (route.targetPrefix) {
      // 如果指定了 targetPrefix，直接使用它替换整个前缀
      // 例如: /api/link-security/stats -> /api/v1/security/stats
      targetUrl = `${route.url}${route.targetPrefix}${resourcePath}`;
    } else {
      // 默认行为：保留路由后缀
      // 例如: /api/links/123 -> /api/v1/links/123
      const routeSuffix = route.prefix.replace('/api', ''); // /api/links -> /links
      targetUrl = `${route.url}/api/v1${routeSuffix}${resourcePath}`;
    }

    this.logger.debug(`Proxying ${method} ${path} -> ${targetUrl}`);

    // Check if this route might return binary data (QR codes, PDFs, images, etc.)
    const binaryPaths = ['/api/qr/generate', '/api/qr/batch'];
    const expectBinary = binaryPaths.some(bp => path.startsWith(bp));

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
      responseType: expectBinary ? 'arraybuffer' : 'json',
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
