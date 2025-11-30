import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @ApiOperation({ summary: '创建团队' })
  create(@Body() createTeamDto: CreateTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teamService.create(createTeamDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: '获取所有团队' })
  findAll() {
    return this.teamService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiOperation({ summary: '获取单个团队' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.TEAM_REMOVE)
  @ApiOperation({ summary: '删除团队' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新团队状态（激活/暂停）' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended' },
  ) {
    return this.teamService.updateStatus(id, body.status as any);
  }

  // ========== 成员管理 ==========

  @Get(':id/members')
  @RequirePermissions(Permission.TEAM_VIEW)
  @ApiOperation({ summary: '获取团队成员列表' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  getMembers(@Param('id') id: string) {
    return this.teamService.getMembers(id);
  }

  @Post(':id/members')
  @RequirePermissions(Permission.TEAM_INVITE)
  @ApiOperation({ summary: '邀请成员加入团队' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamService.inviteMember(id, inviteMemberDto, user.sub);
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions(Permission.TEAM_ROLES_MANAGE)
  @ApiOperation({ summary: '更新成员角色' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamService.updateMemberRole(id, memberId, updateMemberDto, user.sub);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(Permission.TEAM_REMOVE)
  @ApiOperation({ summary: '移除成员或退出团队' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamService.removeMember(id, memberId, user.sub);
  }
}
