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
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

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
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.sub || 'unknown';
    return this.alertsService.resolveAlert(id, adminId, dto);
  }

  // ========== Alert Rules ==========

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
  async createRule(@Body() dto: CreateAlertRuleDto, @Req() req: Request) {
    const adminId = (req as any).user?.sub || 'unknown';
    return this.alertsService.createRule(adminId, dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: '更新告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '规则已更新' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.alertsService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '规则已删除' })
  async deleteRule(@Param('id') id: string) {
    await this.alertsService.deleteRule(id);
    return { success: true, message: 'Rule deleted' };
  }

  @Patch('rules/:id/toggle')
  @ApiOperation({ summary: '启用/禁用告警规则' })
  @ApiResponse({ status: HttpStatus.OK, description: '规则状态已切换' })
  async toggleRule(@Param('id') id: string) {
    return this.alertsService.toggleRule(id);
  }
}
