import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VersionService } from '@lnk/nestjs-common';
import axios from 'axios';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly services: { name: string; url: string; healthPath?: string }[];

  constructor(
    private readonly configService: ConfigService,
    private readonly versionService: VersionService,
  ) {
    this.services = [
      { name: 'user-service', url: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002') },
      { name: 'link-service', url: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003') },
      { name: 'campaign-service', url: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004') },
      { name: 'qr-service', url: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005') },
      { name: 'page-service', url: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007') },
      { name: 'deeplink-service', url: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60008') },
      { name: 'notification-service', url: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020') },
      { name: 'analytics-service', url: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'), healthPath: '/health' },
    ];
  }

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    services: ServiceHealth[];
  }> {
    const results = await Promise.all(
      this.services.map((service) => this.checkServiceHealth(service)),
    );

    const unhealthyCount = results.filter((r) => r.status === 'unhealthy').length;
    const status =
      unhealthyCount === 0
        ? 'healthy'
        : unhealthyCount < results.length / 2
          ? 'degraded'
          : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.versionService.getVersion(),
      services: results,
    };
  }

  private async checkServiceHealth(service: { name: string; url: string; healthPath?: string }): Promise<ServiceHealth> {
    const startTime = Date.now();
    const healthPath = service.healthPath || '/api/v1/health';

    try {
      await axios.get(`${service.url}${healthPath}`, { timeout: 5000 });
      return {
        name: service.name,
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        name: service.name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  getServiceRoutes() {
    return this.services.map((s) => ({
      name: s.name,
      url: s.url,
    }));
  }
}
