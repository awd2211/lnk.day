import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InvitationService } from './invitation.service';
import { TeamInvitation, InvitationStatus } from './entities/team-invitation.entity';
import { Team } from './entities/team.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';
import { User } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';
import { createMockRepository, createMockEmailService, createMockConfigService } from '../../../test/mocks';

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: ReturnType<typeof createMockRepository>;
  let teamRepository: ReturnType<typeof createMockRepository>;
  let memberRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let emailService: ReturnType<typeof createMockEmailService>;

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
    ownerId: 'owner-123',
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockInviter = {
    id: 'inviter-123',
    email: 'inviter@example.com',
    name: 'Inviter',
  };

  const mockOwnerMember = {
    id: 'member-owner',
    teamId: 'team-123',
    userId: 'owner-123',
    role: TeamMemberRole.OWNER,
  };

  const mockAdminMember = {
    id: 'member-admin',
    teamId: 'team-123',
    userId: 'admin-123',
    role: TeamMemberRole.ADMIN,
  };

  const mockRegularMember = {
    id: 'member-regular',
    teamId: 'team-123',
    userId: 'user-456',
    role: TeamMemberRole.MEMBER,
  };

  const mockInvitation = {
    id: 'invitation-123',
    teamId: 'team-123',
    email: 'invited@example.com',
    token: 'valid-token',
    role: TeamMemberRole.MEMBER,
    invitedById: 'owner-123',
    inviteeId: null,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    emailsSent: 1,
    lastEmailSentAt: new Date(),
    team: mockTeam,
    invitedBy: mockInviter,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    invitationRepository = createMockRepository();
    teamRepository = createMockRepository();
    memberRepository = createMockRepository();
    userRepository = createMockRepository();
    emailService = createMockEmailService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: getRepositoryToken(TeamInvitation),
          useValue: invitationRepository,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: teamRepository,
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: memberRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            FRONTEND_URL: 'http://localhost:60010',
          }),
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    const createDto = {
      email: 'newuser@example.com',
      role: TeamMemberRole.MEMBER,
      message: 'Welcome to the team!',
    };

    it('should create an invitation successfully', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      invitationRepository.findOne.mockResolvedValue(null); // No existing invitation
      invitationRepository.create.mockReturnValue({ ...mockInvitation, email: createDto.email });
      invitationRepository.save.mockResolvedValue({ ...mockInvitation, email: createDto.email });

      const result = await service.createInvitation('team-123', createDto, 'owner-123');

      expect(teamRepository.findOne).toHaveBeenCalledWith({ where: { id: 'team-123' } });
      expect(invitationRepository.create).toHaveBeenCalled();
      expect(emailService.sendTeamInvitationEmail).toHaveBeenCalled();
      expect(result.email).toBe(createDto.email);
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepository.findOne.mockResolvedValue(null);

      await expect(service.createInvitation('team-123', createDto, 'owner-123')).rejects.toThrow(
        new NotFoundException('团队不存在'),
      );
    });

    it('should throw ForbiddenException if inviter has no permission', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockRegularMember);

      await expect(service.createInvitation('team-123', createDto, 'user-456')).rejects.toThrow(
        new ForbiddenException('您没有权限邀请成员'),
      );
    });

    it('should throw BadRequestException if inviting higher role', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockAdminMember);

      const adminInviteDto = { ...createDto, role: TeamMemberRole.ADMIN };

      await expect(service.createInvitation('team-123', adminInviteDto, 'admin-123')).rejects.toThrow(
        new BadRequestException('不能邀请比自己权限更高或相同的角色'),
      );
    });

    it('should throw BadRequestException if user is already a member', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne
        .mockResolvedValueOnce(mockOwnerMember) // inviter check
        .mockResolvedValueOnce(mockRegularMember); // existing member check
      userRepository.findOne.mockResolvedValue({ id: 'user-456', email: createDto.email });

      await expect(service.createInvitation('team-123', createDto, 'owner-123')).rejects.toThrow(
        new BadRequestException('该用户已是团队成员'),
      );
    });

    it('should throw BadRequestException if pending invitation exists', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      userRepository.findOne.mockResolvedValue(null);
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: createDto.email,
        expiresAt: new Date(Date.now() + 86400000), // Not expired
      });

      await expect(service.createInvitation('team-123', createDto, 'owner-123')).rejects.toThrow(
        new BadRequestException('该邮箱已有待处理的邀请'),
      );
    });

    it('should still create invitation even if email sending fails', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      userRepository.findOne.mockResolvedValue(null);
      invitationRepository.findOne.mockResolvedValue(null);
      invitationRepository.create.mockReturnValue({ ...mockInvitation, email: createDto.email });
      invitationRepository.save.mockResolvedValue({ ...mockInvitation, email: createDto.email });
      emailService.sendTeamInvitationEmail.mockRejectedValue(new Error('Email service unavailable'));

      const result = await service.createInvitation('team-123', createDto, 'owner-123');

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(invitationRepository.save).toHaveBeenCalled();
    });
  });

  describe('bulkInvite', () => {
    it('should handle bulk invitations', async () => {
      const bulkDto = {
        invitations: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
        defaultRole: TeamMemberRole.MEMBER,
        message: 'Join us!',
      };

      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      userRepository.findOne.mockResolvedValue(null);
      invitationRepository.findOne.mockResolvedValue(null);
      invitationRepository.create.mockReturnValue(mockInvitation);
      invitationRepository.save.mockResolvedValue(mockInvitation);

      const result = await service.bulkInvite('team-123', bulkDto, 'owner-123');

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures in bulk invite', async () => {
      const bulkDto = {
        invitations: [
          { email: 'user1@example.com' },
          { email: 'existing@example.com' },
        ],
        defaultRole: TeamMemberRole.MEMBER,
      };

      teamRepository.findOne.mockResolvedValue(mockTeam);
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-user', email: 'existing@example.com' });
      invitationRepository.findOne.mockResolvedValue(null);
      invitationRepository.create.mockReturnValue(mockInvitation);
      invitationRepository.save.mockResolvedValue(mockInvitation);
      memberRepository.findOne
        .mockResolvedValueOnce(mockOwnerMember)
        .mockResolvedValueOnce(mockOwnerMember)
        .mockResolvedValueOnce({ userId: 'existing-user' }); // Second user is already member

      const result = await service.bulkInvite('team-123', bulkDto, 'owner-123');

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation', async () => {
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.PENDING,
      });
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      invitationRepository.save.mockResolvedValue(mockInvitation);

      const result = await service.resendInvitation('invitation-123', 'owner-123');

      expect(emailService.sendTeamInvitationEmail).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(service.resendInvitation('non-existent', 'owner-123')).rejects.toThrow(
        new NotFoundException('邀请不存在'),
      );
    });

    it('should throw ForbiddenException if no permission', async () => {
      invitationRepository.findOne.mockResolvedValue(mockInvitation);
      memberRepository.findOne.mockResolvedValue(mockRegularMember);

      await expect(service.resendInvitation('invitation-123', 'user-456')).rejects.toThrow(
        new ForbiddenException('您没有权限重发邀请'),
      );
    });

    it('should throw BadRequestException if invitation not pending', async () => {
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);

      await expect(service.resendInvitation('invitation-123', 'owner-123')).rejects.toThrow(
        new BadRequestException('只能重发待处理的邀请'),
      );
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation', async () => {
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.PENDING,
      });
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      invitationRepository.save.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.REVOKED,
      });

      await service.revokeInvitation('invitation-123', 'owner-123');

      expect(invitationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.REVOKED }),
      );
    });

    it('should throw NotFoundException if invitation not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeInvitation('non-existent', 'owner-123')).rejects.toThrow(
        new NotFoundException('邀请不存在'),
      );
    });

    it('should throw ForbiddenException if operator not found', async () => {
      invitationRepository.findOne.mockResolvedValue(mockInvitation);
      memberRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeInvitation('invitation-123', 'non-member')).rejects.toThrow(
        new ForbiddenException('您没有权限撤销邀请'),
      );
    });

    it('should throw BadRequestException if invitation not pending', async () => {
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      });
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);

      await expect(service.revokeInvitation('invitation-123', 'owner-123')).rejects.toThrow(
        new BadRequestException('只能撤销待处理的邀请'),
      );
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation by token', async () => {
      invitationRepository.findOne.mockResolvedValue(mockInvitation);

      const result = await service.getInvitationByToken('valid-token');

      expect(result.token).toBe('valid-token');
    });

    it('should throw NotFoundException if not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(service.getInvitationByToken('invalid-token')).rejects.toThrow(
        new NotFoundException('邀请不存在或已过期'),
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and create member', async () => {
      const user = { id: 'user-123', email: 'invited@example.com', name: 'Invited User' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
      });
      userRepository.findOne.mockResolvedValue(user);
      memberRepository.findOne.mockResolvedValue(null); // Not already a member
      memberRepository.create.mockReturnValue({ teamId: 'team-123', userId: user.id });
      memberRepository.save.mockResolvedValue({ id: 'new-member', teamId: 'team-123', userId: user.id });
      invitationRepository.save.mockResolvedValue({});

      const result = await service.acceptInvitation('valid-token', 'user-123');

      expect(memberRepository.save).toHaveBeenCalled();
      expect(invitationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(service.acceptInvitation('invalid-token', 'user-123')).rejects.toThrow(
        new NotFoundException('邀请不存在'),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      invitationRepository.findOne.mockResolvedValue(mockInvitation);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.acceptInvitation('valid-token', 'user-123')).rejects.toThrow(
        new NotFoundException('用户不存在'),
      );
    });

    it('should throw ForbiddenException if email mismatch', async () => {
      const user = { id: 'user-123', email: 'other@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.acceptInvitation('valid-token', 'user-123')).rejects.toThrow(
        new ForbiddenException('此邀请不是发给您的'),
      );
    });

    it('should throw BadRequestException if invitation expired', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        expiresAt: new Date(Date.now() - 86400000), // Expired
      });
      userRepository.findOne.mockResolvedValue(user);
      invitationRepository.save.mockResolvedValue({});

      await expect(service.acceptInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('邀请已过期'),
      );
    });

    it('should throw BadRequestException if already a member', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
      });
      userRepository.findOne.mockResolvedValue(user);
      memberRepository.findOne.mockResolvedValue({ id: 'existing-member' }); // Already a member

      await expect(service.acceptInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('您已是该团队成员'),
      );
    });

    it('should throw BadRequestException if invitation already accepted', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        status: InvitationStatus.ACCEPTED,
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.acceptInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('邀请已被接受'),
      );
    });

    it('should send notification when accepting invitation and handle notification error', async () => {
      const user = { id: 'user-123', email: 'invited@example.com', name: 'Invited User' };
      const inviter = { id: 'inviter-123', email: 'inviter@example.com', name: 'Inviter' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        invitedById: inviter.id,
        team: mockTeam,
      });
      userRepository.findOne
        .mockResolvedValueOnce(user) // First call for user
        .mockResolvedValueOnce(inviter); // Second call for inviter in notifyInviterOfAcceptance
      memberRepository.findOne.mockResolvedValue(null); // Not already a member
      memberRepository.create.mockReturnValue({ teamId: 'team-123', userId: user.id });
      memberRepository.save.mockResolvedValue({ id: 'new-member', teamId: 'team-123', userId: user.id });
      invitationRepository.save.mockResolvedValue({});
      emailService.sendInvitationAcceptedEmail.mockRejectedValue(new Error('Email service down'));

      // Should not throw even if notification fails
      const result = await service.acceptInvitation('valid-token', 'user-123');
      expect(result).toBeDefined();
    });
  });

  describe('declineInvitation', () => {
    it('should decline invitation', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
      });
      userRepository.findOne.mockResolvedValue(user);
      invitationRepository.save.mockResolvedValue({});

      await service.declineInvitation('valid-token', 'user-123', 'Not interested');

      expect(invitationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.DECLINED }),
      );
    });

    it('should throw NotFoundException if invitation not found', async () => {
      invitationRepository.findOne.mockResolvedValue(null);

      await expect(service.declineInvitation('invalid-token', 'user-123')).rejects.toThrow(
        new NotFoundException('邀请不存在'),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      invitationRepository.findOne.mockResolvedValue(mockInvitation);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.declineInvitation('valid-token', 'user-123')).rejects.toThrow(
        new NotFoundException('用户不存在'),
      );
    });

    it('should throw ForbiddenException if email mismatch', async () => {
      const user = { id: 'user-123', email: 'other@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.declineInvitation('valid-token', 'user-123')).rejects.toThrow(
        new ForbiddenException('此邀请不是发给您的'),
      );
    });

    it('should throw BadRequestException if invitation not pending (accepted)', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        status: InvitationStatus.ACCEPTED,
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.declineInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('邀请已被接受'),
      );
    });

    it('should throw BadRequestException if invitation not pending (declined)', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        status: InvitationStatus.DECLINED,
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.declineInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('邀请已被拒绝'),
      );
    });

    it('should throw BadRequestException if invitation revoked', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        status: InvitationStatus.REVOKED,
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.declineInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('邀请已被撤销'),
      );
    });

    it('should throw BadRequestException if invitation expired', async () => {
      const user = { id: 'user-123', email: 'invited@example.com' };
      invitationRepository.findOne.mockResolvedValue({
        ...mockInvitation,
        email: 'invited@example.com',
        status: InvitationStatus.EXPIRED,
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.declineInvitation('valid-token', 'user-123')).rejects.toThrow(
        new BadRequestException('邀请已过期'),
      );
    });
  });

  describe('getTeamInvitations', () => {
    it('should return team invitations', async () => {
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      invitationRepository.findAndCount.mockResolvedValue([[mockInvitation], 1]);

      const result = await service.getTeamInvitations('team-123', 'owner-123', {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      memberRepository.findOne.mockResolvedValue(mockOwnerMember);
      invitationRepository.findAndCount.mockResolvedValue([[mockInvitation], 1]);

      await service.getTeamInvitations('team-123', 'owner-123', { status: InvitationStatus.PENDING });

      expect(invitationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: InvitationStatus.PENDING }),
        }),
      );
    });

    it('should throw ForbiddenException if no permission', async () => {
      memberRepository.findOne.mockResolvedValue(mockRegularMember);

      await expect(service.getTeamInvitations('team-123', 'user-456', {})).rejects.toThrow(
        new ForbiddenException('您没有权限查看邀请列表'),
      );
    });
  });

  describe('getUserInvitations', () => {
    it('should return user invitations', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      invitationRepository.findAndCount.mockResolvedValue([[mockInvitation], 1]);

      const result = await service.getUserInvitations('user-123', {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      invitationRepository.findAndCount.mockResolvedValue([[mockInvitation], 1]);

      await service.getUserInvitations('user-123', { status: InvitationStatus.ACCEPTED });

      expect(invitationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserInvitations('non-existent', {})).rejects.toThrow(
        new NotFoundException('用户不存在'),
      );
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should cleanup expired invitations', async () => {
      invitationRepository.update.mockResolvedValue({ affected: 5, raw: {}, generatedMaps: [] });

      const result = await service.cleanupExpiredInvitations();

      expect(result).toBe(5);
      expect(invitationRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.PENDING }),
        { status: InvitationStatus.EXPIRED },
      );
    });
  });
});
