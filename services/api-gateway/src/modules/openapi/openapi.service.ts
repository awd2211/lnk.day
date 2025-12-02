import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// API Key 验证结果
export interface ApiKeyValidationResult {
  valid: boolean;
  tenantId?: string;
  userId?: string;
  scopes?: string[];
  permissions?: string[];
  rateLimit?: number;
  ipWhitelist?: string[];
  error?: string;
}

// API 使用情况
export interface ApiUsage {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  ip: string;
  userAgent?: string;
}

// 速率限制状态
export interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: number;
  retryAfter?: number;
}

// SDK 配置
export interface SdkConfig {
  version: string;
  baseUrl: string;
  endpoints: Record<string, string>;
  rateLimits: {
    requests: number;
    window: string;
  };
  authentication: {
    type: string;
    header: string;
    prefix: string;
  };
}

@Injectable()
export class OpenApiService {
  private readonly logger = new Logger(OpenApiService.name);
  private readonly usageCache: Map<string, number> = new Map();
  private readonly USER_SERVICE_URL: string;
  private readonly brandName: string;
  private readonly brandDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.USER_SERVICE_URL = this.configService.get('USER_SERVICE_URL', 'http://localhost:60002');
    this.brandName = this.configService.get('BRAND_NAME', 'lnk.day');
    this.brandDomain = this.configService.get('BRAND_DOMAIN', 'lnk.day');
  }

  // ==================== API Key 验证 ====================

  async validateApiKey(apiKey: string, clientIp?: string): Promise<ApiKeyValidationResult> {
    if (!apiKey) {
      return { valid: false, error: 'API key is required' };
    }

    // 检查 API Key 格式
    if (!this.isValidApiKeyFormat(apiKey)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    try {
      // 调用 user-service 验证 API key
      const response = await fetch(`${this.USER_SERVICE_URL}/api/v1/tenants/api-keys/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid API key' };
      }

      const result = await response.json();

      // 检查 IP 白名单
      if (result.ipWhitelist?.length > 0 && clientIp) {
        if (!this.isIpAllowed(clientIp, result.ipWhitelist)) {
          return { valid: false, error: 'IP address not allowed' };
        }
      }

      return {
        valid: true,
        tenantId: result.tenantId,
        userId: result.userId,
        scopes: result.scopes || [],
        permissions: result.permissions || [],
        rateLimit: result.rateLimit || 1000,
        ipWhitelist: result.ipWhitelist,
      };
    } catch (error) {
      this.logger.error(`API key validation failed: ${error.message}`);
      return { valid: false, error: 'API key validation service unavailable' };
    }
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    // API Key 格式: lnk_xxxx... (至少32字符)
    return /^lnk_[a-zA-Z0-9]{32,}$/.test(apiKey);
  }

  private isIpAllowed(clientIp: string, whitelist: string[]): boolean {
    return whitelist.some(pattern => {
      if (pattern.includes('/')) {
        // CIDR 格式
        return this.isIpInCidr(clientIp, pattern);
      }
      if (pattern.includes('*')) {
        // 通配符格式
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(clientIp);
      }
      return clientIp === pattern;
    });
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1);
    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  // ==================== 速率限制 ====================

  async checkRateLimit(apiKeyId: string, rateLimit: number): Promise<RateLimitStatus> {
    const windowMs = 3600000; // 1 hour
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const cacheKey = `${apiKeyId}:${windowStart}`;

    const currentCount = this.usageCache.get(cacheKey) || 0;
    const remaining = Math.max(0, rateLimit - currentCount);
    const reset = windowStart + windowMs;

    if (currentCount >= rateLimit) {
      return {
        remaining: 0,
        limit: rateLimit,
        reset: Math.ceil(reset / 1000),
        retryAfter: Math.ceil((reset - now) / 1000),
      };
    }

    // 增加计数
    this.usageCache.set(cacheKey, currentCount + 1);

    // 清理过期的缓存
    this.cleanupExpiredCache(windowStart);

    return {
      remaining: remaining - 1,
      limit: rateLimit,
      reset: Math.ceil(reset / 1000),
    };
  }

  private cleanupExpiredCache(currentWindow: number): void {
    for (const key of this.usageCache.keys()) {
      const [, windowStr] = key.split(':');
      if (parseInt(windowStr) < currentWindow) {
        this.usageCache.delete(key);
      }
    }
  }

  // ==================== 使用量记录 ====================

  async recordUsage(usage: ApiUsage): Promise<void> {
    // 异步记录到分析服务
    try {
      // 这里可以发送到 analytics-service 或 ClickHouse
      this.logger.debug(`API usage: ${usage.method} ${usage.endpoint} - ${usage.statusCode} (${usage.responseTime}ms)`);
    } catch (error) {
      this.logger.error(`Failed to record API usage: ${error.message}`);
    }
  }

  async getUsageStats(
    apiKeyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    endpointBreakdown: Record<string, number>;
    errorBreakdown: Record<string, number>;
  }> {
    // 模拟数据，实际应从 ClickHouse 查询
    return {
      totalRequests: 10000,
      successRate: 0.98,
      avgResponseTime: 120,
      endpointBreakdown: {
        '/api/v1/links': 5000,
        '/api/v1/analytics': 3000,
        '/api/v1/qr': 2000,
      },
      errorBreakdown: {
        '400': 50,
        '401': 20,
        '404': 100,
        '429': 30,
        '500': 10,
      },
    };
  }

  // ==================== SDK 配置 ====================

  getSdkConfig(): SdkConfig {
    return {
      version: '1.0.0',
      baseUrl: this.configService.get('API_BASE_URL', 'https://api.lnk.day'),
      endpoints: {
        links: '/api/v1/links',
        analytics: '/api/v1/analytics',
        qr: '/api/v1/qr',
        campaigns: '/api/v1/campaigns',
        domains: '/api/v1/domains',
        webhooks: '/api/v1/webhooks',
      },
      rateLimits: {
        requests: 1000,
        window: '1h',
      },
      authentication: {
        type: 'bearer',
        header: 'Authorization',
        prefix: 'Bearer',
      },
    };
  }

  // ==================== API 文档 ====================

  getApiDocumentation(): {
    openapi: string;
    info: any;
    servers: any[];
    paths: any;
    components: any;
  } {
    return {
      openapi: '3.0.0',
      info: {
        title: `${this.brandName} Open API`,
        version: '1.0.0',
        description: 'Enterprise link management API',
        contact: {
          name: 'API Support',
          email: `api@${this.brandDomain}`,
        },
      },
      servers: [
        {
          url: this.configService.get('API_BASE_URL', `https://api.${this.brandDomain}`),
          description: 'Production server',
        },
        {
          url: this.configService.get('API_SANDBOX_URL', `https://sandbox.api.${this.brandDomain}`),
          description: 'Sandbox server',
        },
      ],
      paths: this.getApiPaths(),
      components: this.getApiComponents(),
    };
  }

  private getApiPaths(): Record<string, any> {
    return {
      '/api/v1/links': {
        get: {
          summary: '获取链接列表',
          tags: ['Links'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Link list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LinkList' },
                },
              },
            },
          },
        },
        post: {
          summary: '创建短链接',
          tags: ['Links'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateLink' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Link created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Link' },
                },
              },
            },
          },
        },
      },
      '/api/v1/links/{id}': {
        get: {
          summary: '获取链接详情',
          tags: ['Links'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Link details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Link' },
                },
              },
            },
          },
        },
        put: {
          summary: '更新链接',
          tags: ['Links'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateLink' },
              },
            },
          },
          responses: {
            '200': { description: 'Link updated' },
          },
        },
        delete: {
          summary: '删除链接',
          tags: ['Links'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '204': { description: 'Link deleted' },
          },
        },
      },
      '/api/v1/links/{id}/analytics': {
        get: {
          summary: '获取链接分析数据',
          tags: ['Analytics'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'granularity', in: 'query', schema: { type: 'string', enum: ['hour', 'day', 'week', 'month'] } },
          ],
          responses: {
            '200': {
              description: 'Analytics data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Analytics' },
                },
              },
            },
          },
        },
      },
      '/api/v1/qr': {
        post: {
          summary: '生成 QR 码',
          tags: ['QR Codes'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateQR' },
              },
            },
          },
          responses: {
            '201': {
              description: 'QR code generated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/QRCode' },
                },
              },
            },
          },
        },
      },
      '/api/v1/bulk/links': {
        post: {
          summary: '批量创建链接',
          tags: ['Bulk Operations'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    links: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CreateLink' },
                      maxItems: 100,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Links created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      created: { type: 'integer' },
                      failed: { type: 'integer' },
                      links: { type: 'array' },
                      errors: { type: 'array' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private getApiComponents(): Record<string, any> {
    return {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
        },
      },
      schemas: {
        Link: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            shortCode: { type: 'string' },
            shortUrl: { type: 'string', format: 'uri' },
            originalUrl: { type: 'string', format: 'uri' },
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            clicks: { type: 'integer' },
            isActive: { type: 'boolean' },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateLink: {
          type: 'object',
          required: ['originalUrl'],
          properties: {
            originalUrl: { type: 'string', format: 'uri' },
            customCode: { type: 'string', maxLength: 50 },
            title: { type: 'string', maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
            domainId: { type: 'string', format: 'uuid' },
            folderId: { type: 'string', format: 'uuid' },
            expiresAt: { type: 'string', format: 'date-time' },
            password: { type: 'string' },
            utmSource: { type: 'string' },
            utmMedium: { type: 'string' },
            utmCampaign: { type: 'string' },
          },
        },
        UpdateLink: {
          type: 'object',
          properties: {
            originalUrl: { type: 'string', format: 'uri' },
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        LinkList: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Link' } },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        Analytics: {
          type: 'object',
          properties: {
            totalClicks: { type: 'integer' },
            uniqueClicks: { type: 'integer' },
            clicksByDate: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  clicks: { type: 'integer' },
                  uniqueClicks: { type: 'integer' },
                },
              },
            },
            topCountries: { type: 'array' },
            topDevices: { type: 'array' },
            topReferrers: { type: 'array' },
          },
        },
        CreateQR: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
            linkId: { type: 'string', format: 'uuid' },
            size: { type: 'integer', default: 300 },
            format: { type: 'string', enum: ['png', 'svg', 'pdf'], default: 'png' },
            style: {
              type: 'object',
              properties: {
                fgColor: { type: 'string', default: '#000000' },
                bgColor: { type: 'string', default: '#FFFFFF' },
                logo: { type: 'string', format: 'uri' },
                cornerRadius: { type: 'integer' },
              },
            },
          },
        },
        QRCode: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri' },
            downloadUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            message: { type: 'string' },
            error: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            path: { type: 'string' },
          },
        },
      },
    };
  }

  // ==================== Webhook 签名验证 ====================

  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`),
    );
  }

  generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }
}
