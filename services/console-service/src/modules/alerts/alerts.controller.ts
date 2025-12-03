import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AlertsService } from './alerts.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import {
  QueryAlertsDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertRulesDto,
} from './dto/alerts.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(AuditLogInterceptor)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ========== Alert Rules (MUST be before :id routes) ==========

  @Get('rules/stats')
  @ApiOperation({ summary: '获取规则统计' })
  async getRuleStats() {
    return this.alertsService.getRuleStats();
  }

  @Get('rules/types')
  @ApiOperation({ summary: '获取规则类型列表' })
  async getRuleTypes() {
    return { types: this.alertsService.getRuleTypes() };
  }

  @Get('rules')
  @ApiOperation({ summary: '获取告警规则列表' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回告警规则列表' })
  async getRules(@Query() query: QueryAlertRulesDto) {
    return this.alertsService.findAllRules(query);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: '获取告警规则详情' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回告警规则详情' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '规则不存在' })
  async getRuleById(@Param('id') id: string) {
    return this.alertsService.findOneRule(id);
  }

  @Post('rules')
  @ApiOperation({ summary: '创建告警规则' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '规则已创建' })
  @LogAudit({
    action: 'alert.rule.create',
    targetType: 'alert_rule',
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
    detailFields: ['name', 'type', 'condition'],
  })
  async createRule(@Body() dto: CreateAlertRuleDto, @Req() req: Request) {
    const adminId = (req as any).user?.sub || 'unknown';
    return this.alertsService.createRule(adminId, dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: '更新告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '规则已更新' })
  @LogAudit({
    action: 'alert.rule.update',
    targetType: 'alert_rule',
    targetIdParam: 'id',
    detailFields: ['name', 'type', 'condition'],
  })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.alertsService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '规则已删除' })
  @LogAudit({
    action: 'alert.rule.delete',
    targetType: 'alert_rule',
    targetIdParam: 'id',
  })
  async deleteRule(@Param('id') id: string) {
    await this.alertsService.deleteRule(id);
    return { success: true, message: 'Rule deleted' };
  }

  @Patch('rules/:id/toggle')
  @ApiOperation({ summary: '启用/禁用告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '规则状态已切换' })
  @LogAudit({
    action: 'alert.rule.toggle',
    targetType: 'alert_rule',
    targetIdParam: 'id',
    detailFields: ['enabled'],
  })
  async toggleRule(@Param('id') id: string, @Body() body?: { enabled?: boolean }) {
    // 如果传入了 enabled 参数，直接设置；否则切换当前状态
    if (body?.enabled !== undefined) {
      return this.alertsService.setRuleEnabled(id, body.enabled);
    }
    return this.alertsService.toggleRule(id);
  }

  // ========== Alerts ==========

  @Get('stats')
  @ApiOperation({ summary: '获取告警统计数据' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回告警统计数据' })
  async getStats() {
    return this.alertsService.getAlertStats();
  }

  @Get()
  @ApiOperation({ summary: '获取告警列表' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回告警列表' })
  async getAlerts(@Query() query: QueryAlertsDto) {
    return this.alertsService.findAllAlerts(query);
  }

  @Get('severities')
  @ApiOperation({ summary: '获取严重程度列表' })
  async getSeverities() {
    return { severities: this.alertsService.getSeverityLevels() };
  }

  @Get('statuses')
  @ApiOperation({ summary: '获取状态列表' })
  async getStatuses() {
    return { statuses: this.alertsService.getStatusTypes() };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取告警详情' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回告警详情' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '告警不存在' })
  async getAlertById(@Param('id') id: string) {
    return this.alertsService.findOneAlert(id);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: '确认告警' })
  @ApiResponse({ status: HttpStatus.OK, description: '告警已确认' })
  @LogAudit({
    action: 'alert.acknowledge',
    targetType: 'alert',
    targetIdParam: 'id',
    detailFields: ['note'],
  })
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.sub || 'unknown';
    return this.alertsService.acknowledgeAlert(id, adminId, dto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: '解决告警' })
  @ApiResponse({ status: HttpStatus.OK, description: '告警已解决' })
  @LogAudit({
    action: 'alert.resolve',
    targetType: 'alert',
    targetIdParam: 'id',
    detailFields: ['resolution'],
  })
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.sub || 'unknown';
    return this.alertsService.resolveAlert(id, adminId, dto);
  }
}
