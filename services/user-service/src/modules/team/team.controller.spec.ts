import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamStatus } from './entities/team.entity';
import { TeamMemberRole } from './entities/team-member.entity';

describe('TeamController', () => {
  let controller: TeamController;
  let teamService: jest.Mocked<TeamService>;

  const mockTeamService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    getMembers: jest.fn(),
    inviteMember: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    getCurrentTeam: jest.fn(),
  };

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
    ownerId: 'owner-123',
    status: TeamStatus.ACTIVE,
  };

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
    scope: { teamId: 'team-123' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        {
          provide: TeamService,
          useValue: mockTeamService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<TeamController>(TeamController);
    teamService = module.get(TeamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTeamDto = {
      name: 'New Team',
      slug: 'new-team',
    };

    it('should create a team', async () => {
      mockTeamService.create.mockResolvedValue({ id: 'new-team-id', ...createTeamDto });

      const result = await controller.create(createTeamDto, mockUser as any);

      expect(teamService.create).toHaveBeenCalledWith(createTeamDto, 'user-123');
      expect(result).toHaveProperty('id');
    });
  });

  describe('findAll', () => {
    it('should return all teams', async () => {
      mockTeamService.findAll.mockResolvedValue([mockTeam]);

      const result = await controller.findAll();

      expect(teamService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getCurrentTeam', () => {
    it('should return current user team', async () => {
      mockTeamService.getCurrentTeam.mockResolvedValue(mockTeam);

      const result = await controller.getCurrentTeam(mockUser as any);

      expect(teamService.getCurrentTeam).toHaveBeenCalledWith('user-123', 'team-123');
      expect(result.id).toBe('team-123');
    });

    it('should handle user without team', async () => {
      const userWithoutTeam = { sub: 'user-456', email: 'test@test.com', scope: {} };
      mockTeamService.getCurrentTeam.mockResolvedValue({
        id: 'user-456',
        isPersonal: true,
      });

      const result = await controller.getCurrentTeam(userWithoutTeam as any);

      expect(result.isPersonal).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a team by id', async () => {
      mockTeamService.findOne.mockResolvedValue(mockTeam);

      const result = await controller.findOne('team-123');

      expect(teamService.findOne).toHaveBeenCalledWith('team-123');
      expect(result.id).toBe('team-123');
    });
  });

  describe('remove', () => {
    it('should remove a team', async () => {
      mockTeamService.remove.mockResolvedValue(undefined);

      await controller.remove('team-123');

      expect(teamService.remove).toHaveBeenCalledWith('team-123');
    });
  });

  describe('updateStatus', () => {
    it('should update team status', async () => {
      mockTeamService.updateStatus.mockResolvedValue({
        ...mockTeam,
        status: TeamStatus.SUSPENDED,
      });

      const result = await controller.updateStatus('team-123', { status: 'suspended' });

      expect(teamService.updateStatus).toHaveBeenCalledWith('team-123', 'suspended');
      expect(result.status).toBe(TeamStatus.SUSPENDED);
    });
  });

  describe('getMembers', () => {
    it('should return team members', async () => {
      const mockMembers = [
        { id: 'member-1', userId: 'user-1', role: TeamMemberRole.OWNER },
        { id: 'member-2', userId: 'user-2', role: TeamMemberRole.MEMBER },
      ];
      mockTeamService.getMembers.mockResolvedValue(mockMembers);

      const result = await controller.getMembers('team-123');

      expect(teamService.getMembers).toHaveBeenCalledWith('team-123');
      expect(result).toHaveLength(2);
    });
  });

  describe('inviteMember', () => {
    const inviteMemberDto = {
      email: 'newmember@example.com',
      role: TeamMemberRole.MEMBER,
    };

    it('should invite a member', async () => {
      mockTeamService.inviteMember.mockResolvedValue({
        id: 'new-member-id',
        ...inviteMemberDto,
      });

      const result = await controller.inviteMember('team-123', inviteMemberDto, mockUser as any);

      expect(teamService.inviteMember).toHaveBeenCalledWith(
        'team-123',
        inviteMemberDto,
        'user-123',
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateMemberRole', () => {
    const updateMemberDto = { role: TeamMemberRole.ADMIN };

    it('should update member role', async () => {
      mockTeamService.updateMemberRole.mockResolvedValue({
        id: 'member-123',
        role: TeamMemberRole.ADMIN,
      });

      const result = await controller.updateMemberRole(
        'team-123',
        'member-123',
        updateMemberDto,
        mockUser as any,
      );

      expect(teamService.updateMemberRole).toHaveBeenCalledWith(
        'team-123',
        'member-123',
        updateMemberDto,
        'user-123',
      );
      expect(result.role).toBe(TeamMemberRole.ADMIN);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      mockTeamService.removeMember.mockResolvedValue(undefined);

      await controller.removeMember('team-123', 'member-123', mockUser as any);

      expect(teamService.removeMember).toHaveBeenCalledWith(
        'team-123',
        'member-123',
        'user-123',
      );
    });
  });
});
