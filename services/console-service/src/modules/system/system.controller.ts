import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SystemService } from './system.service';

@ApiTags('system')
@Controller('system')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('info')
  @ApiOperation({ summary: '获取系统信息' })
  getSystemInfo() {
    return this.systemService.getSystemInfo();
  }

  @Get('services')
  @ApiOperation({ summary: '获取所有服务状态' })
  getServicesStatus() {
    return this.systemService.getServicesStatus();
  }

  @Get('services/:name/logs')
  @ApiOperation({ summary: '获取服务日志' })
  @ApiQuery({ name: 'lines', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['debug', 'info', 'warn', 'error'] })
  getServiceLogs(
    @Param('name') name: string,
    @Query('lines') lines?: number,
    @Query('level') level?: string,
  ) {
    return this.systemService.getServiceLogs(name, { lines, level });
  }

  @Post('services/:name/restart')
  @ApiOperation({ summary: '重启服务' })
  restartService(@Param('name') name: string) {
    return this.systemService.restartService(name);
  }

  @Get('config')
  @ApiOperation({ summary: '获取系统配置' })
  getConfig() {
    return this.systemService.getConfig();
  }

  @Get('queues')
  @ApiOperation({ summary: '获取队列状态' })
  getQueueStats() {
    return this.systemService.getQueueStats();
  }

  @Get('cache')
  @ApiOperation({ summary: '获取缓存状态' })
  getCacheStats() {
    return this.systemService.getCacheStats();
  }

  @Get('database')
  @ApiOperation({ summary: '获取数据库状态' })
  getDatabaseStats() {
    return this.systemService.getDatabaseStats();
  }
}
