import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as os from 'os';

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

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'x-internal-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    this.services = [
      { name: 'user-service', url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'), port: 60002 },
      { name: 'link-service', url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'), port: 60003 },
      { name: 'redirect-service', url: this.configService.get('REDIRECT_SERVICE_URL', 'http://localhost:60004'), port: 60004 },
      { name: 'analytics-service', url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60020'), port: 60020 },
      { name: 'qr-service', url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'), port: 60005 },
      { name: 'page-service', url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60006'), port: 60006 },
      { name: 'deeplink-service', url: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60007'), port: 60007 },
      { name: 'notification-service', url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60010'), port: 60010 },
      { name: 'campaign-service', url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60008'), port: 60008 },
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
          const response = await this.httpClient.get(`${service.url}/health`, {
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
    // Would fetch from Redis INFO command
    return {
      redis: {
        connected: true,
        memory: { used: '0MB', peak: '0MB' },
        keys: 0,
        hits: 0,
        misses: 0,
      },
    };
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
}
