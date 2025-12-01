import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SecurityService } from './security.service';
import { SecurityEventType } from './entities/security-event.entity';
import {
  JwtAuthGuard,
  ScopeGuard,
  CurrentUser,
  AuthenticatedUser,
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
    return this.securityService.getSecuritySettings(user.sub);
  }
}
