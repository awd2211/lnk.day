import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SystemService } from './system.service';
import { SystemConfigService, EmailSettings } from './config.service';

@ApiTags('system')
@Controller('system')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
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
  updateConfig(@Body() updates: Record<string, any>) {
    return this.systemService.updateConfig(updates);
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

  @Get('cache/keys')
  @ApiOperation({ summary: '获取缓存键列表' })
  @ApiQuery({ name: 'pattern', required: false, description: '匹配模式，默认为 *' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量限制，默认100' })
  getCacheKeys(@Query('pattern') pattern?: string, @Query('limit') limit?: number) {
    return this.systemService.getCacheKeys(pattern, limit);
  }

  @Delete('cache')
  @ApiOperation({ summary: '清除缓存' })
  @ApiQuery({ name: 'pattern', required: false, description: '匹配模式，不指定则清除全部' })
  clearCache(@Query('pattern') pattern?: string) {
    return this.systemService.clearCache(pattern);
  }

  @Get('database')
  @ApiOperation({ summary: '获取数据库状态' })
  getDatabaseStats() {
    return this.systemService.getDatabaseStats();
  }

  // Feature Flags
  @Get('features')
  @ApiOperation({ summary: '获取功能开关列表' })
  getFeatureFlags() {
    return this.systemService.getFeatureFlags();
  }

  @Put('features/:flag')
  @ApiOperation({ summary: '更新功能开关' })
  updateFeatureFlag(@Param('flag') flag: string, @Body() data: { enabled: boolean }) {
    return this.systemService.updateFeatureFlag(flag, data.enabled);
  }

  @Post('maintenance')
  @ApiOperation({ summary: '切换维护模式' })
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
  createBackup(@Body() data?: { type?: 'full' | 'incremental' }) {
    return this.systemService.createBackup(data?.type);
  }

  @Post('backups/:id/restore')
  @ApiOperation({ summary: '恢复备份' })
  restoreBackup(@Param('id') id: string) {
    return this.systemService.restoreBackup(id);
  }

  @Delete('backups/:id')
  @ApiOperation({ summary: '删除备份' })
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
  updateEmailTemplate(
    @Param('id') id: string,
    @Body() data: { subject: string; html: string },
  ) {
    return this.configService.updateEmailTemplate(id, data);
  }

  @Post('email-templates/:id/reset')
  @ApiOperation({ summary: '重置邮件模板为默认值' })
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
