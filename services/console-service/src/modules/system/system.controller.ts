import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SystemService } from './system.service';
import { SystemConfigService, EmailSettings } from './config.service';
import { LogAudit } from '../audit/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('system')
@Controller('system')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@UseInterceptors(AuditLogInterceptor)
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly configService: SystemConfigService,
  ) {}

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
  @LogAudit({
    action: 'system.service.restart',
    targetType: 'service',
    targetIdParam: 'name',
  })
  restartService(@Param('name') name: string) {
    return this.systemService.restartService(name);
  }

  @Get('config')
  @ApiOperation({ summary: '获取系统配置' })
  getConfig() {
    return this.systemService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: '更新系统配置' })
  @LogAudit({
    action: 'system.config.update',
    targetType: 'system',
    logRequestBody: true,
    excludeFields: ['password', 'secret', 'apiKey', 'token'],
  })
  updateConfig(@Body() updates: Record<string, any>) {
    return this.systemService.updateConfig(updates);
  }

  @Post('config/reset')
  @ApiOperation({ summary: '重置系统配置为默认值' })
  @LogAudit({
    action: 'system.config.reset',
    targetType: 'system',
  })
  resetConfig() {
    return this.systemService.resetConfig();
  }

  @Get('queues')
  @ApiOperation({ summary: '获取队列状态' })
  getQueueStats() {
    return this.systemService.getQueueStats();
  }

  @Post('queues/:queueName/clear')
  @ApiOperation({ summary: '清空队列' })
  @LogAudit({
    action: 'system.queue.clear',
    targetType: 'queue',
    targetIdParam: 'queueName',
  })
  clearQueue(@Param('queueName') queueName: string) {
    return this.systemService.clearQueue(queueName);
  }

  @Get('cache')
  @ApiOperation({ summary: '获取缓存状态' })
  getCacheStats() {
    return this.systemService.getCacheStats();
  }

  @Get('cache/keys')
  @ApiOperation({ summary: '获取缓存键列表' })
  @ApiQuery({ name: 'pattern', required: false, description: '匹配模式，默认为 *' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量限制，默认100' })
  getCacheKeys(@Query('pattern') pattern?: string, @Query('limit') limit?: number) {
    return this.systemService.getCacheKeys(pattern, limit);
  }

  @Delete('cache')
  @ApiOperation({ summary: '清除缓存 (DELETE 方式)' })
  @ApiQuery({ name: 'pattern', required: false, description: '匹配模式，不指定则清除全部' })
  @LogAudit({
    action: 'system.cache.clear',
    targetType: 'cache',
    detailFields: ['pattern'],
  })
  clearCache(@Query('pattern') pattern?: string) {
    return this.systemService.clearCache(pattern);
  }

  @Post('cache/clear')
  @ApiOperation({ summary: '清除缓存 (POST 方式)' })
  @LogAudit({
    action: 'system.cache.clear',
    targetType: 'cache',
    detailFields: ['pattern'],
  })
  clearCachePost(@Body() body?: { pattern?: string }) {
    return this.systemService.clearCache(body?.pattern);
  }

  @Get('database')
  @ApiOperation({ summary: '获取数据库状态' })
  getDatabaseStats() {
    return this.systemService.getDatabaseStats();
  }

  @Get('logs')
  @ApiOperation({ summary: '获取系统日志' })
  @ApiQuery({ name: 'level', required: false, enum: ['debug', 'info', 'warn', 'error'] })
  @ApiQuery({ name: 'service', required: false, description: '服务名称' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量限制，默认100' })
  getSystemLogs(
    @Query('level') level?: string,
    @Query('service') service?: string,
    @Query('limit') limit?: number,
  ) {
    return this.systemService.getSystemLogs({ level, service, limit });
  }

  // Feature Flags
  @Get('features')
  @ApiOperation({ summary: '获取功能开关列表' })
  getFeatureFlags() {
    return this.systemService.getFeatureFlags();
  }

  @Put('features/:flag')
  @ApiOperation({ summary: '更新功能开关' })
  @LogAudit({
    action: 'system.feature.update',
    targetType: 'feature',
    targetIdParam: 'flag',
    detailFields: ['enabled'],
  })
  updateFeatureFlag(@Param('flag') flag: string, @Body() data: { enabled: boolean }) {
    return this.systemService.updateFeatureFlag(flag, data.enabled);
  }

  @Post('maintenance')
  @ApiOperation({ summary: '切换维护模式' })
  @LogAudit({
    action: 'system.maintenance.toggle',
    targetType: 'system',
    detailFields: ['enabled'],
  })
  toggleMaintenanceMode(@Body() data: { enabled: boolean }) {
    return this.systemService.toggleMaintenanceMode(data.enabled);
  }

  // Backup Operations
  @Get('backups')
  @ApiOperation({ summary: '获取备份列表' })
  getBackups() {
    return this.systemService.getBackups();
  }

  @Post('backups')
  @ApiOperation({ summary: '创建备份' })
  @ApiBody({ schema: { properties: { type: { type: 'string', enum: ['full', 'incremental'] } } } })
  @LogAudit({
    action: 'system.backup.create',
    targetType: 'backup',
    detailFields: ['type'],
    getTarget: (result) => result ? { id: result.id, name: result.name } : null,
  })
  createBackup(@Body() data?: { type?: 'full' | 'incremental' }) {
    return this.systemService.createBackup(data?.type);
  }

  @Post('backups/:id/restore')
  @ApiOperation({ summary: '恢复备份' })
  @LogAudit({
    action: 'system.backup.restore',
    targetType: 'backup',
    targetIdParam: 'id',
  })
  restoreBackup(@Param('id') id: string) {
    return this.systemService.restoreBackup(id);
  }

  @Delete('backups/:id')
  @ApiOperation({ summary: '删除备份' })
  @LogAudit({
    action: 'system.backup.delete',
    targetType: 'backup',
    targetIdParam: 'id',
  })
  deleteBackup(@Param('id') id: string) {
    return this.systemService.deleteBackup(id);
  }

  // Health Check
  @Get('health')
  @ApiOperation({ summary: '全系统健康检查' })
  healthCheckAll() {
    return this.systemService.healthCheckAll();
  }

  // Email Configuration
  @Get('email-settings')
  @ApiOperation({ summary: '获取邮件配置' })
  getEmailSettings() {
    return this.configService.getEmailSettings();
  }

  @Put('email-settings')
  @ApiOperation({ summary: '更新邮件配置' })
  @LogAudit({
    action: 'system.email.settings.update',
    targetType: 'email_settings',
    logRequestBody: true,
    excludeFields: ['password', 'apiKey', 'secret'],
  })
  updateEmailSettings(@Body() settings: Partial<EmailSettings>) {
    return this.configService.updateEmailSettings(settings);
  }

  @Post('test-email')
  @ApiOperation({ summary: '发送测试邮件' })
  testEmail(@Body() data: { to: string }) {
    return this.configService.testEmailSettings(data.to);
  }

  // Email Templates
  @Get('email-templates')
  @ApiOperation({ summary: '获取邮件模板列表' })
  getEmailTemplates() {
    return this.configService.getEmailTemplates();
  }

  @Put('email-templates/:id')
  @ApiOperation({ summary: '更新邮件模板' })
  @LogAudit({
    action: 'system.email.template.update',
    targetType: 'email_template',
    targetIdParam: 'id',
    detailFields: ['subject'],
  })
  updateEmailTemplate(
    @Param('id') id: string,
    @Body() data: { subject: string; html: string },
  ) {
    return this.configService.updateEmailTemplate(id, data);
  }

  @Post('email-templates/:id/reset')
  @ApiOperation({ summary: '重置邮件模板为默认值' })
  @LogAudit({
    action: 'system.email.template.reset',
    targetType: 'email_template',
    targetIdParam: 'id',
  })
  resetEmailTemplate(@Param('id') id: string) {
    return this.configService.resetEmailTemplate(id);
  }
}

// Separate internal controller without JWT authentication
@ApiTags('system-internal')
@Controller('system')
export class SystemInternalController {
  constructor(private readonly configService: SystemConfigService) {}

  // Internal endpoint for notification-service (no auth required for internal calls)
  @Get('email-settings-internal')
  @ApiOperation({ summary: '获取邮件配置（内部）' })
  async getEmailSettingsInternal() {
    // Return unmasked settings for internal service use
    return this.configService.getEmailSettingsInternal();
  }
}
