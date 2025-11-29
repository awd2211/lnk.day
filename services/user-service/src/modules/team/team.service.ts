import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Team } from './entities/team.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async create(createTeamDto: CreateTeamDto, ownerId: string): Promise<Team> {
    const team = this.teamRepository.create({
      ...createTeamDto,
      ownerId,
    });
    const savedTeam = await this.teamRepository.save(team);

    // 自动将创建者添加为团队 OWNER
    await this.teamMemberRepository.save({
      teamId: savedTeam.id,
      userId: ownerId,
      role: TeamMemberRole.OWNER,
    });

    return savedTeam;
  }

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find();
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return team;
  }

  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.remove(team);
  }

  // ========== 成员管理 ==========

  async getMembers(teamId: string): Promise<TeamMember[]> {
    await this.findOne(teamId); // 确保团队存在
    return this.teamMemberRepository.find({
      where: { teamId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async inviteMember(
    teamId: string,
    inviteMemberDto: InviteMemberDto,
    inviterId: string,
  ): Promise<TeamMember> {
    const team = await this.findOne(teamId);

    // 检查邀请者是否有权限
    const inviter = await this.teamMemberRepository.findOne({
      where: { teamId, userId: inviterId },
    });
    if (!inviter || !this.canManageMembers(inviter.role)) {
      throw new BadRequestException('您没有权限邀请成员');
    }

    // 查找被邀请用户
    const user = await this.userService.findByEmail(inviteMemberDto.email);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户是否已是成员
    const existingMember = await this.teamMemberRepository.findOne({
      where: { teamId, userId: user.id },
    });
    if (existingMember) {
      throw new BadRequestException('该用户已是团队成员');
    }

    // 不能邀请比自己权限更高的角色
    const roleToAssign = inviteMemberDto.role || TeamMemberRole.MEMBER;
    if (this.getRolePriority(roleToAssign) >= this.getRolePriority(inviter.role)) {
      throw new BadRequestException('不能邀请比自己权限更高或相同的角色');
    }

    const member = this.teamMemberRepository.create({
      teamId,
      userId: user.id,
      role: inviteMemberDto.role || TeamMemberRole.MEMBER,
    });

    return this.teamMemberRepository.save(member);
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    updateMemberDto: UpdateMemberDto,
    operatorId: string,
  ): Promise<TeamMember> {
    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 检查操作者权限
    const operator = await this.teamMemberRepository.findOne({
      where: { teamId, userId: operatorId },
    });
    if (!operator || !this.canManageMembers(operator.role)) {
      throw new BadRequestException('您没有权限修改成员角色');
    }

    // 不能修改 OWNER 的角色
    if (member.role === TeamMemberRole.OWNER) {
      throw new BadRequestException('不能修改团队所有者的角色');
    }

    // 不能设置比自己更高的权限
    if (this.getRolePriority(updateMemberDto.role) >= this.getRolePriority(operator.role)) {
      throw new BadRequestException('不能设置比自己更高或相同的权限');
    }

    member.role = updateMemberDto.role;
    return this.teamMemberRepository.save(member);
  }

  async removeMember(
    teamId: string,
    memberId: string,
    operatorId: string,
  ): Promise<void> {
    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 不能移除 OWNER
    if (member.role === TeamMemberRole.OWNER) {
      throw new BadRequestException('不能移除团队所有者');
    }

    // 检查操作者权限
    const operator = await this.teamMemberRepository.findOne({
      where: { teamId, userId: operatorId },
    });

    // 允许自己退出团队
    if (member.userId === operatorId) {
      await this.teamMemberRepository.remove(member);
      return;
    }

    if (!operator || !this.canManageMembers(operator.role)) {
      throw new BadRequestException('您没有权限移除成员');
    }

    // 不能移除权限更高的成员
    if (this.getRolePriority(member.role) >= this.getRolePriority(operator.role)) {
      throw new BadRequestException('不能移除权限更高或相同的成员');
    }

    await this.teamMemberRepository.remove(member);
  }

  async getUserTeams(userId: string): Promise<TeamMember[]> {
    return this.teamMemberRepository.find({
      where: { userId },
      relations: ['team'],
    });
  }

  // ========== 辅助方法 ==========

  private canManageMembers(role: TeamMemberRole): boolean {
    return role === TeamMemberRole.OWNER || role === TeamMemberRole.ADMIN;
  }

  private getRolePriority(role: TeamMemberRole): number {
    const priorities = {
      [TeamMemberRole.VIEWER]: 0,
      [TeamMemberRole.MEMBER]: 1,
      [TeamMemberRole.ADMIN]: 2,
      [TeamMemberRole.OWNER]: 3,
    };
    return priorities[role] || 0;
  }

  // ========== 权限相关 ==========

  /**
   * 获取用户在指定团队的成员信息
   */
  async getMemberByUserId(teamId: string, userId: string): Promise<TeamMember | null> {
    return this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['customRole'],
    });
  }

  /**
   * 获取用户的当前团队成员身份（通过 user.teamId）
   */
  async getUserTeamMembership(userId: string, teamId?: string): Promise<{
    teamId: string | null;
    teamRole: TeamMemberRole | null;
    permissions: string[];
  } | null> {
    // 如果没有指定 teamId，尝试从用户获取
    if (!teamId) {
      const user = await this.userService.findOne(userId);
      teamId = user?.teamId;
    }

    if (!teamId) {
      return null;
    }

    const member = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['customRole'],
    });

    if (!member) {
      return null;
    }

    // 获取权限
    let permissions: string[] = [];

    if (member.customRole) {
      // 使用自定义角色的权限
      permissions = member.customRole.permissions || [];
    } else {
      // 使用预设角色权限
      const { PRESET_ROLE_PERMISSIONS } = await import('./entities/custom-role.entity');
      permissions = PRESET_ROLE_PERMISSIONS[member.role] || [];
    }

    return {
      teamId,
      teamRole: member.role,
      permissions,
    };
  }
}
