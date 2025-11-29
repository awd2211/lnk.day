import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { VersionService } from '@lnk/nestjs-common';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly versionService: VersionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const health = await this.healthService.checkHealth();
    return {
      ...health,
      version: this.versionService.getVersion(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.versionService.getVersion(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async readiness() {
    const health = await this.healthService.checkHealth();
    return {
      ready: health.status !== 'unhealthy',
      ...health,
      version: this.versionService.getVersion(),
    };
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get service routes' })
  routes() {
    return this.healthService.getServiceRoutes();
  }
}
