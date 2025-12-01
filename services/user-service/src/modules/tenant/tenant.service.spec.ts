import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

import { TenantService } from './tenant.service';
import {
  Tenant,
  TenantMember,
  TenantInvitation,
  TenantAuditLog,
  TenantApiKey,
  TenantStatus,
  TenantType,
} from './entities/tenant.entity';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepo: jest.Mocked<Repository<Tenant>>;
  let memberRepo: jest.Mocked<Repository<TenantMember>>;
  let invitationRepo: jest.Mocked<Repository<TenantInvitation>>;
  let auditLogRepo: jest.Mocked<Repository<TenantAuditLog>>;
  let apiKeyRepo: jest.Mocked<Repository<TenantApiKey>>;

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    status: TenantStatus.ACTIVE,
    type: TenantType.TEAM,
    ownerId: 'user-123',
    branding: {
      logo: 'https://example.com/logo.png',
      primaryColor: '#3B82F6',
    },
    settings: {
      timezone: 'UTC',
      locale: 'en',
    },
    features: {
      analytics: true,
      campaigns: true,
      qrCodes: true,
      subAccounts: false,
    },
    limits: {
      maxUsers: 10,
      maxLinks: 1000,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember: Partial<TenantMember> = {
    id: 'member-123',
    tenantId: 'tenant-123',
    userId: 'user-123',
    role: 'owner',
    permissions: ['*'],
    isActive: true,
    joinedAt: new Date(),
    createdAt: new Date(),
  };

  const mockInvitation: Partial<TenantInvitation> = {
    id: 'invitation-123',
    tenantId: 'tenant-123',
    email: 'invitee@example.com',
    role: 'member',
    permissions: ['links:read'],
    token: 'invitation-token-123',
    invitedBy: 'user-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockApiKey: Partial<TenantApiKey> = {
    id: 'apikey-123',
    tenantId: 'tenant-123',
    name: 'Test API Key',
    keyPrefix: 'lnk_abc12345',
    keyHash: 'hashed-key',
    permissions: ['read'],
    scopes: ['links', 'analytics'],
    rateLimit: 1000,
    isActive: true,
    createdBy: 'user-123',
    createdAt: new Date(),
  };

  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  });

  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(TenantMember),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(TenantInvitation),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(TenantAuditLog),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(TenantApiKey),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepo = module.get(getRepositoryToken(Tenant));
    memberRepo = module.get(getRepositoryToken(TenantMember));
    invitationRepo = module.get(getRepositoryToken(TenantInvitation));
    auditLogRepo = module.get(getRepositoryToken(TenantAuditLog));
    apiKeyRepo = module.get(getRepositoryToken(TenantApiKey));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    it('should create a new tenant', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      tenantRepo.create.mockReturnValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      memberRepo.save.mockResolvedValue(mockMember as TenantMember);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.createTenant(
        { name: 'Test Tenant' },
        'user-123',
      );

      expect(result.id).toBe('tenant-123');
      expect(tenantRepo.create).toHaveBeenCalled();
      expect(memberRepo.save).toHaveBeenCalled();
    });

    it('should generate unique slug', async () => {
      tenantRepo.findOne
        .mockResolvedValueOnce(mockTenant as Tenant) // first slug exists
        .mockResolvedValueOnce(null); // second slug is unique
      tenantRepo.create.mockReturnValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      memberRepo.save.mockResolvedValue(mockMember as TenantMember);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      await service.createTenant({ name: 'Test Tenant' }, 'user-123');

      expect(tenantRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateTenant', () => {
    it('should update tenant', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.save.mockResolvedValue({
        ...mockTenant,
        name: 'Updated Tenant',
      } as Tenant);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.updateTenant(
        'tenant-123',
        { name: 'Updated Tenant' },
        'user-123',
      );

      expect(result.name).toBe('Updated Tenant');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTenant('tenant-999', { name: 'Test' }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when slug already in use', async () => {
      tenantRepo.findOne
        .mockResolvedValueOnce(mockTenant as Tenant)
        .mockResolvedValueOnce({ ...mockTenant, id: 'other-tenant' } as Tenant);
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);

      await expect(
        service.updateTenant('tenant-123', { slug: 'existing-slug' }, 'user-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getTenant', () => {
    it('should return tenant by ID', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.getTenant('tenant-123');

      expect(result.id).toBe('tenant-123');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.getTenant('tenant-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTenantBySlug', () => {
    it('should return tenant by slug', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.getTenantBySlug('test-tenant');

      expect(result.slug).toBe('test-tenant');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.getTenantBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTenantsByUser', () => {
    it('should return tenants for user', async () => {
      memberRepo.find.mockResolvedValue([mockMember as TenantMember]);
      tenantRepo.find.mockResolvedValue([mockTenant as Tenant]);

      const result = await service.getTenantsByUser('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tenant-123');
    });

    it('should return empty array when user has no memberships', async () => {
      memberRepo.find.mockResolvedValue([]);

      const result = await service.getTenantsByUser('user-456');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteTenant', () => {
    it('should delete tenant when user is owner', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepo.remove.mockResolvedValue(mockTenant as Tenant);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      await service.deleteTenant('tenant-123', 'user-123');

      expect(tenantRepo.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);

      await expect(
        service.deleteTenant('tenant-123', 'user-456'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateBranding', () => {
    it('should update tenant branding', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.save.mockImplementation((tenant) =>
        Promise.resolve(tenant as Tenant),
      );
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.updateBranding(
        'tenant-123',
        { primaryColor: '#FF0000' },
        'user-123',
      );

      expect(result.branding.primaryColor).toBe('#FF0000');
    });
  });

  describe('getBranding', () => {
    it('should return tenant branding', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.getBranding('tenant-123');

      expect(result.logo).toBe('https://example.com/logo.png');
    });

    it('should return empty object when no branding set', async () => {
      tenantRepo.findOne.mockResolvedValue({
        ...mockTenant,
        branding: null,
      } as Tenant);

      const result = await service.getBranding('tenant-123');

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should update tenant settings', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.save.mockImplementation((tenant) =>
        Promise.resolve(tenant as Tenant),
      );
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.updateSettings(
        'tenant-123',
        { timezone: 'America/New_York' },
        'user-123',
      );

      expect(result.settings.timezone).toBe('America/New_York');
    });
  });

  describe('updateFeatures', () => {
    it('should update tenant features', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.save.mockImplementation((tenant) =>
        Promise.resolve(tenant as Tenant),
      );
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.updateFeatures(
        'tenant-123',
        { subAccounts: true },
        'user-123',
      );

      expect(result.features.subAccounts).toBe(true);
    });
  });

  describe('getMembers', () => {
    it('should return tenant members', async () => {
      memberRepo.find.mockResolvedValue([mockMember as TenantMember]);

      const result = await service.getMembers('tenant-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });
  });

  describe('getMember', () => {
    it('should return specific member', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);

      const result = await service.getMember('tenant-123', 'user-123');

      expect(result?.role).toBe('owner');
    });

    it('should return null when member not found', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      const result = await service.getMember('tenant-123', 'user-456');

      expect(result).toBeNull();
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const regularMember = {
        ...mockMember,
        id: 'member-456',
        userId: 'user-456',
        role: 'member',
      };
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(regularMember as TenantMember); // find member
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      memberRepo.save.mockImplementation((member) =>
        Promise.resolve(member as TenantMember),
      );
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.updateMemberRole(
        'tenant-123',
        'member-456',
        'admin',
        ['links:*'],
        'user-123',
      );

      expect(result.role).toBe('admin');
    });

    it('should throw NotFoundException when member not found', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(null); // member not found

      await expect(
        service.updateMemberRole('tenant-123', 'member-999', 'admin', [], 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to change owner role', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(mockMember as TenantMember); // owner member
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);

      await expect(
        service.updateMemberRole('tenant-123', 'member-123', 'admin', [], 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeMember', () => {
    it('should remove member', async () => {
      const regularMember = {
        ...mockMember,
        id: 'member-456',
        userId: 'user-456',
        role: 'member',
      };
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(regularMember as TenantMember); // find member
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      memberRepo.save.mockResolvedValue({
        ...regularMember,
        isActive: false,
      } as TenantMember);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      await service.removeMember('tenant-123', 'member-456', 'user-123');

      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw BadRequestException when trying to remove owner', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(mockMember as TenantMember); // owner member
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);

      await expect(
        service.removeMember('tenant-123', 'member-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createInvitation', () => {
    it('should create invitation', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(null); // no existing member
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockReturnValue(mockInvitation as TenantInvitation);
      invitationRepo.save.mockResolvedValue(mockInvitation as TenantInvitation);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.createInvitation(
        'tenant-123',
        'invitee@example.com',
        'member',
        ['links:read'],
        'user-123',
      );

      expect(result.email).toBe('invitee@example.com');
      expect(result.token).toBeDefined();
    });

    it('should throw ConflictException when user is already a member', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(mockMember as TenantMember); // existing member

      await expect(
        service.createInvitation('tenant-123', 'test@example.com', 'member', [], 'user-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when invitation already exists', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(mockMember as TenantMember) // checkPermission
        .mockResolvedValueOnce(null); // no existing member
      invitationRepo.findOne.mockResolvedValue(mockInvitation as TenantInvitation);

      await expect(
        service.createInvitation('tenant-123', 'invitee@example.com', 'member', [], 'user-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation', async () => {
      invitationRepo.findOne.mockResolvedValue(mockInvitation as TenantInvitation);
      memberRepo.create.mockReturnValue(mockMember as TenantMember);
      memberRepo.save.mockResolvedValue(mockMember as TenantMember);
      invitationRepo.save.mockResolvedValue({
        ...mockInvitation,
        acceptedAt: new Date(),
      } as TenantInvitation);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.acceptInvitation('invitation-token-123', 'user-456');

      expect(memberRepo.save).toHaveBeenCalled();
      expect(invitationRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invitation not found', async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acceptInvitation('invalid-token', 'user-456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when invitation expired', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000),
      };
      invitationRepo.findOne.mockResolvedValue(expiredInvitation as TenantInvitation);

      await expect(
        service.acceptInvitation('invitation-token-123', 'user-456'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      invitationRepo.findOne.mockResolvedValue(mockInvitation as TenantInvitation);
      invitationRepo.remove.mockResolvedValue(mockInvitation as TenantInvitation);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      await service.cancelInvitation('tenant-123', 'invitation-123', 'user-123');

      expect(invitationRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invitation not found', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      invitationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelInvitation('tenant-123', 'invitation-999', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations', async () => {
      invitationRepo.find.mockResolvedValue([mockInvitation as TenantInvitation]);

      const result = await service.getPendingInvitations('tenant-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('createApiKey', () => {
    it('should create API key', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      apiKeyRepo.create.mockReturnValue(mockApiKey as TenantApiKey);
      apiKeyRepo.save.mockResolvedValue(mockApiKey as TenantApiKey);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.createApiKey(
        'tenant-123',
        { name: 'Test API Key' },
        'user-123',
      );

      expect(result.apiKey.name).toBe('Test API Key');
      expect(result.rawKey).toMatch(/^lnk_/);
    });
  });

  describe('getApiKeys', () => {
    it('should return API keys', async () => {
      apiKeyRepo.find.mockResolvedValue([mockApiKey as TenantApiKey]);

      const result = await service.getApiKeys('tenant-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      apiKeyRepo.findOne.mockResolvedValue(mockApiKey as TenantApiKey);
      apiKeyRepo.save.mockResolvedValue({
        ...mockApiKey,
        isActive: false,
      } as TenantApiKey);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      await service.revokeApiKey('tenant-123', 'apikey-123', 'user-123');

      expect(apiKeyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NotFoundException when API key not found', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      apiKeyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.revokeApiKey('tenant-123', 'apikey-999', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key', async () => {
      apiKeyRepo.findOne.mockResolvedValue(mockApiKey as TenantApiKey);
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      apiKeyRepo.save.mockResolvedValue(mockApiKey as TenantApiKey);

      const result = await service.validateApiKey('lnk_test-key');

      expect(result?.tenant.id).toBe('tenant-123');
      expect(result?.apiKey.name).toBe('Test API Key');
    });

    it('should return null when API key not found', async () => {
      apiKeyRepo.findOne.mockResolvedValue(null);

      const result = await service.validateApiKey('invalid-key');

      expect(result).toBeNull();
    });

    it('should return null when API key expired', async () => {
      const expiredKey = {
        ...mockApiKey,
        expiresAt: new Date(Date.now() - 1000),
      };
      apiKeyRepo.findOne.mockResolvedValue(expiredKey as TenantApiKey);

      const result = await service.validateApiKey('lnk_test-key');

      expect(result).toBeNull();
    });

    it('should return null when tenant is not active', async () => {
      apiKeyRepo.findOne.mockResolvedValue(mockApiKey as TenantApiKey);
      tenantRepo.findOne.mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
      } as Tenant);

      const result = await service.validateApiKey('lnk_test-key');

      expect(result).toBeNull();
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);
      auditLogRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAuditLogs('tenant-123');

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by userId', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      auditLogRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getAuditLogs('tenant-123', { userId: 'user-123' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by action', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      auditLogRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getAuditLogs('tenant-123', { action: 'tenant.created' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getSubTenants', () => {
    it('should return sub-tenants', async () => {
      tenantRepo.find.mockResolvedValue([mockTenant as Tenant]);

      const result = await service.getSubTenants('parent-tenant-123');

      expect(tenantRepo.find).toHaveBeenCalledWith({
        where: { parentTenantId: 'parent-tenant-123' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('createSubTenant', () => {
    it('should create sub-tenant', async () => {
      const parentTenant = {
        ...mockTenant,
        id: 'parent-tenant-123',
        features: { subAccounts: true },
      };
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.findOne
        .mockResolvedValueOnce(parentTenant as Tenant) // checkPermission -> getTenant
        .mockResolvedValueOnce(parentTenant as Tenant) // createSubTenant -> getTenant
        .mockResolvedValueOnce(null); // ensureUniqueSlug
      tenantRepo.create.mockReturnValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      memberRepo.save.mockResolvedValue(mockMember as TenantMember);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      const result = await service.createSubTenant(
        'parent-tenant-123',
        { name: 'Sub Tenant' },
        'owner-456',
        'user-123',
      );

      expect(result.id).toBe('tenant-123');
    });

    it('should throw ForbiddenException when sub-accounts not enabled', async () => {
      const parentTenant = {
        ...mockTenant,
        id: 'parent-tenant-123',
        features: { subAccounts: false },
      };
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.findOne
        .mockResolvedValueOnce(parentTenant as Tenant) // checkPermission -> getTenant
        .mockResolvedValueOnce(parentTenant as Tenant); // createSubTenant -> getTenant

      await expect(
        service.createSubTenant('parent-tenant-123', {}, 'owner-456', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTenantStats', () => {
    it('should return tenant statistics', async () => {
      memberRepo.count.mockResolvedValue(5);
      invitationRepo.count.mockResolvedValue(2);
      apiKeyRepo.count.mockResolvedValue(3);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(10);
      auditLogRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTenantStats('tenant-123');

      expect(result.members).toBe(5);
      expect(result.pendingInvitations).toBe(2);
      expect(result.apiKeys).toBe(3);
      expect(result.auditLogsToday).toBe(10);
    });
  });

  describe('checkPermission', () => {
    it('should allow owner to perform any action', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember as TenantMember);
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      // This should not throw
      await service.updateBranding('tenant-123', {}, 'user-123');
    });

    it('should allow admin for non-restricted actions', async () => {
      const adminMember = { ...mockMember, role: 'admin' };
      memberRepo.findOne.mockResolvedValue(adminMember as TenantMember);
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      // This should not throw
      await service.updateBranding('tenant-123', {}, 'user-456');
    });

    it('should throw ForbiddenException when not a member', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateBranding('tenant-123', {}, 'user-999'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow member with specific permission', async () => {
      const memberWithPermission = {
        ...mockMember,
        role: 'member',
        permissions: ['branding.update'],
      };
      memberRepo.findOne.mockResolvedValue(memberWithPermission as TenantMember);
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      // This should not throw
      await service.updateBranding('tenant-123', {}, 'user-789');
    });

    it('should allow member with wildcard permission', async () => {
      const memberWithWildcard = {
        ...mockMember,
        role: 'member',
        permissions: ['*'],
      };
      memberRepo.findOne.mockResolvedValue(memberWithWildcard as TenantMember);
      tenantRepo.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepo.save.mockResolvedValue(mockTenant as Tenant);
      auditLogRepo.create.mockReturnValue({} as TenantAuditLog);
      auditLogRepo.save.mockResolvedValue({} as TenantAuditLog);

      // This should not throw
      await service.updateBranding('tenant-123', {}, 'user-789');
    });
  });
});
