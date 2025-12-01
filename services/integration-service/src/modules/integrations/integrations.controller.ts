import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@Controller('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取集成统计数据' })
  getStats() {
    return this.service.getStats();
  }

  @Get('available')
  @ApiOperation({ summary: '获取可用的集成列表' })
  getAvailableIntegrations() {
    return this.service.getAvailableIntegrations();
  }

  @Post(':platform/connect')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: '连接集成平台' })
  async connect(
    @Param('platform') platform: string,
    @ScopedTeamId() teamId: string,
    @Body() data: Record<string, any>,
  ) {
    return this.service.connect(platform, teamId, data);
  }

  @Get()
  @ApiOperation({ summary: '获取所有集成列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ page, limit, type, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取集成详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const integration = await this.service.findOne(id);
    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }
    return integration;
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '获取集成同步日志' })
  getSyncLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSyncLogs(id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: '触发同步' })
  triggerSync(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.triggerSync(id);
  }

  @Put(':id/toggle-sync')
  @ApiOperation({ summary: '切换同步状态' })
  toggleSync(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.service.toggleSync(id, enabled);
  }

  @Put(':id/config')
  @ApiOperation({ summary: '更新集成配置' })
  updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() config: Record<string, any>,
  ) {
    return this.service.updateConfig(id, config);
  }

  @Delete(':id')
  @ApiOperation({ summary: '断开集成连接' })
  async disconnect(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.service.disconnect(id);
    if (!result) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }
    return { success: true };
  }
}
