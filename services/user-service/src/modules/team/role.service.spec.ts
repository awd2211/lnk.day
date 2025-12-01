import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { RoleService } from './role.service';
import { CustomRole, Permission, PRESET_ROLE_PERMISSIONS, PERMISSION_GROUPS } from './entities/custom-role.entity';
import { TeamMember, TeamMemberRole } from './entities/team-member.entity';
import { createMockRepository } from '../../../test/mocks';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: ReturnType<typeof createMockRepository>;
  let memberRepository: ReturnType<typeof createMockRepository>;
  let httpService: jest.Mocked<HttpService>;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockRole: CustomRole = {
    id: 'role-123',
    teamId: 'team-123',
    name: 'Custom Role',
    description: 'A custom role',
    color: '#3B82F6',
    permissions: [Permission.LINKS_VIEW, Permission.LINKS_CREATE],
    isDefault: false,
    canBeDeleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    team: null as any,
  };

  const mockMember: TeamMember = {
    id: 'member-123',
    teamId: 'team-123',
    userId: 'user-123',
    role: TeamMemberRole.MEMBER,
    joinedAt: new Date(),
    team: null as any,
    user: null as any,
  };

  beforeEach(async () => {
    roleRepository = createMockRepository();
    memberRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(CustomRole),
          useValue: roleRepository,
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: memberRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    httpService = module.get(HttpService);

    // Mock console-service response
    mockHttpService.get.mockReturnValue(
      of({
        data: {
          presets: [
            { name: 'ADMIN', permissions: PRESET_ROLE_PERMISSIONS.ADMIN },
            { name: 'MEMBER', permissions: PRESET_ROLE_PERMISSIONS.MEMBER },
            { name: 'VIEWER', permissions: PRESET_ROLE_PERMISSIONS.VIEWER },
          ],
        },
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const dto = {
        name: 'New Role',
        description: 'A new custom role',
        permissions: [Permission.LINKS_VIEW, Permission.LINKS_CREATE],
      };

      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue({ ...mockRole, ...dto });
      roleRepository.save.mockResolvedValue({ ...mockRole, ...dto });

      const result = await service.create('team-123', dto);

      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123', name: 'New Role' },
      });
      expect(roleRepository.create).toHaveBeenCalled();
      expect(result.name).toBe('New Role');
    });

    it('should throw if role name already exists', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      await expect(
        service.create('team-123', { name: 'Custom Role', permissions: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invalid permissions provided', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('team-123', {
          name: 'New Role',
          permissions: ['invalid:permission'] as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other default roles when creating a default role', async () => {
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      roleRepository.create.mockReturnValue({ ...mockRole, isDefault: true });
      roleRepository.save.mockResolvedValue({ ...mockRole, isDefault: true });

      await service.create('team-123', {
        name: 'New Default',
        permissions: [Permission.LINKS_VIEW],
        isDefault: true,
      });

      expect(roleRepository.update).toHaveBeenCalledWith(
        { teamId: 'team-123', isDefault: true },
        { isDefault: false },
      );
    });
  });

  describe('findAll', () => {
    it('should return all roles for a team', async () => {
      roleRepository.find.mockResolvedValue([mockRole]);

      const result = await service.findAll('team-123');

      expect(roleRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.findOne('role-123', 'team-123');

      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'role-123', teamId: 'team-123' },
      });
      expect(result).toEqual(mockRole);
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('role-123', 'team-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce({ ...mockRole }) // findOne for the role itself
        .mockResolvedValueOnce(null); // findOne for name conflict check
      roleRepository.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.update('role-123', 'team-123', {
        name: 'Updated Role',
        permissions: [Permission.LINKS_VIEW],
      });

      expect(result.name).toBe('Updated Role');
    });

    it('should throw if new name conflicts with existing role', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce({ ...mockRole })
        .mockResolvedValueOnce({ ...mockRole, id: 'other-role' });

      await expect(
        service.update('role-123', 'team-123', { name: 'Existing Role' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invalid permissions provided', async () => {
      roleRepository.findOne.mockResolvedValue({ ...mockRole });

      await expect(
        service.update('role-123', 'team-123', {
          permissions: ['invalid:permission'] as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a role', async () => {
      roleRepository.findOne.mockResolvedValue({ ...mockRole });
      memberRepository.count.mockResolvedValue(0);
      roleRepository.remove.mockResolvedValue(mockRole);

      await service.delete('role-123', 'team-123');

      expect(roleRepository.remove).toHaveBeenCalled();
    });

    it('should throw if role cannot be deleted', async () => {
      roleRepository.findOne.mockResolvedValue({ ...mockRole, canBeDeleted: false });

      await expect(service.delete('role-123', 'team-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if members are using the role', async () => {
      roleRepository.findOne.mockResolvedValue({ ...mockRole });
      memberRepository.count.mockResolvedValue(3);

      await expect(service.delete('role-123', 'team-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMemberPermissions', () => {
    it('should return permissions for member with custom role', async () => {
      const memberWithCustomRole = {
        ...mockMember,
        customRoleId: 'role-123',
      };
      memberRepository.findOne.mockResolvedValue(memberWithCustomRole);
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.getMemberPermissions('member-123');

      expect(result).toEqual(mockRole.permissions);
    });

    it('should return preset role permissions for member without custom role', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.getMemberPermissions('member-123');

      // Should return MEMBER preset permissions
      expect(result).toEqual(expect.arrayContaining([Permission.LINKS_VIEW]));
    });

    it('should return empty array if member not found', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      const result = await service.getMemberPermissions('member-123');

      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if member has permission', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.hasPermission('member-123', Permission.LINKS_VIEW);

      expect(result).toBe(true);
    });

    it('should return false if member lacks permission', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.hasPermission('member-123', Permission.BILLING_MANAGE);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if member has any of the permissions', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.hasAnyPermission('member-123', [
        Permission.LINKS_VIEW,
        Permission.BILLING_MANAGE,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if member has none of the permissions', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.hasAnyPermission('member-123', [
        Permission.BILLING_MANAGE,
        Permission.TEAM_ROLES_MANAGE,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if member has all permissions', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.hasAllPermissions('member-123', [
        Permission.LINKS_VIEW,
        Permission.ANALYTICS_VIEW,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if member lacks any permission', async () => {
      memberRepository.findOne.mockResolvedValue(mockMember);

      const result = await service.hasAllPermissions('member-123', [
        Permission.LINKS_VIEW,
        Permission.BILLING_MANAGE,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('initializeDefaultRoles', () => {
    it('should create default roles for new team', async () => {
      roleRepository.count.mockResolvedValue(0);
      roleRepository.create.mockImplementation((data) => data);
      roleRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.initializeDefaultRoles('team-123');

      expect(roleRepository.save).toHaveBeenCalledTimes(3);
    });

    it('should skip if team already has roles', async () => {
      roleRepository.count.mockResolvedValue(2);

      await service.initializeDefaultRoles('team-123');

      expect(roleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getAvailablePermissions', () => {
    it('should return all available permissions and groups', async () => {
      const result = await service.getAvailablePermissions();

      expect(result.permissions).toEqual(Object.values(Permission));
      expect(result.groups).toEqual(PERMISSION_GROUPS);
      expect(result.presets).toBeDefined();
    });
  });

  describe('getDefaultRole', () => {
    it('should return the default role for a team', async () => {
      const defaultRole = { ...mockRole, isDefault: true };
      roleRepository.findOne.mockResolvedValue(defaultRole);

      const result = await service.getDefaultRole('team-123');

      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123', isDefault: true },
      });
      expect(result?.isDefault).toBe(true);
    });

    it('should return null if no default role', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      const result = await service.getDefaultRole('team-123');

      expect(result).toBeNull();
    });
  });

  describe('duplicateRole', () => {
    it('should duplicate a role with new name', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(mockRole) // findOne for source role
        .mockResolvedValueOnce(null); // findOne for name check in create
      roleRepository.create.mockReturnValue({ ...mockRole, name: 'Copy of Custom Role' });
      roleRepository.save.mockResolvedValue({ ...mockRole, name: 'Copy of Custom Role' });

      const result = await service.duplicateRole('role-123', 'team-123', 'Copy of Custom Role');

      expect(result.name).toBe('Copy of Custom Role');
      expect(result.permissions).toEqual(mockRole.permissions);
    });
  });

  describe('invalidatePresetRoleCache', () => {
    it('should refresh the preset role cache', async () => {
      await service.invalidatePresetRoleCache();

      expect(httpService.get).toHaveBeenCalled();
    });

    it('should handle errors gracefully and use defaults', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      await service.invalidatePresetRoleCache();

      // Should not throw, uses defaults
      const result = await service.getAvailablePermissions();
      expect(result.presets).toBeDefined();
    });
  });
});
