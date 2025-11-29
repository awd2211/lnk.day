import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VersionService } from '@lnk/nestjs-common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly versionService: VersionService) {}
  @Get()
  @ApiOperation({ summary: '健康检查' })
  check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'integration-service',
      version: this.versionService.getVersion(),
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
