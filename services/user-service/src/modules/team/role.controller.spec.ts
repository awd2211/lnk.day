import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { Permission, PRESET_ROLE_PERMISSIONS, PERMISSION_GROUPS } from './entities/custom-role.entity';

describe('RoleController', () => {
  let controller: RoleController;
  let roleService: jest.Mocked<RoleService>;

  const mockRoleService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    duplicateRole: jest.fn(),
    initializeDefaultRoles: jest.fn(),
    getDefaultRole: jest.fn(),
    getAvailablePermissions: jest.fn(),
  };

  const mockRole = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    roleService = module.get(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all roles for a team', async () => {
      mockRoleService.findAll.mockResolvedValue([mockRole]);

      const result = await controller.findAll('team-123');

      expect(roleService.findAll).toHaveBeenCalledWith('team-123');
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0]).toEqual(mockRole);
    });

    it('should return empty array when no roles exist', async () => {
      mockRoleService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('team-123');

      expect(result.roles).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createDto = {
        name: 'New Role',
        description: 'A new custom role',
        permissions: [Permission.LINKS_VIEW],
      };
      mockRoleService.create.mockResolvedValue({ ...mockRole, ...createDto });

      const result = await controller.create('team-123', createDto);

      expect(roleService.create).toHaveBeenCalledWith('team-123', createDto);
      expect(result.role.name).toBe('New Role');
    });

    it('should create a role with color', async () => {
      const createDto = {
        name: 'Colored Role',
        permissions: [Permission.LINKS_VIEW],
        color: '#FF5733',
      };
      mockRoleService.create.mockResolvedValue({ ...mockRole, ...createDto });

      const result = await controller.create('team-123', createDto);

      expect(result.role.color).toBe('#FF5733');
    });

    it('should create a default role', async () => {
      const createDto = {
        name: 'Default Role',
        permissions: [Permission.LINKS_VIEW],
        isDefault: true,
      };
      mockRoleService.create.mockResolvedValue({ ...mockRole, ...createDto, isDefault: true });

      const result = await controller.create('team-123', createDto);

      expect(result.role.isDefault).toBe(true);
    });
  });

  describe('getAvailablePermissions', () => {
    it('should return available permissions', async () => {
      const permissionsResult = {
        permissions: Object.values(Permission),
        groups: PERMISSION_GROUPS,
        presets: [
          { name: 'ADMIN', permissions: PRESET_ROLE_PERMISSIONS.ADMIN },
          { name: 'MEMBER', permissions: PRESET_ROLE_PERMISSIONS.MEMBER },
          { name: 'VIEWER', permissions: PRESET_ROLE_PERMISSIONS.VIEWER },
        ],
      };
      mockRoleService.getAvailablePermissions.mockResolvedValue(permissionsResult);

      const result = await controller.getAvailablePermissions();

      expect(roleService.getAvailablePermissions).toHaveBeenCalled();
      expect(result.permissions).toBeDefined();
      expect(result.groups).toBeDefined();
      expect(result.presets).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a single role', async () => {
      mockRoleService.findOne.mockResolvedValue(mockRole);

      const result = await controller.findOne('team-123', 'role-123');

      expect(roleService.findOne).toHaveBeenCalledWith('role-123', 'team-123');
      expect(result.role).toEqual(mockRole);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const updateDto = {
        name: 'Updated Role',
        permissions: [Permission.LINKS_VIEW, Permission.LINKS_EDIT],
      };
      mockRoleService.update.mockResolvedValue({ ...mockRole, ...updateDto });

      const result = await controller.update('team-123', 'role-123', updateDto);

      expect(roleService.update).toHaveBeenCalledWith('role-123', 'team-123', updateDto);
      expect(result.role.name).toBe('Updated Role');
    });

    it('should update role description', async () => {
      const updateDto = { description: 'Updated description' };
      mockRoleService.update.mockResolvedValue({ ...mockRole, ...updateDto });

      const result = await controller.update('team-123', 'role-123', updateDto);

      expect(result.role.description).toBe('Updated description');
    });

    it('should update role color', async () => {
      const updateDto = { color: '#00FF00' };
      mockRoleService.update.mockResolvedValue({ ...mockRole, ...updateDto });

      const result = await controller.update('team-123', 'role-123', updateDto);

      expect(result.role.color).toBe('#00FF00');
    });
  });

  describe('delete', () => {
    it('should delete a role', async () => {
      mockRoleService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('team-123', 'role-123');

      expect(roleService.delete).toHaveBeenCalledWith('role-123', 'team-123');
      expect(result.success).toBe(true);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a role', async () => {
      const duplicatedRole = { ...mockRole, id: 'role-456', name: 'Copy of Custom Role' };
      mockRoleService.duplicateRole.mockResolvedValue(duplicatedRole);

      const result = await controller.duplicate('team-123', 'role-123', {
        name: 'Copy of Custom Role',
      });

      expect(roleService.duplicateRole).toHaveBeenCalledWith(
        'role-123',
        'team-123',
        'Copy of Custom Role',
      );
      expect(result.role.name).toBe('Copy of Custom Role');
      expect(result.role.id).not.toBe(mockRole.id);
    });
  });

  describe('initializeDefaults', () => {
    it('should initialize default roles', async () => {
      mockRoleService.initializeDefaultRoles.mockResolvedValue(undefined);

      const result = await controller.initializeDefaults('team-123');

      expect(roleService.initializeDefaultRoles).toHaveBeenCalledWith('team-123');
      expect(result.success).toBe(true);
    });
  });

  describe('getDefaultRole', () => {
    it('should return the default role', async () => {
      const defaultRole = { ...mockRole, isDefault: true };
      mockRoleService.getDefaultRole.mockResolvedValue(defaultRole);

      const result = await controller.getDefaultRole('team-123');

      expect(roleService.getDefaultRole).toHaveBeenCalledWith('team-123');
      expect(result.role.isDefault).toBe(true);
    });

    it('should return null when no default role exists', async () => {
      mockRoleService.getDefaultRole.mockResolvedValue(null);

      const result = await controller.getDefaultRole('team-123');

      expect(result.role).toBeNull();
    });
  });

  describe('setDefault', () => {
    it('should set a role as default', async () => {
      const updatedRole = { ...mockRole, isDefault: true };
      mockRoleService.update.mockResolvedValue(updatedRole);

      const result = await controller.setDefault('team-123', 'role-123');

      expect(roleService.update).toHaveBeenCalledWith('role-123', 'team-123', { isDefault: true });
      expect(result.role.isDefault).toBe(true);
    });
  });
});
