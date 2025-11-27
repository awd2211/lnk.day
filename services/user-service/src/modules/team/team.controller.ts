import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @ApiOperation({ summary: '创建团队' })
  create(@Body() createTeamDto: CreateTeamDto, @Request() req: any) {
    return this.teamService.create(createTeamDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取所有团队' })
  findAll() {
    return this.teamService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个团队' })
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除团队' })
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }

  // ========== 成员管理 ==========

  @Get(':id/members')
  @ApiOperation({ summary: '获取团队成员列表' })
  getMembers(@Param('id') id: string) {
    return this.teamService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: '邀请成员加入团队' })
  inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Request() req: any,
  ) {
    return this.teamService.inviteMember(id, inviteMemberDto, req.user.id);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: '更新成员角色' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @Request() req: any,
  ) {
    return this.teamService.updateMemberRole(id, memberId, updateMemberDto, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: '移除成员或退出团队' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.teamService.removeMember(id, memberId, req.user.id);
  }
}
