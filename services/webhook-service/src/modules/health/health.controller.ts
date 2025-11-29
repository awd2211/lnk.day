import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '健康检查' })
  check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'webhook-service',
      version: '1.0.0',
    };
  }

  @Get('live')
  @ApiOperation({ summary: '存活探针' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: '就绪探针' })
  ready() {
    return { status: 'ok' };
  }
}
