import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VersionService } from '@lnk/nestjs-common';

@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly versionService: VersionService,
  ) {}

  @Get()
  async check() {
    const dbHealthy = await this.checkDatabase();
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'campaign-service',
      version: this.versionService.getVersion(),
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
      },
    };
  }

  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    const dbHealthy = await this.checkDatabase();
    return {
      ready: dbHealthy,
      timestamp: new Date().toISOString(),
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
