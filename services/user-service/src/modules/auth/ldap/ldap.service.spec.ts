import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LdapService, LdapUser, LdapTestResult, LdapSyncResult } from './ldap.service';
import { LdapConfig } from './ldap-config.entity';

// Mock ldapjs
jest.mock('ldapjs', () => ({
  createClient: jest.fn(),
}));

describe('LdapService', () => {
  let service: LdapService;
  let ldapConfigRepo: jest.Mocked<Repository<LdapConfig>>;

  const mockLdapConfig: Partial<LdapConfig> = {
    id: 'config-123',
    teamId: 'team-123',
    name: 'Test LDAP',
    host: 'ldap.example.com',
    port: 389,
    securityProtocol: 'starttls' as const,
    bindDn: 'cn=admin,dc=example,dc=com',
    bindPassword: 'admin-password',
    baseDn: 'dc=example,dc=com',
    userSearchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
    attributeMapping: {
      username: 'uid',
      email: 'mail',
      firstName: 'givenName',
      lastName: 'sn',
      displayName: 'cn',
    },
    groupBaseDn: 'ou=groups,dc=example,dc=com',
    groupSearchFilter: '(&(objectClass=groupOfNames)(member={{userDn}}))',
    groupMapping: {
      'cn=admins,ou=groups,dc=example,dc=com': 'admin',
    },
    autoProvisionUsers: true,
    enabled: true,
    lastTestResult: 'success',
    connectionTimeout: 5000,
    searchScope: 'sub',
    defaultRole: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    })),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LdapService,
        {
          provide: getRepositoryToken(LdapConfig),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<LdapService>(LdapService);
    ldapConfigRepo = module.get(getRepositoryToken(LdapConfig));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfig', () => {
    it('should create new LDAP config', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(null);
      ldapConfigRepo.create.mockReturnValue(mockLdapConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(mockLdapConfig as LdapConfig);

      const result = await service.createConfig('team-123', {
        name: 'Test LDAP',
        host: 'ldap.example.com',
        bindDn: 'cn=admin,dc=example,dc=com',
        bindPassword: 'admin-password',
        baseDn: 'dc=example,dc=com',
      });

      expect(ldapConfigRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('config-123');
    });

    it('should throw BadRequestException when config already exists', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);

      await expect(
        service.createConfig('team-123', { name: 'Another LDAP' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConfig', () => {
    it('should return LDAP config for team', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);

      const result = await service.getConfig('team-123');

      expect(result).toEqual(mockLdapConfig);
      expect(ldapConfigRepo.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
      });
    });

    it('should return null when no config exists', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.getConfig('team-456');

      expect(result).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update LDAP config', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue({
        ...mockLdapConfig,
        name: 'Updated LDAP',
      } as LdapConfig);

      const result = await service.updateConfig('team-123', { name: 'Updated LDAP' });

      expect(result.name).toBe('Updated LDAP');
    });

    it('should throw NotFoundException when config not found', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(null);

      await expect(service.updateConfig('team-456', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to enable without successful test', async () => {
      const configWithoutTest = {
        ...mockLdapConfig,
        lastTestResult: null,
      };
      ldapConfigRepo.findOne.mockResolvedValue(configWithoutTest as LdapConfig);

      await expect(
        service.updateConfig('team-123', { enabled: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteConfig', () => {
    it('should delete LDAP config', async () => {
      ldapConfigRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      const result = await service.deleteConfig('team-123');

      expect(result).toBe(true);
      expect(ldapConfigRepo.delete).toHaveBeenCalledWith({ teamId: 'team-123' });
    });

    it('should return false when no config deleted', async () => {
      ldapConfigRepo.delete.mockResolvedValue({ affected: 0, raw: {} });

      const result = await service.deleteConfig('team-456');

      expect(result).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return failure when config not found', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.testConnection('team-456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('authenticate', () => {
    it('should return null when config not found', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.authenticate('team-456', 'user', 'pass');

      expect(result).toBeNull();
    });

    it('should return null when LDAP is disabled', async () => {
      const disabledConfig = { ...mockLdapConfig, enabled: false };
      ldapConfigRepo.findOne.mockResolvedValue(disabledConfig as LdapConfig);

      const result = await service.authenticate('team-123', 'user', 'pass');

      expect(result).toBeNull();
    });
  });

  describe('syncUsers', () => {
    it('should return error when LDAP not configured', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.syncUsers('team-456');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('LDAP not configured or enabled');
    });

    it('should return error when LDAP is disabled', async () => {
      const disabledConfig = { ...mockLdapConfig, enabled: false };
      ldapConfigRepo.findOne.mockResolvedValue(disabledConfig as LdapConfig);

      const result = await service.syncUsers('team-123');

      expect(result.success).toBe(false);
    });
  });

  describe('getMappedRole', () => {
    it('should return mapped role for matching group', () => {
      const result = service.getMappedRole(mockLdapConfig as LdapConfig, [
        'cn=admins,ou=groups,dc=example,dc=com',
      ]);

      expect(result).toBe('admin');
    });

    it('should return default role when no group matches', () => {
      const result = service.getMappedRole(mockLdapConfig as LdapConfig, [
        'cn=users,ou=groups,dc=example,dc=com',
      ]);

      expect(result).toBe('member');
    });

    it('should return null when no default role and no match', () => {
      const configNoDefault = { ...mockLdapConfig, defaultRole: null };
      const result = service.getMappedRole(configNoDefault as LdapConfig, []);

      expect(result).toBeNull();
    });
  });
});
