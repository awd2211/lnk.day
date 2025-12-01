import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { LdapController } from './ldap.controller';
import { LdapService } from './ldap.service';

describe('LdapController', () => {
  let controller: LdapController;
  let ldapService: jest.Mocked<LdapService>;

  const mockLdapService = {
    getConfig: jest.fn(),
    createConfig: jest.fn(),
    updateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    testConnection: jest.fn(),
    syncUsers: jest.fn(),
    authenticate: jest.fn(),
  };

  const mockLdapConfig = {
    id: 'config-123',
    teamId: 'team-123',
    name: 'Test LDAP',
    host: 'ldap.example.com',
    port: 389,
    securityProtocol: 'starttls' as const,
    bindDn: 'cn=admin,dc=example,dc=com',
    baseDn: 'dc=example,dc=com',
    userSearchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
    attributeMapping: {
      username: 'uid',
      email: 'mail',
    },
    enabled: true,
    lastTestAt: new Date(),
    lastTestResult: 'success',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LdapController],
      providers: [
        {
          provide: LdapService,
          useValue: mockLdapService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<LdapController>(LdapController);
    ldapService = module.get(LdapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return LDAP config when configured', async () => {
      mockLdapService.getConfig.mockResolvedValue(mockLdapConfig);

      const result = await controller.getConfig('team-123');

      expect(result.configured).toBe(true);
      expect(result.host).toBe('ldap.example.com');
      expect(ldapService.getConfig).toHaveBeenCalledWith('team-123');
    });

    it('should return configured=false when no config', async () => {
      mockLdapService.getConfig.mockResolvedValue(null);

      const result = await controller.getConfig('team-123');

      expect(result.configured).toBe(false);
    });

    it('should not expose sensitive fields like bindPassword', async () => {
      const configWithPassword = { ...mockLdapConfig, bindPassword: 'secret' };
      mockLdapService.getConfig.mockResolvedValue(configWithPassword);

      const result = await controller.getConfig('team-123');

      // The controller doesn't include bindPassword in the response
      expect((result as any).bindPassword).toBeUndefined();
    });
  });

  describe('createConfig', () => {
    it('should create LDAP config', async () => {
      mockLdapService.createConfig.mockResolvedValue(mockLdapConfig);

      const dto = {
        name: 'Test LDAP',
        host: 'ldap.example.com',
        bindDn: 'cn=admin,dc=example,dc=com',
        bindPassword: 'password',
        baseDn: 'dc=example,dc=com',
      };

      const result = await controller.createConfig('team-123', dto);

      expect(result.success).toBe(true);
      expect(result.id).toBe('config-123');
      expect(ldapService.createConfig).toHaveBeenCalledWith('team-123', dto);
    });
  });

  describe('updateConfig', () => {
    it('should update LDAP config', async () => {
      mockLdapService.updateConfig.mockResolvedValue({
        ...mockLdapConfig,
        name: 'Updated LDAP',
      });

      const result = await controller.updateConfig('team-123', { name: 'Updated LDAP' });

      expect(result.success).toBe(true);
      expect(ldapService.updateConfig).toHaveBeenCalledWith('team-123', { name: 'Updated LDAP' });
    });
  });

  describe('deleteConfig', () => {
    it('should delete LDAP config', async () => {
      mockLdapService.deleteConfig.mockResolvedValue(true);

      const result = await controller.deleteConfig('team-123');

      expect(result.success).toBe(true);
      expect(ldapService.deleteConfig).toHaveBeenCalledWith('team-123');
    });

    it('should return success=false when deletion fails', async () => {
      mockLdapService.deleteConfig.mockResolvedValue(false);

      const result = await controller.deleteConfig('team-123');

      expect(result.success).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should test LDAP connection', async () => {
      mockLdapService.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful. Found 5 sample users.',
        details: {
          connected: true,
          boundSuccessfully: true,
          userSearchSuccessful: true,
          sampleUsers: 5,
        },
      });

      const result = await controller.testConnection('team-123');

      expect(result.success).toBe(true);
      expect(result.details?.sampleUsers).toBe(5);
      expect(ldapService.testConnection).toHaveBeenCalledWith('team-123');
    });
  });

  describe('syncUsers', () => {
    it('should sync users from LDAP', async () => {
      mockLdapService.syncUsers.mockResolvedValue({
        success: true,
        usersFound: 100,
        usersCreated: 10,
        usersUpdated: 90,
        errors: [],
      });

      const result = await controller.syncUsers('team-123');

      expect(result.success).toBe(true);
      expect(result.usersFound).toBe(100);
      expect(ldapService.syncUsers).toHaveBeenCalledWith('team-123');
    });
  });

  describe('authenticate', () => {
    it('should authenticate user via LDAP', async () => {
      mockLdapService.authenticate.mockResolvedValue({
        dn: 'uid=testuser,ou=people,dc=example,dc=com',
        username: 'testuser',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        groups: ['cn=developers,ou=groups,dc=example,dc=com'],
        rawAttributes: {},
      });

      const result = await controller.authenticate('team-123', {
        username: 'testuser',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('testuser@example.com');
      expect(ldapService.authenticate).toHaveBeenCalledWith('team-123', 'testuser', 'password123');
    });

    it('should return failure when authentication fails', async () => {
      mockLdapService.authenticate.mockResolvedValue(null);

      const result = await controller.authenticate('team-123', {
        username: 'testuser',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication failed');
    });
  });

  describe('getAttributeSuggestions', () => {
    it('should return attribute suggestions', () => {
      const result = controller.getAttributeSuggestions();

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.username).toContain('uid');
      expect(result.suggestions.email).toContain('mail');
      expect(result.commonFilters).toBeDefined();
      expect(result.tips).toBeDefined();
    });
  });

  describe('getTemplates', () => {
    it('should return LDAP templates', () => {
      const result = controller.getTemplates();

      expect(result.templates).toBeDefined();
      expect(result.templates.length).toBeGreaterThan(0);

      const adTemplate = result.templates.find((t: any) => t.id === 'active_directory');
      expect(adTemplate).toBeDefined();
      expect(adTemplate?.config.attributeMapping.username).toBe('sAMAccountName');
    });
  });
});
