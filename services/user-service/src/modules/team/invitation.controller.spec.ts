import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { TeamMemberRole } from './entities/team-member.entity';
import { InvitationStatus } from './entities/team-invitation.entity';

describe('InvitationController', () => {
  let controller: InvitationController;
  let invitationService: jest.Mocked<InvitationService>;

  const mockInvitationService = {
    createInvitation: jest.fn(),
    bulkInvite: jest.fn(),
    getTeamInvitations: jest.fn(),
    resendInvitation: jest.fn(),
    revokeInvitation: jest.fn(),
    getUserInvitations: jest.fn(),
    getInvitationByToken: jest.fn(),
    acceptInvitation: jest.fn(),
    declineInvitation: jest.fn(),
  };

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
    type: 'user',
    scope: { level: 'team', teamId: 'team-123' },
  };

  const mockInvitation = {
    id: 'invitation-123',
    teamId: 'team-123',
    email: 'invited@example.com',
    token: 'valid-token',
    role: TeamMemberRole.MEMBER,
    invitedById: 'user-123',
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    team: { id: 'team-123', name: 'Test Team' },
    invitedBy: { id: 'user-123', name: 'Inviter', email: 'inviter@example.com' },
    message: 'Join our team!',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [
        {
          provide: InvitationService,
          useValue: mockInvitationService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<InvitationController>(InvitationController);
    invitationService = module.get(InvitationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    const createDto = {
      email: 'newuser@example.com',
      role: TeamMemberRole.MEMBER,
      message: 'Welcome!',
    };

    it('should create an invitation', async () => {
      mockInvitationService.createInvitation.mockResolvedValue({
        ...mockInvitation,
        email: createDto.email,
      });

      const result = await controller.createInvitation('team-123', createDto, mockUser as any);

      expect(invitationService.createInvitation).toHaveBeenCalledWith('team-123', createDto, 'user-123');
      expect(result.email).toBe(createDto.email);
    });
  });

  describe('bulkInvite', () => {
    const bulkDto = {
      invitations: [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ],
      defaultRole: TeamMemberRole.MEMBER,
      message: 'Join us!',
    };

    it('should handle bulk invitations', async () => {
      const bulkResult = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { email: 'user1@example.com', success: true, invitationId: 'inv-1' },
          { email: 'user2@example.com', success: true, invitationId: 'inv-2' },
        ],
      };
      mockInvitationService.bulkInvite.mockResolvedValue(bulkResult);

      const result = await controller.bulkInvite('team-123', bulkDto, mockUser as any);

      expect(invitationService.bulkInvite).toHaveBeenCalledWith('team-123', bulkDto, 'user-123');
      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
    });
  });

  describe('getTeamInvitations', () => {
    it('should return team invitations', async () => {
      mockInvitationService.getTeamInvitations.mockResolvedValue({
        data: [mockInvitation],
        total: 1,
      });

      const result = await controller.getTeamInvitations('team-123', {}, mockUser as any);

      expect(invitationService.getTeamInvitations).toHaveBeenCalledWith('team-123', 'user-123', {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      const query = { status: InvitationStatus.PENDING };
      mockInvitationService.getTeamInvitations.mockResolvedValue({
        data: [mockInvitation],
        total: 1,
      });

      await controller.getTeamInvitations('team-123', query, mockUser as any);

      expect(invitationService.getTeamInvitations).toHaveBeenCalledWith('team-123', 'user-123', query);
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation', async () => {
      mockInvitationService.resendInvitation.mockResolvedValue(mockInvitation);

      const result = await controller.resendInvitation('invitation-123', mockUser as any);

      expect(invitationService.resendInvitation).toHaveBeenCalledWith('invitation-123', 'user-123');
      expect(result).toBeDefined();
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation', async () => {
      mockInvitationService.revokeInvitation.mockResolvedValue(undefined);

      const result = await controller.revokeInvitation('invitation-123', mockUser as any);

      expect(invitationService.revokeInvitation).toHaveBeenCalledWith('invitation-123', 'user-123');
      expect(result).toEqual({ success: true, message: '邀请已撤销' });
    });
  });

  describe('getMyInvitations', () => {
    it('should return user invitations', async () => {
      mockInvitationService.getUserInvitations.mockResolvedValue({
        data: [mockInvitation],
        total: 1,
      });

      const result = await controller.getMyInvitations({}, mockUser as any);

      expect(invitationService.getUserInvitations).toHaveBeenCalledWith('user-123', {});
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation details by token', async () => {
      mockInvitationService.getInvitationByToken.mockResolvedValue(mockInvitation);

      const result = await controller.getInvitationByToken('valid-token');

      expect(invitationService.getInvitationByToken).toHaveBeenCalledWith('valid-token');
      expect(result.id).toBe('invitation-123');
      expect(result.teamName).toBe('Test Team');
      expect(result.invitedBy).toEqual({
        name: 'Inviter',
        email: 'inviter@example.com',
      });
    });

    it('should handle invitation without inviter', async () => {
      mockInvitationService.getInvitationByToken.mockResolvedValue({
        ...mockInvitation,
        invitedBy: null,
      });

      const result = await controller.getInvitationByToken('valid-token');

      expect(result.invitedBy).toBeNull();
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and return member info', async () => {
      const member = {
        id: 'member-123',
        teamId: 'team-123',
        userId: 'user-123',
        role: TeamMemberRole.MEMBER,
      };
      mockInvitationService.acceptInvitation.mockResolvedValue(member);

      const result = await controller.acceptInvitation({ token: 'valid-token' }, mockUser as any);

      expect(invitationService.acceptInvitation).toHaveBeenCalledWith('valid-token', 'user-123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('已成功加入团队');
      expect(result.member).toEqual({
        id: 'member-123',
        teamId: 'team-123',
        role: TeamMemberRole.MEMBER,
      });
    });
  });

  describe('declineInvitation', () => {
    it('should decline invitation', async () => {
      mockInvitationService.declineInvitation.mockResolvedValue(undefined);

      const result = await controller.declineInvitation(
        { token: 'valid-token', reason: 'Not interested' },
        mockUser as any,
      );

      expect(invitationService.declineInvitation).toHaveBeenCalledWith('valid-token', 'user-123', 'Not interested');
      expect(result).toEqual({ success: true, message: '已拒绝邀请' });
    });

    it('should decline invitation without reason', async () => {
      mockInvitationService.declineInvitation.mockResolvedValue(undefined);

      const result = await controller.declineInvitation({ token: 'valid-token' }, mockUser as any);

      expect(invitationService.declineInvitation).toHaveBeenCalledWith('valid-token', 'user-123', undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('getInvitationStats', () => {
    it('should return invitation stats', async () => {
      mockInvitationService.getTeamInvitations
        .mockResolvedValueOnce({ data: [mockInvitation, mockInvitation], total: 2 }) // pending
        .mockResolvedValueOnce({ data: [mockInvitation], total: 1 }) // accepted
        .mockResolvedValueOnce({ data: [], total: 0 }) // declined
        .mockResolvedValueOnce({ data: [], total: 0 }); // expired

      const result = await controller.getInvitationStats('team-123', mockUser as any);

      expect(invitationService.getTeamInvitations).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        pending: 2,
        accepted: 1,
        declined: 0,
        expired: 0,
        total: 3,
      });
    });
  });
});
