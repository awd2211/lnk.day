import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    return this.healthService.checkHealth();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async readiness() {
    const health = await this.healthService.checkHealth();
    return {
      ready: health.status !== 'unhealthy',
      ...health,
    };
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get service routes' })
  routes() {
    return this.healthService.getServiceRoutes();
  }
}
