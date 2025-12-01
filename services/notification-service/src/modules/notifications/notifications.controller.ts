import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // =================== Events ===================

  @Get('events')
  @ApiOperation({ summary: '获取可用的通知事件类型' })
  getEvents() {
    return this.service.getAvailableEvents();
  }

  // =================== Stats ===================

  @Get('stats')
  @ApiOperation({ summary: '获取通知统计数据' })
  getStats() {
    return this.service.getStats();
  }

  // =================== Logs ===================

  @Get('logs')
  @ApiOperation({ summary: '获取通知发送记录' })
  getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getLogs({ page, limit, type, status, search });
  }

  @Get('logs/:id')
  @ApiOperation({ summary: '获取通知记录详情' })
  getLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getLog(id);
  }

  @Post('logs/:id/resend')
  @ApiOperation({ summary: '重新发送通知' })
  resendNotification(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.resendNotification(id);
  }

  @Post('broadcast')
  @ApiOperation({ summary: '发送广播通知' })
  sendBroadcast(@Body() data: { subject: string; content: string; type: string }) {
    return this.service.sendBroadcast(data);
  }

  // =================== Templates ===================

  @Get('templates')
  @ApiOperation({ summary: '获取所有通知模板' })
  getTemplates(@Query('type') type?: string) {
    return this.service.getTemplates(type);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '获取模板详情' })
  getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTemplate(id);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: '更新通知模板' })
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.service.updateTemplate(id, data);
  }

  @Post('templates/:id/reset')
  @ApiOperation({ summary: '重置模板为默认值' })
  resetTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.resetTemplate(id);
  }

  // =================== Channels ===================

  @Get('channels')
  @ApiOperation({ summary: '获取所有通知渠道' })
  getChannels() {
    return this.service.getChannels();
  }

  @Get('channels/:id')
  @ApiOperation({ summary: '获取渠道详情' })
  getChannel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getChannel(id);
  }

  @Put('channels/:id')
  @ApiOperation({ summary: '更新通知渠道配置' })
  updateChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.service.updateChannel(id, data);
  }

  @Patch('channels/:id')
  @ApiOperation({ summary: '切换渠道启用状态' })
  toggleChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.service.toggleChannel(id, enabled);
  }

  @Post('channels/:id/test')
  @ApiOperation({ summary: '测试通知渠道' })
  testChannel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.testChannel(id);
  }

  // =================== 前端兼容端点 ===================

  @Get('detail/:id')
  @ApiOperation({ summary: '获取单个通知详情' })
  getNotificationById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getLog(id);
  }
}
