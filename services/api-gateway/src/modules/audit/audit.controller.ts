import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Headers,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService, AuditLogEntry } from './audit.service';
import { AuditAlertsService, AlertCondition, AlertNotification } from './audit-alerts.service';
import { AuditAction, AuditSeverity } from './entities/audit-log.entity';

class QueryLogsDto {
  page?: number;
  limit?: number;
  userId?: string;
  actions?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class CreateLogDto {
  action: AuditAction;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
}

class CreateAlertDto {
  name: string;
  conditions: AlertCondition[];
  actions: AlertNotification[];
}

class UpdateAlertDto {
  name?: string;
  enabled?: boolean;
  conditions?: AlertCondition[];
  actions?: AlertNotification[];
}

class RetentionPolicyDto {
  retentionDays: number;
}

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly alertsService: AuditAlertsService,
  ) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'actions', required: false, description: 'Comma-separated actions' })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'severity', required: false, description: 'Comma-separated severities' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async queryLogs(
    @Headers('x-team-id') teamId: string,
    @Query() query: QueryLogsDto,
  ) {
    const result = await this.auditService.query({
      teamId,
      userId: query.userId,
      actions: query.actions?.split(',') as AuditAction[],
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      severity: query.severity?.split(',') as AuditSeverity[],
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? parseInt(String(query.page), 10) : 1,
      limit: query.limit ? parseInt(String(query.limit), 10) : 50,
      sortOrder: query.sortOrder || 'DESC',
    });

    return result;
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get a specific audit log entry' })
  async getLog(
    @Headers('x-team-id') teamId: string,
    @Param('id') id: string,
  ) {
    const log = await this.auditService.getById(id, teamId);
    return log || { message: 'Log not found' };
  }

  @Get('resource/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get audit history for a specific resource' })
  async getResourceHistory(
    @Headers('x-team-id') teamId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.auditService.getResourceHistory(
      teamId,
      resourceType,
      resourceId,
      limit ? parseInt(limit, 10) : 100,
    );
    return { resourceType, resourceId, logs };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit activity for a specific user' })
  async getUserActivity(
    @Headers('x-team-id') teamId: string,
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ) {
    const logs = await this.auditService.getUserActivity(
      teamId,
      userId,
      days ? parseInt(days, 10) : 30,
    );
    return { userId, logs };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics' })
  async getStats(
    @Headers('x-team-id') teamId: string,
    @Query('days') days?: string,
  ) {
    const stats = await this.auditService.getStats(
      teamId,
      days ? parseInt(days, 10) : 30,
    );
    return stats;
  }

  @Get('security')
  @ApiOperation({ summary: 'Get security-related audit events' })
  async getSecurityEvents(
    @Headers('x-team-id') teamId: string,
    @Query('limit') limit?: string,
  ) {
    const events = await this.auditService.getSecurityEvents(
      teamId,
      limit ? parseInt(limit, 10) : 100,
    );
    return { events };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async exportLogs(
    @Headers('x-team-id') teamId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const data = await this.auditService.exportLogs(
      teamId,
      new Date(startDate),
      new Date(endDate),
      format,
    );

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `audit-logs-${startDate}-${endDate}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  @Post('log')
  @ApiOperation({ summary: 'Create an audit log entry' })
  async createLog(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-forwarded-for') ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Body() dto: CreateLogDto,
  ) {
    const entry: AuditLogEntry = {
      teamId,
      userId,
      action: dto.action,
      severity: dto.severity,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      details: dto.details,
      ipAddress,
      userAgent,
    };

    const log = await this.auditService.log(entry);
    return { id: log.id, action: log.action, createdAt: log.createdAt };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old audit logs' })
  async cleanupLogs(
    @Headers('x-team-id') teamId: string,
    @Body() body: { retentionDays?: number },
  ) {
    const deleted = await this.auditService.cleanupOldLogs(
      teamId,
      body.retentionDays || 90,
    );
    return { deleted, retentionDays: body.retentionDays || 90 };
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get list of available audit actions' })
  getAvailableActions() {
    return {
      actions: [
        // Link actions
        { key: 'link.created', category: 'Links', description: 'A short link was created' },
        { key: 'link.updated', category: 'Links', description: 'A short link was updated' },
        { key: 'link.deleted', category: 'Links', description: 'A short link was deleted' },
        { key: 'link.enabled', category: 'Links', description: 'A short link was enabled' },
        { key: 'link.disabled', category: 'Links', description: 'A short link was disabled' },
        // User actions
        { key: 'user.login', category: 'Users', description: 'User logged in' },
        { key: 'user.logout', category: 'Users', description: 'User logged out' },
        { key: 'user.password_changed', category: 'Users', description: 'User changed password' },
        { key: 'user.email_changed', category: 'Users', description: 'User changed email' },
        { key: 'user.created', category: 'Users', description: 'User account created' },
        { key: 'user.deleted', category: 'Users', description: 'User account deleted' },
        // Team actions
        { key: 'team.created', category: 'Teams', description: 'Team was created' },
        { key: 'team.updated', category: 'Teams', description: 'Team settings updated' },
        { key: 'team.deleted', category: 'Teams', description: 'Team was deleted' },
        { key: 'team.member_added', category: 'Teams', description: 'Member added to team' },
        { key: 'team.member_removed', category: 'Teams', description: 'Member removed from team' },
        { key: 'team.member_role_changed', category: 'Teams', description: 'Member role changed' },
        // API Key actions
        { key: 'api_key.created', category: 'API Keys', description: 'API key created' },
        { key: 'api_key.revoked', category: 'API Keys', description: 'API key revoked' },
        { key: 'api_key.used', category: 'API Keys', description: 'API key was used' },
        // Settings actions
        { key: 'settings.updated', category: 'Settings', description: 'Settings updated' },
        { key: 'domain.added', category: 'Domains', description: 'Custom domain added' },
        { key: 'domain.removed', category: 'Domains', description: 'Custom domain removed' },
        { key: 'domain.verified', category: 'Domains', description: 'Custom domain verified' },
        // Integration actions
        { key: 'integration.connected', category: 'Integrations', description: 'Integration connected' },
        { key: 'integration.disconnected', category: 'Integrations', description: 'Integration disconnected' },
        { key: 'webhook.created', category: 'Webhooks', description: 'Webhook created' },
        { key: 'webhook.deleted', category: 'Webhooks', description: 'Webhook deleted' },
        // Security actions
        { key: 'security.failed_login', category: 'Security', description: 'Failed login attempt' },
        { key: 'security.suspicious_activity', category: 'Security', description: 'Suspicious activity detected' },
        { key: 'security.2fa_enabled', category: 'Security', description: '2FA enabled' },
        { key: 'security.2fa_disabled', category: 'Security', description: '2FA disabled' },
      ],
    };
  }

  // ========== Alert Configuration Endpoints ==========

  @Get('alerts')
  @ApiOperation({ summary: 'Get alert configurations' })
  async getAlerts(@Headers('x-team-id') teamId: string) {
    const alerts = await this.alertsService.getAlertConfigs(teamId);
    return { alerts };
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create an alert configuration' })
  async createAlert(
    @Headers('x-team-id') teamId: string,
    @Body() dto: CreateAlertDto,
  ) {
    const alert = await this.alertsService.createAlertConfig({
      teamId,
      name: dto.name,
      enabled: true,
      conditions: dto.conditions,
      actions: dto.actions,
    });
    return alert;
  }

  @Put('alerts/:alertId')
  @ApiOperation({ summary: 'Update an alert configuration' })
  async updateAlert(
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertDto,
  ) {
    const alert = await this.alertsService.updateAlertConfig(alertId, dto);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  @Delete('alerts/:alertId')
  @ApiOperation({ summary: 'Delete an alert configuration' })
  async deleteAlert(@Param('alertId') alertId: string) {
    const deleted = await this.alertsService.deleteAlertConfig(alertId);
    return { success: deleted };
  }

  // ========== Retention Policy Endpoints ==========

  @Get('retention')
  @ApiOperation({ summary: 'Get audit log retention policy' })
  async getRetentionPolicy(@Headers('x-team-id') teamId: string) {
    return this.alertsService.getRetentionPolicy(teamId);
  }

  @Put('retention')
  @ApiOperation({ summary: 'Update audit log retention policy' })
  async updateRetentionPolicy(
    @Headers('x-team-id') teamId: string,
    @Body() dto: RetentionPolicyDto,
  ) {
    await this.alertsService.setRetentionPolicy(teamId, dto.retentionDays);
    return { success: true, retentionDays: dto.retentionDays };
  }

  // ========== Predefined Alert Templates ==========

  @Get('alerts/templates')
  @ApiOperation({ summary: 'Get predefined alert templates' })
  getAlertTemplates() {
    return {
      templates: [
        {
          id: 'failed_logins',
          name: 'Failed Login Attempts',
          description: 'Alert when there are multiple failed login attempts',
          conditions: [
            { type: 'action', value: 'security.failed_login', operator: 'eq' },
            { type: 'threshold', value: 5, operator: 'gt', timeWindow: 15 },
          ],
          suggestedActions: [
            { type: 'slack', description: 'Send Slack notification' },
            { type: 'email', description: 'Send email to security team' },
          ],
        },
        {
          id: 'mass_deletion',
          name: 'Mass Link Deletion',
          description: 'Alert when many links are deleted in a short time',
          conditions: [
            { type: 'action', value: 'link.deleted', operator: 'eq' },
            { type: 'threshold', value: 10, operator: 'gt', timeWindow: 5 },
          ],
          suggestedActions: [
            { type: 'webhook', description: 'Trigger incident response' },
          ],
        },
        {
          id: 'api_key_usage',
          name: 'API Key Created/Revoked',
          description: 'Monitor API key lifecycle events',
          conditions: [
            { type: 'action', value: 'api_key.created', operator: 'eq' },
          ],
          suggestedActions: [
            { type: 'email', description: 'Notify account owner' },
          ],
        },
        {
          id: 'team_changes',
          name: 'Team Membership Changes',
          description: 'Track when team members are added or removed',
          conditions: [
            { type: 'pattern', value: 'team\\.member_(added|removed)', operator: 'regex' },
          ],
          suggestedActions: [
            { type: 'slack', description: 'Post to team channel' },
          ],
        },
        {
          id: 'critical_events',
          name: 'Critical Security Events',
          description: 'All critical severity audit events',
          conditions: [
            { type: 'severity', value: 'critical', operator: 'eq' },
          ],
          suggestedActions: [
            { type: 'webhook', description: 'Trigger PagerDuty' },
            { type: 'email', description: 'Immediate notification' },
          ],
        },
      ],
    };
  }
}
