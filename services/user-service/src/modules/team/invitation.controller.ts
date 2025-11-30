import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

import { InvitationService } from './invitation.service';
import {
  CreateInvitationDto,
  BulkInviteDto,
  AcceptInvitationDto,
  DeclineInvitationDto,
  InvitationQueryDto,
} from './dto/team-invitation.dto';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';

@ApiTags('team-invitations')
@Controller()
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  // ========== 团队邀请管理（需要团队管理权限）==========

  @Post('teams/:teamId/invitations')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送团队邀请' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  async createInvitation(
    @Param('teamId') teamId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationService.createInvitation(teamId, dto, user.sub);
  }

  @Post('teams/:teamId/invitations/bulk')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量发送团队邀请' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  async bulkInvite(
    @Param('teamId') teamId: string,
    @Body() dto: BulkInviteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationService.bulkInvite(teamId, dto, user.sub);
  }

  @Get('teams/:teamId/invitations')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取团队邀请列表' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  async getTeamInvitations(
    @Param('teamId') teamId: string,
    @Query() query: InvitationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationService.getTeamInvitations(teamId, user.sub, query);
  }

  @Post('teams/:teamId/invitations/:invitationId/resend')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '重发邀请' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  @ApiParam({ name: 'invitationId', description: '邀请ID' })
  async resendInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationService.resendInvitation(invitationId, user.sub);
  }

  @Delete('teams/:teamId/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '撤销邀请' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  @ApiParam({ name: 'invitationId', description: '邀请ID' })
  async revokeInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.invitationService.revokeInvitation(invitationId, user.sub);
    return { success: true, message: '邀请已撤销' };
  }

  // ========== 用户邀请操作 ==========

  @Get('invitations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我收到的邀请列表' })
  async getMyInvitations(@Query() query: InvitationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invitationService.getUserInvitations(user.sub, query);
  }

  @Get('invitations/:token')
  @ApiOperation({ summary: '通过 token 获取邀请详情（不需要登录）' })
  @ApiParam({ name: 'token', description: '邀请 token' })
  async getInvitationByToken(@Param('token') token: string) {
    const invitation = await this.invitationService.getInvitationByToken(token);
    // 返回安全的邀请信息（不包含敏感数据）
    return {
      id: invitation.id,
      teamName: invitation.team?.name,
      teamId: invitation.teamId,
      role: invitation.role,
      invitedBy: invitation.invitedBy
        ? {
            name: invitation.invitedBy.name,
            email: invitation.invitedBy.email,
          }
        : null,
      message: invitation.message,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '接受邀请' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto, @CurrentUser() user: AuthenticatedUser) {
    const member = await this.invitationService.acceptInvitation(dto.token, user.sub);
    return {
      success: true,
      message: '已成功加入团队',
      member: {
        id: member.id,
        teamId: member.teamId,
        role: member.role,
      },
    };
  }

  @Post('invitations/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '拒绝邀请' })
  async declineInvitation(@Body() dto: DeclineInvitationDto, @CurrentUser() user: AuthenticatedUser) {
    await this.invitationService.declineInvitation(dto.token, user.sub, dto.reason);
    return { success: true, message: '已拒绝邀请' };
  }

  // ========== 统计 ==========

  @Get('teams/:teamId/invitations/stats')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取团队邀请统计' })
  @ApiParam({ name: 'teamId', description: '团队ID' })
  async getInvitationStats(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { data: pending } = await this.invitationService.getTeamInvitations(
      teamId,
      user.sub,
      { status: 'PENDING' as any, page: 1, limit: 1000 },
    );
    const { data: accepted } = await this.invitationService.getTeamInvitations(
      teamId,
      user.sub,
      { status: 'ACCEPTED' as any, page: 1, limit: 1000 },
    );
    const { data: declined } = await this.invitationService.getTeamInvitations(
      teamId,
      user.sub,
      { status: 'DECLINED' as any, page: 1, limit: 1000 },
    );
    const { data: expired } = await this.invitationService.getTeamInvitations(
      teamId,
      user.sub,
      { status: 'EXPIRED' as any, page: 1, limit: 1000 },
    );

    return {
      pending: pending.length,
      accepted: accepted.length,
      declined: declined.length,
      expired: expired.length,
      total: pending.length + accepted.length + declined.length + expired.length,
    };
  }
}
