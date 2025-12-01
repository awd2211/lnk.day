import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LdapService, LdapUser, LdapTestResult, LdapSyncResult } from './ldap.service';
import { LdapConfig } from './ldap-config.entity';

// Mock ldapjs
const mockBind = jest.fn();
const mockUnbind = jest.fn();
const mockSearch = jest.fn();
const mockStarttls = jest.fn();

const createMockLdapClient = () => {
  const eventHandlers: Record<string, Function> = {};
  return {
    bind: mockBind,
    unbind: mockUnbind,
    search: mockSearch,
    starttls: mockStarttls,
    on: jest.fn((event: string, handler: Function) => {
      eventHandlers[event] = handler;
      return this;
    }),
    emit: (event: string, ...args: any[]) => {
      if (eventHandlers[event]) {
        eventHandlers[event](...args);
      }
    },
    _eventHandlers: eventHandlers,
  };
};

let mockLdapClient: ReturnType<typeof createMockLdapClient>;

jest.mock('ldapjs', () => ({
  createClient: jest.fn(() => {
    mockLdapClient = createMockLdapClient();
    // Auto-trigger connect event after a tick
    setTimeout(() => {
      if (mockLdapClient._eventHandlers['connect']) {
        mockLdapClient._eventHandlers['connect']();
      }
    }, 0);
    return mockLdapClient;
  }),
}));

import * as ldap from 'ldapjs';

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

  describe('testConnection - success paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should test connection successfully with none security', async () => {
      // Use none security to avoid STARTTLS complexity
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(noneSecurityConfig as LdapConfig);

      // Mock successful bind
      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      // Mock successful search with users
      const mockSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'uid=testuser,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['testuser'] },
                { type: 'mail', values: ['test@example.com'] },
              ],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockSearchResult;
        }),
      };

      mockSearch.mockImplementation((baseDn, opts, callback) => {
        callback(null, mockSearchResult);
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Connection successful');
      expect(result.details?.connected).toBe(true);
      expect(result.details?.boundSuccessfully).toBe(true);
      expect(result.details?.userSearchSuccessful).toBe(true);
      expect(ldapConfigRepo.save).toHaveBeenCalled();
    });

    it('should test connection with SSL security', async () => {
      const sslConfig = { ...mockLdapConfig, securityProtocol: 'ssl' as const, port: 636 };
      ldapConfigRepo.findOne.mockResolvedValue(sslConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(sslConfig as LdapConfig);

      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      const mockSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'uid=user1,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['user1'] },
                { type: 'mail', values: ['user1@example.com'] },
              ],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockSearchResult;
        }),
      };

      mockSearch.mockImplementation((baseDn, opts, callback) => {
        callback(null, mockSearchResult);
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(true);
      expect(ldap.createClient).toHaveBeenCalled();
      const callArgs = (ldap.createClient as jest.Mock).mock.calls[0][0];
      expect(callArgs.url).toContain('ldaps://');
    });
  });

  describe('authenticate - success paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should authenticate user successfully with none security', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);

      // All binds succeed
      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      // Mock user search
      const mockUserSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'uid=testuser,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['testuser'] },
                { type: 'mail', values: ['test@example.com'] },
                { type: 'givenName', values: ['Test'] },
                { type: 'sn', values: ['User'] },
                { type: 'cn', values: ['Test User'] },
              ],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockUserSearchResult;
        }),
      };

      // Mock group search (empty)
      const mockGroupSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockGroupSearchResult;
        }),
      };

      let searchCallCount = 0;
      mockSearch.mockImplementation((baseDn, opts, callback) => {
        searchCallCount++;
        if (searchCallCount === 1) {
          callback(null, mockUserSearchResult);
        } else {
          callback(null, mockGroupSearchResult);
        }
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.authenticate('team-123', 'testuser', 'password123');

      expect(result).not.toBeNull();
      expect(result?.username).toBe('testuser');
      expect(result?.email).toBe('test@example.com');
      expect(result?.firstName).toBe('Test');
      expect(result?.lastName).toBe('User');
    });

    it('should authenticate user with groups', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);

      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      const mockUserSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'uid=admin,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['admin'] },
                { type: 'mail', values: ['admin@example.com'] },
              ],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockUserSearchResult;
        }),
      };

      const mockGroupSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'cn=admins,ou=groups,dc=example,dc=com' },
              attributes: [],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockGroupSearchResult;
        }),
      };

      let searchCallCount = 0;
      mockSearch.mockImplementation((baseDn, opts, callback) => {
        searchCallCount++;
        if (searchCallCount === 1) {
          callback(null, mockUserSearchResult);
        } else {
          callback(null, mockGroupSearchResult);
        }
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.authenticate('team-123', 'admin', 'adminpass');

      expect(result).not.toBeNull();
      expect(result?.groups).toContain('cn=admins,ou=groups,dc=example,dc=com');
    });

    it('should return null when user not found in LDAP', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);

      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      // Empty search result
      const mockEmptySearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockEmptySearchResult;
        }),
      };

      mockSearch.mockImplementation((baseDn, opts, callback) => {
        callback(null, mockEmptySearchResult);
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.authenticate('team-123', 'nonexistent', 'password');

      expect(result).toBeNull();
    });

    it('should return null when user password is invalid', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);

      let bindCallCount = 0;
      mockBind.mockImplementation((dn, password, callback) => {
        bindCallCount++;
        if (bindCallCount <= 1) {
          callback(null); // Service account bind succeeds
        } else {
          callback(new Error('Invalid credentials')); // User bind fails
        }
      });

      const mockUserSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'uid=testuser,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['testuser'] },
                { type: 'mail', values: ['test@example.com'] },
              ],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockUserSearchResult;
        }),
      };

      mockSearch.mockImplementation((baseDn, opts, callback) => {
        callback(null, mockUserSearchResult);
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.authenticate('team-123', 'testuser', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('syncUsers - success paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should sync users successfully', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(noneSecurityConfig as LdapConfig);

      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      const mockSearchResult = {
        on: jest.fn((event, handler) => {
          if (event === 'searchEntry') {
            handler({
              dn: { toString: () => 'uid=user1,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['user1'] },
                { type: 'mail', values: ['user1@example.com'] },
              ],
            });
            handler({
              dn: { toString: () => 'uid=user2,dc=example,dc=com' },
              attributes: [
                { type: 'uid', values: ['user2'] },
                { type: 'mail', values: ['user2@example.com'] },
              ],
            });
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockSearchResult;
        }),
      };

      mockSearch.mockImplementation((baseDn, opts, callback) => {
        callback(null, mockSearchResult);
      });

      mockUnbind.mockImplementation(() => {});

      const result = await service.syncUsers('team-123');

      expect(result.success).toBe(true);
      expect(result.usersFound).toBe(2);
      expect(result.usersUpdated).toBe(2);
      expect(ldapConfigRepo.save).toHaveBeenCalled();
    });
  });

  describe('testConnection - error paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle bind failure', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(noneSecurityConfig as LdapConfig);

      mockBind.mockImplementation((dn, password, callback) => {
        callback(new Error('Invalid credentials'));
      });

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Bind failed');
      expect(ldapConfigRepo.save).toHaveBeenCalled();
    });

    it('should handle search failure', async () => {
      const noneSecurityConfig = { ...mockLdapConfig, securityProtocol: 'none' as const };
      ldapConfigRepo.findOne.mockResolvedValue(noneSecurityConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(noneSecurityConfig as LdapConfig);

      mockBind.mockImplementation((dn, password, callback) => {
        callback(null);
      });

      mockSearch.mockImplementation((baseDn, opts, callback) => {
        callback(new Error('Search timeout'));
      });

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Search failed');
    });

    it('should handle STARTTLS failure', async () => {
      const starttlsConfig = { ...mockLdapConfig, securityProtocol: 'starttls' as const };
      ldapConfigRepo.findOne.mockResolvedValue(starttlsConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(starttlsConfig as LdapConfig);

      // Mock STARTTLS failure
      (ldap.createClient as jest.Mock).mockImplementationOnce(() => {
        const client = createMockLdapClient();
        setTimeout(() => {
          if (client._eventHandlers['connect']) {
            client._eventHandlers['connect']();
          }
        }, 0);
        mockStarttls.mockImplementation((opts, controls, callback) => {
          callback(new Error('STARTTLS negotiation failed'));
        });
        return client;
      });

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('STARTTLS failed');
    });

    it('should handle connection error', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(mockLdapConfig as LdapConfig);

      // Mock connection error
      (ldap.createClient as jest.Mock).mockImplementationOnce(() => {
        const client = createMockLdapClient();
        setTimeout(() => {
          if (client._eventHandlers['error']) {
            client._eventHandlers['error'](new Error('Connection refused'));
          }
        }, 0);
        return client;
      });

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });

    it('should handle connectError event', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue(mockLdapConfig as LdapConfig);

      // Mock connectError event
      (ldap.createClient as jest.Mock).mockImplementationOnce(() => {
        const client = createMockLdapClient();
        setTimeout(() => {
          if (client._eventHandlers['connectError']) {
            client._eventHandlers['connectError'](new Error('Host unreachable'));
          }
        }, 0);
        return client;
      });

      const result = await service.testConnection('team-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connect error');
    });
  });

  describe('authenticate - error paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle authentication error gracefully', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);

      // Mock connection error
      (ldap.createClient as jest.Mock).mockImplementationOnce(() => {
        const client = createMockLdapClient();
        setTimeout(() => {
          if (client._eventHandlers['error']) {
            client._eventHandlers['error'](new Error('Network error'));
          }
        }, 0);
        return client;
      });

      const result = await service.authenticate('team-123', 'testuser', 'password');

      expect(result).toBeNull();
    });
  });

  describe('syncUsers - error paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle sync with connection error', async () => {
      ldapConfigRepo.findOne.mockResolvedValue(mockLdapConfig as LdapConfig);

      // Mock connection error
      (ldap.createClient as jest.Mock).mockImplementationOnce(() => {
        const client = createMockLdapClient();
        setTimeout(() => {
          if (client._eventHandlers['error']) {
            client._eventHandlers['error'](new Error('Connection refused'));
          }
        }, 0);
        return client;
      });

      const result = await service.syncUsers('team-123');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('updateConfig - edge cases', () => {
    it('should allow enabling when lastTestResult includes success', async () => {
      const configWithSuccessTest = {
        ...mockLdapConfig,
        lastTestResult: 'success: Connected and found 5 users',
        enabled: false,
      };
      ldapConfigRepo.findOne.mockResolvedValue(configWithSuccessTest as LdapConfig);
      ldapConfigRepo.save.mockResolvedValue({ ...configWithSuccessTest, enabled: true } as LdapConfig);

      const result = await service.updateConfig('team-123', { enabled: true });

      expect(result.enabled).toBe(true);
    });

    it('should throw when enabling with failed test result', async () => {
      const configWithFailedTest = {
        ...mockLdapConfig,
        lastTestResult: 'failed: Connection refused',
        enabled: false,
      };
      ldapConfigRepo.findOne.mockResolvedValue(configWithFailedTest as LdapConfig);

      await expect(
        service.updateConfig('team-123', { enabled: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteConfig - edge case', () => {
    it('should handle undefined affected', async () => {
      ldapConfigRepo.delete.mockResolvedValue({ affected: undefined, raw: {} } as any);

      const result = await service.deleteConfig('team-123');

      expect(result).toBe(false);
    });
  });
});
