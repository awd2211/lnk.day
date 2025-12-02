import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SecurityService } from './security.service';
import { SecurityEventType, SecurityEventSeverity } from './entities/security-event.entity';
import { CreateBlockedIpDto } from './dto/create-blocked-ip.dto';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';
import {
  JwtAuthGuard,
  ScopeGuard,
  CurrentUser,
  AuthenticatedUser,
  RequirePermissions,
  AdminPermission,
} from '@lnk/nestjs-common';

@ApiTags('security')
@Controller('security')
@UseGuards(JwtAuthGuard, ScopeGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  // ========== Sessions ==========

  @Get('sessions')
  @ApiOperation({ summary: '获取当前用户的所有活跃会话' })
  async getSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const sessions = await this.securityService.getSessions(user.sub);
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    // Mark current session
    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      isCurrent: currentToken
        ? session.tokenHash ===
          require('crypto').createHash('sha256').update(currentToken).digest('hex')
        : false,
    }));

    return { sessions: sessionsWithCurrent };
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: '注销指定会话' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    await this.securityService.revokeSession(user.sub, sessionId);
    return { message: '会话已注销' };
  }

  @Post('sessions/revoke-others')
  @ApiOperation({ summary: '注销除当前会话外的所有会话' })
  async revokeOtherSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const currentToken = req.headers.authorization?.replace('Bearer ', '') || '';
    const result = await this.securityService.revokeAllOtherSessions(
      user.sub,
      currentToken,
    );
    return { message: `已注销 ${result.revoked} 个其他会话` };
  }

  // ========== Security Events ==========

  @Get('events')
  @ApiOperation({ summary: '获取安全事件日志' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: SecurityEventType })
  async getSecurityEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type') type?: SecurityEventType,
  ) {
    return this.securityService.getSecurityEvents(user.sub, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      type,
    });
  }

  // ========== Security Overview ==========

  @Get('overview')
  @ApiOperation({ summary: '获取安全概览' })
  async getSecurityOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.securityService.getSecurityOverview(user.sub);
  }

  // ========== Platform Security Settings (Admin) ==========

  @Get('settings')
  @ApiOperation({ summary: '获取平台安全设置' })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_VIEW)
  async getSettings() {
    return this.securityService.getPlatformSecuritySettings();
  }

  @Put('settings')
  @ApiOperation({ summary: '更新平台安全设置' })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_MANAGE)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSecuritySettingsDto,
  ) {
    return this.securityService.updatePlatformSecuritySettings(dto, user.sub);
  }

  // ========== Blocked IP Management ==========

  @Get('blocked-ips')
  @ApiOperation({ summary: '获取封禁 IP 列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_VIEW)
  async getBlockedIps(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.securityService.getBlockedIps({ page, limit, search });
  }

  @Post('blocked-ips')
  @ApiOperation({ summary: '添加封禁 IP' })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_MANAGE)
  async addBlockedIp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlockedIpDto,
  ) {
    return this.securityService.addBlockedIp(dto, user.sub, user.name || user.email);
  }

  @Delete('blocked-ips/:id')
  @ApiOperation({ summary: '解除 IP 封禁' })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_MANAGE)
  async removeBlockedIp(@Param('id', ParseUUIDPipe) id: string) {
    await this.securityService.removeBlockedIp(id);
    return { message: 'IP 封禁已解除' };
  }

  // ========== Admin Session Management ==========

  @Get('admin/sessions')
  @ApiOperation({ summary: '获取所有用户会话（管理员）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_VIEW)
  async getAllSessions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.securityService.getAllSessions({ page, limit, userId, search });
  }

  @Delete('admin/sessions/:id')
  @ApiOperation({ summary: '终止任意会话（管理员）' })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_MANAGE)
  async terminateAnySession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    await this.securityService.terminateAnySession(sessionId, user.sub);
    return { message: '会话已终止' };
  }

  // ========== Admin Security Events ==========

  @Get('admin/events')
  @ApiOperation({ summary: '获取所有安全事件（管理员）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: SecurityEventType })
  @ApiQuery({ name: 'severity', required: false, enum: SecurityEventSeverity })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_VIEW)
  async getAllSecurityEvents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('type') type?: SecurityEventType,
    @Query('severity') severity?: SecurityEventSeverity,
  ) {
    return this.securityService.getAllSecurityEvents({ page, limit, userId, type, severity });
  }

  // ========== Admin Security Statistics ==========

  @Get('admin/stats')
  @ApiOperation({ summary: '获取安全统计数据（管理员）' })
  @RequirePermissions(AdminPermission.ADMIN_SECURITY_VIEW)
  async getSecurityStats() {
    return this.securityService.getSecurityStats();
  }
}
