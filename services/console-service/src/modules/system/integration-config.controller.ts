import {
  Controller,
  Get,
  Put,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, JwtPayload } from '@lnk/nestjs-common';
import { IntegrationConfigService } from './integration-config.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('system/integrations')
@Controller('system/integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditLogInterceptor)
export class IntegrationConfigController {
  constructor(private readonly service: IntegrationConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取所有集成平台配置' })
  findAll() {
    return this.service.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取集成统计' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取集成配置详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新集成配置' })
  @LogAudit({
    action: 'integration.config.update',
    targetType: 'integration_config',
    targetIdParam: 'id',
    detailFields: ['name', 'enabled'],
    excludeFields: ['apiKey', 'apiSecret', 'clientSecret', 'accessToken', 'refreshToken'],
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, data, user?.sub);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '启用/禁用集成' })
  @LogAudit({
    action: 'integration.config.toggle',
    targetType: 'integration_config',
    targetIdParam: 'id',
    detailFields: ['enabled'],
  })
  toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('enabled') enabled: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.toggle(id, enabled, user?.sub);
  }
}
