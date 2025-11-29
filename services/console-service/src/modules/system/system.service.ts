import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as os from 'os';
import Redis from 'ioredis';

export interface ServiceInfo {
  name: string;
  url: string;
  port: number;
}

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly httpClient: AxiosInstance;
  private readonly services: ServiceInfo[];
  private redis: Redis | null = null;
  private featureFlags: Map<string, boolean> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'x-internal-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    // Initialize Redis connection
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:60031');
    try {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) => {
        this.logger.error('Redis connection error', err);
      });
    } catch (error) {
      this.logger.warn('Could not connect to Redis');
    }

    // Initialize default feature flags
    this.featureFlags.set('analytics', true);
    this.featureFlags.set('campaigns', true);
    this.featureFlags.set('deeplinks', true);
    this.featureFlags.set('pages', true);
    this.featureFlags.set('qrCodes', true);
    this.featureFlags.set('webhooks', true);
    this.featureFlags.set('apiRateLimiting', true);
    this.featureFlags.set('maintenanceMode', false);

    this.services = [
      // 网关服务
      { name: 'api-gateway', url: this.configService.get('API_GATEWAY_URL', 'http://localhost:60000'), port: 60000 },
      // 数据服务
      { name: 'datastream-service', url: this.configService.get('DATASTREAM_SERVICE_URL', 'http://localhost:60001'), port: 60001 },
      // 核心业务服务
      { name: 'user-service', url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'), port: 60002 },
      { name: 'link-service', url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'), port: 60003 },
      { name: 'campaign-service', url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004'), port: 60004 },
      { name: 'qr-service', url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'), port: 60005 },
      { name: 'page-service', url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007'), port: 60007 },
      { name: 'deeplink-service', url: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60008'), port: 60008 },
      { name: 'domain-service', url: this.configService.get('DOMAIN_SERVICE_URL', 'http://localhost:60014'), port: 60014 },
      // 集成服务
      { name: 'integration-service', url: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016'), port: 60016 },
      { name: 'webhook-service', url: this.configService.get('WEBHOOK_SERVICE_URL', 'http://localhost:60017'), port: 60017 },
      // 通知服务
      { name: 'notification-service', url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020'), port: 60020 },
      // 分析与重定向服务
      { name: 'analytics-service', url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'), port: 60050 },
      { name: 'redirect-service', url: this.configService.get('REDIRECT_SERVICE_URL', 'http://localhost:60080'), port: 60080 },
    ];
  }

  async getSystemInfo(): Promise<{
    platform: string;
    hostname: string;
    uptime: number;
    memory: { total: number; free: number; used: number };
    cpu: { cores: number; model: string; load: number[] };
    nodeVersion: string;
  }> {
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        load: os.loadavg(),
      },
      nodeVersion: process.version,
    };
  }

  async getServicesStatus(): Promise<
    Array<{
      name: string;
      url: string;
      status: 'online' | 'offline' | 'degraded';
      latency: number;
      version?: string;
      details?: any;
    }>
  > {
    const results = await Promise.all(
      this.services.map(async (service) => {
        const start = Date.now();
        try {
          // 根据不同服务确定健康检查路径
          let healthPath = '/api/v1/health'; // 默认 NestJS 服务
          if (['analytics-service', 'redirect-service', 'datastream-service'].includes(service.name)) {
            healthPath = '/health'; // Python/Go 服务
          } else if (service.name === 'api-gateway') {
            healthPath = '/v1/health'; // api-gateway 使用不同的版本前缀
          }
          const response = await this.httpClient.get(`${service.url}${healthPath}`, {
            timeout: 3000,
          });
          return {
            name: service.name,
            url: service.url,
            status: 'online' as const,
            latency: Date.now() - start,
            version: response.data?.version,
            details: response.data,
          };
        } catch (error: any) {
          return {
            name: service.name,
            url: service.url,
            status: 'offline' as const,
            latency: -1,
            details: { error: error.message },
          };
        }
      }),
    );

    return results;
  }

  async getServiceLogs(serviceName: string, options?: { lines?: number; level?: string }): Promise<{
    service: string;
    logs: string[];
    message: string;
  }> {
    // In a real implementation, this would fetch logs from a centralized logging system
    // like ELK Stack, Loki, or CloudWatch
    return {
      service: serviceName,
      logs: [],
      message: 'Log aggregation not configured. Connect to ELK/Loki for centralized logging.',
    };
  }

  async getConfig(): Promise<{
    environment: string;
    services: ServiceInfo[];
    features: Record<string, boolean>;
  }> {
    return {
      environment: this.configService.get('NODE_ENV', 'development'),
      services: this.services,
      features: {
        analytics: true,
        campaigns: true,
        deeplinks: true,
        pages: true,
        qrCodes: true,
        webhooks: true,
      },
    };
  }

  async restartService(serviceName: string): Promise<{ success: boolean; message: string }> {
    // This would integrate with a container orchestrator like Docker Swarm or Kubernetes
    this.logger.warn(`Service restart requested for: ${serviceName}`);
    return {
      success: false,
      message: 'Service restart requires container orchestration. Use Docker/K8s commands.',
    };
  }

  async getQueueStats(): Promise<{
    queues: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }>;
  }> {
    // Would fetch from Bull/BullMQ dashboard or Redis directly
    return {
      queues: [
        { name: 'email', waiting: 0, active: 0, completed: 0, failed: 0 },
        { name: 'webhook', waiting: 0, active: 0, completed: 0, failed: 0 },
        { name: 'analytics', waiting: 0, active: 0, completed: 0, failed: 0 },
      ],
    };
  }

  async getCacheStats(): Promise<{
    redis: {
      connected: boolean;
      memory: { used: string; peak: string };
      keys: number;
      hits: number;
      misses: number;
    };
  }> {
    if (!this.redis) {
      return {
        redis: {
          connected: false,
          memory: { used: '0MB', peak: '0MB' },
          keys: 0,
          hits: 0,
          misses: 0,
        },
      };
    }

    try {
      const info = await this.redis.info('memory');
      const stats = await this.redis.info('stats');
      const dbsize = await this.redis.dbsize();

      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || '0MB';
      const peakMemory = info.match(/used_memory_peak_human:(\S+)/)?.[1] || '0MB';
      const keyspaceHits = parseInt(stats.match(/keyspace_hits:(\d+)/)?.[1] || '0', 10);
      const keyspaceMisses = parseInt(stats.match(/keyspace_misses:(\d+)/)?.[1] || '0', 10);

      return {
        redis: {
          connected: true,
          memory: { used: usedMemory, peak: peakMemory },
          keys: dbsize,
          hits: keyspaceHits,
          misses: keyspaceMisses,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', error);
      return {
        redis: {
          connected: false,
          memory: { used: '0MB', peak: '0MB' },
          keys: 0,
          hits: 0,
          misses: 0,
        },
      };
    }
  }

  async getDatabaseStats(): Promise<{
    postgres: {
      connected: boolean;
      activeConnections: number;
      maxConnections: number;
      databaseSize: string;
    };
    clickhouse: {
      connected: boolean;
      totalRows: number;
      diskUsage: string;
    };
  }> {
    // Would query database system tables
    return {
      postgres: {
        connected: true,
        activeConnections: 0,
        maxConnections: 100,
        databaseSize: '0MB',
      },
      clickhouse: {
        connected: true,
        totalRows: 0,
        diskUsage: '0MB',
      },
    };
  }

  // Feature Flags Management
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const flags: Record<string, boolean> = {};
    this.featureFlags.forEach((value, key) => {
      flags[key] = value;
    });
    return flags;
  }

  async updateFeatureFlag(flag: string, enabled: boolean): Promise<{ flag: string; enabled: boolean }> {
    if (!this.featureFlags.has(flag)) {
      throw new BadRequestException(`Unknown feature flag: ${flag}`);
    }
    this.featureFlags.set(flag, enabled);
    this.logger.log(`Feature flag '${flag}' set to ${enabled}`);
    return { flag, enabled };
  }

  async toggleMaintenanceMode(enabled: boolean): Promise<{ maintenanceMode: boolean; message: string }> {
    this.featureFlags.set('maintenanceMode', enabled);
    this.logger.warn(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    return {
      maintenanceMode: enabled,
      message: enabled ? 'System is now in maintenance mode' : 'Maintenance mode disabled',
    };
  }

  // Cache Management
  async clearCache(pattern?: string): Promise<{ cleared: number; message: string }> {
    if (!this.redis) {
      return { cleared: 0, message: 'Redis not connected' };
    }

    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        this.logger.log(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
        return { cleared: keys.length, message: `Cleared ${keys.length} keys matching '${pattern}'` };
      } else {
        await this.redis.flushdb();
        this.logger.warn('Flushed entire cache database');
        return { cleared: -1, message: 'Entire cache database flushed' };
      }
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
      throw new BadRequestException('Failed to clear cache');
    }
  }

  async getCacheKeys(pattern: string = '*', limit: number = 100): Promise<{ keys: string[]; total: number }> {
    if (!this.redis) {
      return { keys: [], total: 0 };
    }

    try {
      const keys = await this.redis.keys(pattern);
      return {
        keys: keys.slice(0, limit),
        total: keys.length,
      };
    } catch (error) {
      this.logger.error('Failed to get cache keys', error);
      return { keys: [], total: 0 };
    }
  }

  // Backup Operations
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<{
    success: boolean;
    backupId: string;
    type: string;
    message: string;
    timestamp: Date;
  }> {
    // In a real implementation, this would trigger backup via pg_dump, ClickHouse backup, etc.
    const backupId = `backup_${Date.now()}`;
    this.logger.log(`Backup requested: ${type} - ${backupId}`);
    return {
      success: true,
      backupId,
      type,
      message: 'Backup request queued. Check backup status for progress.',
      timestamp: new Date(),
    };
  }

  async getBackups(): Promise<Array<{
    id: string;
    type: string;
    status: string;
    size: string;
    createdAt: Date;
  }>> {
    // Would fetch from backup storage/metadata
    return [
      {
        id: 'backup_sample_1',
        type: 'full',
        status: 'completed',
        size: '1.2GB',
        createdAt: new Date(Date.now() - 86400000),
      },
    ];
  }

  async restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    this.logger.warn(`Restore requested for backup: ${backupId}`);
    return {
      success: false,
      message: 'Backup restoration requires manual intervention. Contact system administrator.',
    };
  }

  // Config Management
  async updateConfig(updates: Record<string, any>): Promise<{
    success: boolean;
    updated: string[];
    message: string;
  }> {
    // In production, this would update a config store or trigger service reloads
    const updatedKeys = Object.keys(updates);
    this.logger.log(`Config update requested for keys: ${updatedKeys.join(', ')}`);
    return {
      success: true,
      updated: updatedKeys,
      message: 'Config changes will take effect after service restart',
    };
  }

  // Health Check All Services
  async healthCheckAll(): Promise<{
    healthy: boolean;
    services: Array<{ name: string; status: string; latency: number }>;
    timestamp: Date;
  }> {
    const statuses = await this.getServicesStatus();
    const healthy = statuses.every(s => s.status === 'online');

    return {
      healthy,
      services: statuses.map(s => ({
        name: s.name,
        status: s.status,
        latency: s.latency,
      })),
      timestamp: new Date(),
    };
  }

  // Cleanup on module destroy
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
