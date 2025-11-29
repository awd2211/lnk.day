import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VersionService } from '@lnk/nestjs-common';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly versionService: VersionService,
  ) {}

  @Get()
  async check() {
    const dbHealthy = await this.checkDatabase();
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      service: 'domain-service',
      version: this.versionService.getVersion(),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
      },
    };
  }

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness() {
    const dbHealthy = await this.checkDatabase();
    return {
      status: dbHealthy ? 'ok' : 'not_ready',
      checks: {
        database: dbHealthy ? 'connected' : 'disconnected',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
