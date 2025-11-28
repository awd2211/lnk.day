import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

import { TeamInvitation, InvitationStatus } from './entities/team-invitation.entity';
import { Team } from './entities/team.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';
import { User } from '../user/entities/user.entity';
import {
  CreateInvitationDto,
  BulkInviteDto,
  BulkInviteResultDto,
  InvitationQueryDto,
} from './dto/team-invitation.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private readonly frontendUrl: string;
  private readonly invitationExpiryDays = 7;

  constructor(
    @InjectRepository(TeamInvitation)
    private readonly invitationRepository: Repository<TeamInvitation>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:60010');
  }

  // 生成邀请 token
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // 获取角色优先级
  private getRolePriority(role: TeamMemberRole): number {
    const priorities = {
      [TeamMemberRole.VIEWER]: 0,
      [TeamMemberRole.MEMBER]: 1,
      [TeamMemberRole.ADMIN]: 2,
      [TeamMemberRole.OWNER]: 3,
    };
    return priorities[role] || 0;
  }

  // 检查是否可以管理成员
  private canManageMembers(role: TeamMemberRole): boolean {
    return role === TeamMemberRole.OWNER || role === TeamMemberRole.ADMIN;
  }

  // 发送邀请
  async createInvitation(
    teamId: string,
    dto: CreateInvitationDto,
    inviterId: string,
  ): Promise<TeamInvitation> {
    // 验证团队存在
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 验证邀请者权限
    const inviter = await this.memberRepository.findOne({
      where: { teamId, userId: inviterId },
    });
    if (!inviter || !this.canManageMembers(inviter.role)) {
      throw new ForbiddenException('您没有权限邀请成员');
    }

    // 不能邀请比自己权限更高的角色
    const roleToAssign = dto.role || TeamMemberRole.MEMBER;
    if (roleToAssign !== TeamMemberRole.OWNER &&
        this.getRolePriority(roleToAssign) >= this.getRolePriority(inviter.role)) {
      throw new BadRequestException('不能邀请比自己权限更高或相同的角色');
    }

    // 检查用户是否已是成员
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      const existingMember = await this.memberRepository.findOne({
        where: { teamId, userId: existingUser.id },
      });
      if (existingMember) {
        throw new BadRequestException('该用户已是团队成员');
      }
    }

    // 检查是否有未过期的待处理邀请
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        teamId,
        email: dto.email,
        status: InvitationStatus.PENDING,
      },
    });
    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      throw new BadRequestException('该邮箱已有待处理的邀请');
    }

    // 创建邀请
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.invitationExpiryDays);

    const invitation = this.invitationRepository.create({
      teamId,
      email: dto.email,
      token: this.generateToken(),
      role: roleToAssign,
      invitedById: inviterId,
      inviteeId: existingUser?.id,
      expiresAt,
      message: dto.message,
    });

    const saved = await this.invitationRepository.save(invitation);

    // 发送邀请邮件
    await this.sendInvitationEmail(saved, team);

    return saved;
  }

  // 批量邀请
  async bulkInvite(
    teamId: string,
    dto: BulkInviteDto,
    inviterId: string,
  ): Promise<BulkInviteResultDto> {
    const results: BulkInviteResultDto = {
      total: dto.invitations.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    for (const item of dto.invitations) {
      try {
        const invitation = await this.createInvitation(
          teamId,
          {
            email: item.email,
            role: item.role || dto.defaultRole,
            message: dto.message,
          },
          inviterId,
        );
        results.successful++;
        results.results.push({
          email: item.email,
          success: true,
          invitationId: invitation.id,
        });
      } catch (error: any) {
        results.failed++;
        results.results.push({
          email: item.email,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // 发送邀请邮件
  private async sendInvitationEmail(
    invitation: TeamInvitation,
    team: Team,
  ): Promise<void> {
    const inviteLink = `${this.frontendUrl}/invite/${invitation.token}`;

    try {
      await this.emailService.sendTeamInvitationEmail(
        invitation.email,
        team.name,
        inviteLink,
        invitation.message,
      );

      // 更新邮件发送记录
      invitation.emailsSent++;
      invitation.lastEmailSentAt = new Date();
      await this.invitationRepository.save(invitation);

      this.logger.log(`Invitation email sent to ${invitation.email} for team ${team.name}`);
    } catch (error: any) {
      this.logger.error(`Failed to send invitation email: ${error.message}`);
    }
  }

  // 重发邀请
  async resendInvitation(invitationId: string, operatorId: string): Promise<TeamInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['team'],
    });

    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }

    // 验证权限
    const operator = await this.memberRepository.findOne({
      where: { teamId: invitation.teamId, userId: operatorId },
    });
    if (!operator || !this.canManageMembers(operator.role)) {
      throw new ForbiddenException('您没有权限重发邀请');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('只能重发待处理的邀请');
    }

    // 更新过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.invitationExpiryDays);
    invitation.expiresAt = expiresAt;

    await this.invitationRepository.save(invitation);

    // 重发邮件
    await this.sendInvitationEmail(invitation, invitation.team);

    return invitation;
  }

  // 撤销邀请
  async revokeInvitation(invitationId: string, operatorId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }

    // 验证权限
    const operator = await this.memberRepository.findOne({
      where: { teamId: invitation.teamId, userId: operatorId },
    });
    if (!operator || !this.canManageMembers(operator.role)) {
      throw new ForbiddenException('您没有权限撤销邀请');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('只能撤销待处理的邀请');
    }

    invitation.status = InvitationStatus.REVOKED;
    await this.invitationRepository.save(invitation);
  }

  // 通过 token 获取邀请详情
  async getInvitationByToken(token: string): Promise<TeamInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['team', 'invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('邀请不存在或已过期');
    }

    return invitation;
  }

  // 接受邀请
  async acceptInvitation(token: string, userId: string): Promise<TeamMember> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['team'],
    });

    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }

    // 获取用户信息
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证邀请是否发给当前用户
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('此邀请不是发给您的');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`邀请已${this.getStatusText(invitation.status)}`);
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('邀请已过期');
    }

    // 检查是否已是成员
    const existingMember = await this.memberRepository.findOne({
      where: { teamId: invitation.teamId, userId },
    });
    if (existingMember) {
      throw new BadRequestException('您已是该团队成员');
    }

    // 创建成员记录
    const member = this.memberRepository.create({
      teamId: invitation.teamId,
      userId,
      role: invitation.role,
    });
    const savedMember = await this.memberRepository.save(member);

    // 更新邀请状态
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.respondedAt = new Date();
    invitation.inviteeId = userId;
    await this.invitationRepository.save(invitation);

    // 发送通知给邀请人
    await this.notifyInviterOfAcceptance(invitation, user);

    return savedMember;
  }

  // 拒绝邀请
  async declineInvitation(token: string, userId: string, reason?: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }

    // 获取用户信息
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证邀请是否发给当前用户
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('此邀请不是发给您的');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`邀请已${this.getStatusText(invitation.status)}`);
    }

    // 更新邀请状态
    invitation.status = InvitationStatus.DECLINED;
    invitation.respondedAt = new Date();
    invitation.inviteeId = userId;
    await this.invitationRepository.save(invitation);

    this.logger.log(`User ${user.email} declined invitation to team ${invitation.teamId}`);
  }

  // 获取团队的邀请列表
  async getTeamInvitations(
    teamId: string,
    operatorId: string,
    query: InvitationQueryDto,
  ): Promise<{ data: TeamInvitation[]; total: number }> {
    // 验证权限
    const operator = await this.memberRepository.findOne({
      where: { teamId, userId: operatorId },
    });
    if (!operator || !this.canManageMembers(operator.role)) {
      throw new ForbiddenException('您没有权限查看邀请列表');
    }

    const where: any = { teamId };
    if (query.status) {
      where.status = query.status;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [data, total] = await this.invitationRepository.findAndCount({
      where,
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  // 获取用户收到的邀请列表
  async getUserInvitations(
    userId: string,
    query: InvitationQueryDto,
  ): Promise<{ data: TeamInvitation[]; total: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const where: any = { email: user.email };
    if (query.status) {
      where.status = query.status;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [data, total] = await this.invitationRepository.findAndCount({
      where,
      relations: ['team', 'invitedBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  // 清理过期邀请
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.invitationRepository.update(
      {
        status: InvitationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: InvitationStatus.EXPIRED },
    );

    this.logger.log(`Cleaned up ${result.affected} expired invitations`);
    return result.affected || 0;
  }

  // 辅助方法
  private getStatusText(status: InvitationStatus): string {
    const texts = {
      [InvitationStatus.ACCEPTED]: '被接受',
      [InvitationStatus.DECLINED]: '被拒绝',
      [InvitationStatus.EXPIRED]: '过期',
      [InvitationStatus.REVOKED]: '被撤销',
      [InvitationStatus.PENDING]: '待处理',
    };
    return texts[status] || status;
  }

  private async notifyInviterOfAcceptance(
    invitation: TeamInvitation,
    user: User,
  ): Promise<void> {
    try {
      const inviter = await this.userRepository.findOne({
        where: { id: invitation.invitedById },
      });
      if (inviter) {
        await this.emailService.sendInvitationAcceptedEmail(
          inviter.email,
          user.name || user.email,
          invitation.team?.name || 'Unknown Team',
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to notify inviter: ${error.message}`);
    }
  }
}
