import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { TeamService } from './team.service';
import { Team, TeamStatus } from './entities/team.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';
import { UserService } from '../user/user.service';
import { createMockRepository, createMockUserService } from '../../../test/mocks';

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: ReturnType<typeof createMockRepository>;
  let teamMemberRepository: ReturnType<typeof createMockRepository>;
  let userService: ReturnType<typeof createMockUserService>;

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
    ownerId: 'owner-123',
    status: TeamStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'owner-123',
    email: 'owner@example.com',
    name: 'Owner User',
    teamId: 'team-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-123',
    teamId: 'team-123',
    userId: 'user-456',
    role: TeamMemberRole.MEMBER,
    joinedAt: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    teamRepository = createMockRepository();
    teamMemberRepository = createMockRepository();
    userService = createMockUserService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: getRepositoryToken(Team),
          useValue: teamRepository,
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: teamMemberRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  describe('create', () => {
    const createTeamDto = {
      name: 'New Team',
      slug: 'new-team',
    };

    it('should create a team and add owner as member', async () => {
      teamRepository.create.mockReturnValue({ id: 'new-team-id', ...createTeamDto });
      teamRepository.save.mockResolvedValue({ id: 'new-team-id', ...createTeamDto });
      teamMemberRepository.save.mockResolvedValue({});

      const result = await service.create(createTeamDto, 'owner-123');

      expect(teamRepository.create).toHaveBeenCalledWith({
        ...createTeamDto,
        ownerId: 'owner-123',
      });
      expect(teamMemberRepository.save).toHaveBeenCalledWith({
        teamId: 'new-team-id',
        userId: 'owner-123',
        role: TeamMemberRole.OWNER,
      });
      expect(result.id).toBe('new-team-id');
    });
  });

  describe('findAll', () => {
    it('should return all teams with owner info', async () => {
      teamRepository.find.mockResolvedValue([mockTeam]);
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect((result[0] as any).owner).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a team by id with owner info', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('team-123');

      expect(result.id).toBe('team-123');
      expect((result as any).owner.id).toBe('owner-123');
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should set owner to null if owner lookup fails', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockRejectedValue(new Error('User not found'));

      const result = await service.findOne('team-123');

      expect(result.id).toBe('team-123');
      expect((result as any).owner).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a team', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);

      await service.remove('team-123');

      expect(teamRepository.remove).toHaveBeenCalledWith(mockTeam);
    });
  });

  describe('updateStatus', () => {
    it('should update team status', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamRepository.save.mockResolvedValue({ ...mockTeam, status: TeamStatus.SUSPENDED });

      const result = await service.updateStatus('team-123', TeamStatus.SUSPENDED);

      expect(result.status).toBe(TeamStatus.SUSPENDED);
    });
  });

  describe('getMembers', () => {
    it('should return team members', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.find.mockResolvedValue([mockMember]);

      const result = await service.getMembers('team-123');

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(TeamMemberRole.MEMBER);
    });
  });

  describe('inviteMember', () => {
    const inviteMemberDto = {
      email: 'newuser@example.com',
      role: TeamMemberRole.MEMBER,
    };

    it('should invite a new member', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      // Inviter is OWNER
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ role: TeamMemberRole.OWNER, userId: 'owner-123' })
        .mockResolvedValueOnce(null); // User not already member
      userService.findByEmail.mockResolvedValue({ id: 'new-user-id', email: 'newuser@example.com' });
      teamMemberRepository.create.mockReturnValue({ teamId: 'team-123', userId: 'new-user-id' });
      teamMemberRepository.save.mockResolvedValue({ id: 'new-member' });

      const result = await service.inviteMember('team-123', inviteMemberDto, 'owner-123');

      expect(result).toBeDefined();
    });

    it('should throw if inviter has no permission', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne.mockResolvedValue({ role: TeamMemberRole.MEMBER });

      await expect(
        service.inviteMember('team-123', inviteMemberDto, 'user-456'),
      ).rejects.toThrow(new BadRequestException('您没有权限邀请成员'));
    });

    it('should throw if user not found', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne.mockResolvedValue({ role: TeamMemberRole.OWNER });
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.inviteMember('team-123', inviteMemberDto, 'owner-123'),
      ).rejects.toThrow(new NotFoundException('用户不存在'));
    });

    it('should throw if user is already a member', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ role: TeamMemberRole.OWNER })
        .mockResolvedValueOnce({ id: 'existing-member' }); // Already member
      userService.findByEmail.mockResolvedValue({ id: 'existing-user-id' });

      await expect(
        service.inviteMember('team-123', inviteMemberDto, 'owner-123'),
      ).rejects.toThrow(new BadRequestException('该用户已是团队成员'));
    });

    it('should throw if trying to invite role higher than own', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ role: TeamMemberRole.ADMIN, userId: 'admin-123' })
        .mockResolvedValueOnce(null); // Not already member
      userService.findByEmail.mockResolvedValue({ id: 'new-user-id' });

      // ADMIN trying to invite OWNER
      await expect(
        service.inviteMember('team-123', { email: 'newuser@example.com', role: TeamMemberRole.OWNER }, 'admin-123'),
      ).rejects.toThrow(new BadRequestException('不能邀请比自己权限更高或相同的角色'));
    });

    it('should throw if inviter not found', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne.mockResolvedValue(null); // Inviter not a member

      await expect(
        service.inviteMember('team-123', inviteMemberDto, 'non-member'),
      ).rejects.toThrow(new BadRequestException('您没有权限邀请成员'));
    });
  });

  describe('updateMemberRole', () => {
    const updateMemberDto = { role: TeamMemberRole.ADMIN };

    it('should update member role', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce({ role: TeamMemberRole.OWNER });
      teamMemberRepository.save.mockResolvedValue({
        id: 'member-123',
        role: TeamMemberRole.ADMIN,
      });

      const result = await service.updateMemberRole(
        'team-123',
        'member-123',
        updateMemberDto,
        'owner-123',
      );

      expect(result.role).toBe(TeamMemberRole.ADMIN);
    });

    it('should throw if member not found', async () => {
      teamMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('team-123', 'non-existent', updateMemberDto, 'owner-123'),
      ).rejects.toThrow(new NotFoundException('成员不存在'));
    });

    it('should throw if trying to change OWNER role', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', role: TeamMemberRole.OWNER })
        .mockResolvedValueOnce({ role: TeamMemberRole.OWNER });

      await expect(
        service.updateMemberRole('team-123', 'member-123', updateMemberDto, 'owner-123'),
      ).rejects.toThrow(new BadRequestException('不能修改团队所有者的角色'));
    });

    it('should throw if operator has no permission', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce({ role: TeamMemberRole.MEMBER }); // Operator is MEMBER, not ADMIN/OWNER

      await expect(
        service.updateMemberRole('team-123', 'member-123', updateMemberDto, 'user-456'),
      ).rejects.toThrow(new BadRequestException('您没有权限修改成员角色'));
    });

    it('should throw if operator not found', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce(null); // Operator not a member

      await expect(
        service.updateMemberRole('team-123', 'member-123', updateMemberDto, 'non-member'),
      ).rejects.toThrow(new BadRequestException('您没有权限修改成员角色'));
    });

    it('should throw if trying to set role higher than own', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce({ role: TeamMemberRole.ADMIN }); // Operator is ADMIN

      // ADMIN trying to set OWNER role
      await expect(
        service.updateMemberRole('team-123', 'member-123', { role: TeamMemberRole.OWNER }, 'admin-123'),
      ).rejects.toThrow(new BadRequestException('不能设置比自己更高或相同的权限'));
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', userId: 'user-456', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce({ role: TeamMemberRole.OWNER });
      teamMemberRepository.remove.mockResolvedValue({});

      await service.removeMember('team-123', 'member-123', 'owner-123');

      expect(teamMemberRepository.remove).toHaveBeenCalled();
    });

    it('should allow member to remove themselves', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', userId: 'user-456', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce({ role: TeamMemberRole.MEMBER });

      await service.removeMember('team-123', 'member-123', 'user-456');

      expect(teamMemberRepository.remove).toHaveBeenCalled();
    });

    it('should throw if trying to remove OWNER', async () => {
      teamMemberRepository.findOne.mockResolvedValue({
        id: 'owner-member',
        role: TeamMemberRole.OWNER,
      });

      await expect(
        service.removeMember('team-123', 'owner-member', 'admin-123'),
      ).rejects.toThrow(new BadRequestException('不能移除团队所有者'));
    });

    it('should throw if member not found', async () => {
      teamMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember('team-123', 'non-existent', 'owner-123'),
      ).rejects.toThrow(new NotFoundException('成员不存在'));
    });

    it('should throw if operator has no permission', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', userId: 'user-456', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce({ role: TeamMemberRole.MEMBER }); // Operator is MEMBER, not ADMIN/OWNER

      await expect(
        service.removeMember('team-123', 'member-123', 'other-member'),
      ).rejects.toThrow(new BadRequestException('您没有权限移除成员'));
    });

    it('should throw if operator not found', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'member-123', userId: 'user-456', role: TeamMemberRole.MEMBER })
        .mockResolvedValueOnce(null); // Operator not a member

      await expect(
        service.removeMember('team-123', 'member-123', 'non-member'),
      ).rejects.toThrow(new BadRequestException('您没有权限移除成员'));
    });

    it('should throw if trying to remove member with higher role', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'admin-member', userId: 'admin-456', role: TeamMemberRole.ADMIN })
        .mockResolvedValueOnce({ role: TeamMemberRole.MEMBER }); // Operator is MEMBER

      await expect(
        service.removeMember('team-123', 'admin-member', 'member-123'),
      ).rejects.toThrow(new BadRequestException('您没有权限移除成员'));
    });

    it('should throw if trying to remove member with same role', async () => {
      teamMemberRepository.findOne
        .mockResolvedValueOnce({ id: 'admin-member', userId: 'admin-456', role: TeamMemberRole.ADMIN })
        .mockResolvedValueOnce({ role: TeamMemberRole.ADMIN }); // Operator is also ADMIN

      await expect(
        service.removeMember('team-123', 'admin-member', 'other-admin'),
      ).rejects.toThrow(new BadRequestException('不能移除权限更高或相同的成员'));
    });
  });

  describe('getUserTeams', () => {
    it('should return user teams', async () => {
      teamMemberRepository.find.mockResolvedValue([
        { ...mockMember, team: mockTeam },
      ]);

      const result = await service.getUserTeams('user-456');

      expect(result).toHaveLength(1);
      expect(result[0].team).toBeDefined();
    });
  });

  describe('getCurrentTeam', () => {
    it('should return team info when teamId is provided', async () => {
      teamRepository.findOne.mockResolvedValue(mockTeam);
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.getCurrentTeam('user-123', 'team-123');

      expect(result.id).toBe('team-123');
    });

    it('should return personal workspace when no teamId', async () => {
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.getCurrentTeam('owner-123');

      expect(result.isPersonal).toBe(true);
      expect(result.name).toContain('工作区');
    });
  });

  describe('getMemberByUserId', () => {
    it('should return member by userId', async () => {
      teamMemberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.getMemberByUserId('team-123', 'user-456');

      expect(result).toEqual(mockMember);
    });

    it('should return null if member not found', async () => {
      teamMemberRepository.findOne.mockResolvedValue(null);

      const result = await service.getMemberByUserId('team-123', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserTeamMembership', () => {
    it('should return membership with permissions', async () => {
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne.mockResolvedValue({
        ...mockMember,
        role: TeamMemberRole.MEMBER,
        customRole: null,
      });

      const result = await service.getUserTeamMembership('user-456', 'team-123');

      expect(result).toBeDefined();
      expect(result?.teamId).toBe('team-123');
      expect(result?.teamRole).toBe(TeamMemberRole.MEMBER);
      expect(Array.isArray(result?.permissions)).toBe(true);
    });

    it('should return null if no teamId and user has no team', async () => {
      userService.findOne.mockResolvedValue({ ...mockUser, teamId: null });

      const result = await service.getUserTeamMembership('user-123');

      expect(result).toBeNull();
    });

    it('should return null if member not found in team', async () => {
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserTeamMembership('user-456', 'team-123');

      expect(result).toBeNull();
    });

    it('should return custom role permissions if customRole exists', async () => {
      userService.findOne.mockResolvedValue(mockUser);
      teamMemberRepository.findOne.mockResolvedValue({
        ...mockMember,
        role: TeamMemberRole.MEMBER,
        customRole: {
          id: 'custom-role-123',
          name: 'Custom Role',
          permissions: ['links:view', 'links:create', 'custom:permission'],
        },
      });

      const result = await service.getUserTeamMembership('user-456', 'team-123');

      expect(result).toBeDefined();
      expect(result?.permissions).toContain('links:view');
      expect(result?.permissions).toContain('custom:permission');
    });
  });
});
