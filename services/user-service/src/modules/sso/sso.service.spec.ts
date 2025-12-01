import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

import { SSOService } from './sso.service';
import { SSOConfig, SSOSession, SSOProvider, SSOStatus } from './entities/sso-config.entity';
import { SAMLService } from './saml/saml.service';
import { LdapService } from '../auth/ldap/ldap.service';

describe('SSOService', () => {
  let service: SSOService;
  let ssoConfigRepository: jest.Mocked<Repository<SSOConfig>>;
  let ssoSessionRepository: jest.Mocked<Repository<SSOSession>>;
  let samlService: jest.Mocked<SAMLService>;
  let ldapService: jest.Mocked<LdapService>;

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  });

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        APP_URL: 'https://app.lnk.day',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockSAMLService = {
    validateCertificate: jest.fn(),
    formatCertificate: jest.fn(),
    parseIdPMetadata: jest.fn(),
    generateSPMetadata: jest.fn(),
    createLoginRequest: jest.fn(),
    createLogoutRequest: jest.fn(),
    parseLoginResponse: jest.fn(),
    parseLogoutResponse: jest.fn(),
    testSAMLConfiguration: jest.fn(),
    clearCache: jest.fn(),
  };

  const mockLdapService = {
    authenticate: jest.fn(),
    getConfig: jest.fn(),
    testConnection: jest.fn(),
    syncUsers: jest.fn(),
  };

  const mockSSOConfig: SSOConfig = {
    id: 'config-123',
    teamId: 'team-123',
    provider: SSOProvider.SAML,
    status: SSOStatus.ACTIVE,
    displayName: 'Test SSO',
    samlEntityId: 'https://idp.example.com',
    samlSsoUrl: 'https://idp.example.com/sso',
    samlSloUrl: 'https://idp.example.com/slo',
    samlCertificate: 'MIIC...',
    samlNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    oidcScopes: [],
    attributeMapping: {},
    autoProvision: true,
    enforceSSO: false,
    allowedDomains: ['example.com'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSSOSession: SSOSession = {
    id: 'session-123',
    ssoConfigId: 'config-123',
    userId: 'user-123',
    externalUserId: 'external-123',
    authenticatedAt: new Date(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SSOService,
        {
          provide: getRepositoryToken(SSOConfig),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(SSOSession),
          useValue: createMockRepository(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SAMLService,
          useValue: mockSAMLService,
        },
        {
          provide: LdapService,
          useValue: mockLdapService,
        },
      ],
    }).compile();

    service = module.get<SSOService>(SSOService);
    ssoConfigRepository = module.get(getRepositoryToken(SSOConfig));
    ssoSessionRepository = module.get(getRepositoryToken(SSOSession));
    samlService = module.get(SAMLService);
    ldapService = module.get(LdapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfigs', () => {
    it('should return all SSO configs for a team', async () => {
      ssoConfigRepository.find.mockResolvedValue([mockSSOConfig]);

      const result = await service.getConfigs('team-123');

      expect(ssoConfigRepository.find).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getConfig', () => {
    it('should return a single SSO config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);

      const result = await service.getConfig('team-123', 'config-123');

      expect(result.id).toBe('config-123');
    });

    it('should throw NotFoundException when config not found', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.getConfig('team-123', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveConfig', () => {
    it('should return active SSO config for a team', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);

      const result = await service.getActiveConfig('team-123');

      expect(ssoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123', status: SSOStatus.ACTIVE },
      });
      expect(result?.status).toBe(SSOStatus.ACTIVE);
    });

    it('should return null when no active config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveConfig('team-123');

      expect(result).toBeNull();
    });
  });

  describe('createSAMLConfig', () => {
    const createDto = {
      displayName: 'New SAML SSO',
      entityId: 'https://idp.new.com',
      ssoUrl: 'https://idp.new.com/sso',
      certificate: 'MIIC...',
    };

    it('should create SAML config successfully', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);
      mockSAMLService.validateCertificate.mockReturnValue({ valid: true });
      mockSAMLService.formatCertificate.mockReturnValue('FORMATTED_CERT');
      ssoConfigRepository.create.mockReturnValue({ ...mockSSOConfig, ...createDto });
      ssoConfigRepository.save.mockResolvedValue({ ...mockSSOConfig, ...createDto });

      const result = await service.createSAMLConfig('team-123', createDto);

      expect(mockSAMLService.validateCertificate).toHaveBeenCalledWith('MIIC...');
      expect(ssoConfigRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when SAML config exists', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);

      await expect(service.createSAMLConfig('team-123', createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid certificate', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);
      mockSAMLService.validateCertificate.mockReturnValue({ valid: false });

      await expect(service.createSAMLConfig('team-123', createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createSAMLConfigFromMetadata', () => {
    const metadataDto = {
      metadataXml: '<EntityDescriptor>...</EntityDescriptor>',
      displayName: 'From Metadata',
    };

    it('should create SAML config from IdP metadata', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);
      mockSAMLService.parseIdPMetadata.mockResolvedValue({
        entityId: 'https://idp.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        sloUrl: 'https://idp.example.com/slo',
        certificate: 'MIIC...',
        nameIdFormats: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
      });
      mockSAMLService.formatCertificate.mockReturnValue('FORMATTED_CERT');
      ssoConfigRepository.create.mockReturnValue(mockSSOConfig);
      ssoConfigRepository.save.mockResolvedValue(mockSSOConfig);

      const result = await service.createSAMLConfigFromMetadata('team-123', metadataDto);

      expect(mockSAMLService.parseIdPMetadata).toHaveBeenCalledWith(metadataDto.metadataXml);
      expect(ssoConfigRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when metadata has no certificate', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);
      mockSAMLService.parseIdPMetadata.mockResolvedValue({
        entityId: 'https://idp.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: null,
        nameIdFormats: [],
      });

      await expect(service.createSAMLConfigFromMetadata('team-123', metadataDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSAMLConfig', () => {
    const updateDto = {
      displayName: 'Updated SAML',
      entityId: 'https://updated.idp.com',
    };

    it('should update SAML config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      ssoConfigRepository.save.mockResolvedValue({ ...mockSSOConfig, ...updateDto });

      const result = await service.updateSAMLConfig('team-123', 'config-123', updateDto);

      expect(ssoConfigRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-SAML config', async () => {
      const oidcConfig = { ...mockSSOConfig, provider: SSOProvider.OIDC };
      ssoConfigRepository.findOne.mockResolvedValue(oidcConfig);

      await expect(service.updateSAMLConfig('team-123', 'config-123', updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate and update certificate', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.validateCertificate.mockReturnValue({ valid: true });
      mockSAMLService.formatCertificate.mockReturnValue('NEW_CERT');
      ssoConfigRepository.save.mockResolvedValue(mockSSOConfig);

      await service.updateSAMLConfig('team-123', 'config-123', { certificate: 'NEW_CERT' });

      expect(mockSAMLService.validateCertificate).toHaveBeenCalledWith('NEW_CERT');
      expect(mockSAMLService.clearCache).toHaveBeenCalledWith('config-123');
    });
  });

  describe('getSAMLMetadata', () => {
    it('should return SP metadata', async () => {
      mockSAMLService.generateSPMetadata.mockReturnValue('<SPMetadata>...</SPMetadata>');

      const result = await service.getSAMLMetadata('team-123');

      expect(result.entityId).toContain('team-123');
      expect(result.acsUrl).toContain('acs');
      expect(result.sloUrl).toContain('slo');
      expect(result.metadataXml).toBeDefined();
    });
  });

  describe('initiateSAMLLogin', () => {
    it('should create SAML login request', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.createLoginRequest.mockResolvedValue({
        redirectUrl: 'https://idp.example.com/sso?SAMLRequest=...',
        requestId: 'req-123',
      });

      const result = await service.initiateSAMLLogin('team-123');

      expect(result.redirectUrl).toContain('idp.example.com');
      expect(result.requestId).toBe('req-123');
    });

    it('should throw BadRequestException when SAML not configured', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.initiateSAMLLogin('team-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('initiateSAMLLogout', () => {
    it('should create SAML logout request', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.createLogoutRequest.mockResolvedValue({
        redirectUrl: 'https://idp.example.com/slo?SAMLRequest=...',
        requestId: 'logout-123',
      });

      const result = await service.initiateSAMLLogout('team-123', 'user@example.com');

      expect(result.redirectUrl).toBeDefined();
      expect(result.requestId).toBe('logout-123');
    });

    it('should throw BadRequestException when SLO not configured', async () => {
      const configWithoutSLO = { ...mockSSOConfig, samlSloUrl: undefined };
      ssoConfigRepository.findOne.mockResolvedValue(configWithoutSLO);

      await expect(service.initiateSAMLLogout('team-123', 'user@example.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createOIDCConfig', () => {
    const oidcDto = {
      displayName: 'OIDC SSO',
      issuer: 'https://oidc.example.com',
      clientId: 'client-123',
      clientSecret: 'secret-123',
    };

    it('should create OIDC config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);
      const oidcConfig = { ...mockSSOConfig, provider: SSOProvider.OIDC };
      ssoConfigRepository.create.mockReturnValue(oidcConfig);
      ssoConfigRepository.save.mockResolvedValue(oidcConfig);

      const result = await service.createOIDCConfig('team-123', oidcDto);

      expect(ssoConfigRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when OIDC config exists', async () => {
      const existingOIDC = { ...mockSSOConfig, provider: SSOProvider.OIDC };
      ssoConfigRepository.findOne.mockResolvedValue(existingOIDC);

      await expect(service.createOIDCConfig('team-123', oidcDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('initiateOIDCLogin', () => {
    it('should create OIDC authorization URL', async () => {
      const oidcConfig = {
        ...mockSSOConfig,
        provider: SSOProvider.OIDC,
        oidcIssuer: 'https://oidc.example.com',
        oidcClientId: 'client-123',
        oidcAuthorizationUrl: 'https://oidc.example.com/authorize',
        oidcScopes: ['openid', 'email', 'profile'],
      };
      ssoConfigRepository.findOne.mockResolvedValue(oidcConfig);

      const result = await service.initiateOIDCLogin('team-123');

      expect(result.redirectUrl).toContain('client_id=client-123');
      expect(result.redirectUrl).toContain('response_type=code');
      expect(result.state).toBeDefined();
    });

    it('should throw BadRequestException when OIDC not configured', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.initiateOIDCLogin('team-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createLDAPConfig', () => {
    const ldapDto = {
      displayName: 'LDAP SSO',
      url: 'ldap://ldap.example.com:389',
      bindDn: 'cn=admin,dc=example,dc=com',
      bindPassword: 'password',
      searchBase: 'dc=example,dc=com',
    };

    it('should create LDAP config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);
      const ldapConfig = { ...mockSSOConfig, provider: SSOProvider.LDAP };
      ssoConfigRepository.create.mockReturnValue(ldapConfig);
      ssoConfigRepository.save.mockResolvedValue(ldapConfig);

      const result = await service.createLDAPConfig('team-123', ldapDto);

      expect(ssoConfigRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when LDAP config exists', async () => {
      const existingLDAP = { ...mockSSOConfig, provider: SSOProvider.LDAP };
      ssoConfigRepository.findOne.mockResolvedValue(existingLDAP);

      await expect(service.createLDAPConfig('team-123', ldapDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateConfig', () => {
    it('should update common SSO config properties', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      ssoConfigRepository.save.mockResolvedValue({
        ...mockSSOConfig,
        displayName: 'Updated Name',
      });

      const result = await service.updateConfig('team-123', 'config-123', {
        displayName: 'Updated Name',
        autoProvision: true,
      });

      expect(ssoConfigRepository.save).toHaveBeenCalled();
    });
  });

  describe('activateConfig', () => {
    it('should activate config and deactivate others', async () => {
      const inactiveConfig = { ...mockSSOConfig, status: SSOStatus.INACTIVE };
      ssoConfigRepository.findOne.mockResolvedValue(inactiveConfig);
      ssoConfigRepository.update.mockResolvedValue({ affected: 1 } as any);
      ssoConfigRepository.save.mockResolvedValue({ ...mockSSOConfig, status: SSOStatus.ACTIVE });

      const result = await service.activateConfig('team-123', 'config-123');

      expect(ssoConfigRepository.update).toHaveBeenCalledWith(
        { teamId: 'team-123', status: SSOStatus.ACTIVE },
        { status: SSOStatus.INACTIVE },
      );
      expect(result.status).toBe(SSOStatus.ACTIVE);
    });
  });

  describe('deactivateConfig', () => {
    it('should deactivate config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      ssoConfigRepository.save.mockResolvedValue({ ...mockSSOConfig, status: SSOStatus.INACTIVE });

      const result = await service.deactivateConfig('team-123', 'config-123');

      expect(result.status).toBe(SSOStatus.INACTIVE);
    });
  });

  describe('deleteConfig', () => {
    it('should delete config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      ssoConfigRepository.remove.mockResolvedValue(mockSSOConfig);

      await service.deleteConfig('team-123', 'config-123');

      expect(ssoConfigRepository.remove).toHaveBeenCalledWith(mockSSOConfig);
    });
  });

  describe('testConnection', () => {
    it('should test SAML connection', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.testSAMLConfiguration.mockResolvedValue({ valid: true, errors: [] });
      mockSAMLService.validateCertificate.mockReturnValue({
        valid: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.testConnection('team-123', 'config-123');

      expect(result.success).toBe(true);
      expect(result.details).toBeDefined();
    });

    it('should return failure for invalid SAML config', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.testSAMLConfiguration.mockResolvedValue({
        valid: false,
        errors: ['Invalid certificate'],
      });

      const result = await service.testConnection('team-123', 'config-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid');
    });

    it('should test LDAP connection', async () => {
      const ldapConfig = { ...mockSSOConfig, provider: SSOProvider.LDAP };
      ssoConfigRepository.findOne.mockResolvedValue(ldapConfig);

      const result = await service.testConnection('team-123', 'config-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('LDAP');
    });
  });

  describe('createSession', () => {
    it('should create SSO session', async () => {
      ssoSessionRepository.create.mockReturnValue(mockSSOSession);
      ssoSessionRepository.save.mockResolvedValue(mockSSOSession);

      const result = await service.createSession('config-123', 'user-123', 'external-123');

      expect(ssoSessionRepository.create).toHaveBeenCalled();
      expect(result.userId).toBe('user-123');
    });
  });

  describe('getSession', () => {
    it('should return SSO session for user', async () => {
      ssoSessionRepository.findOne.mockResolvedValue(mockSSOSession);

      const result = await service.getSession('user-123');

      expect(result?.userId).toBe('user-123');
    });
  });

  describe('deleteSession', () => {
    it('should delete SSO session', async () => {
      ssoSessionRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteSession('session-123');

      expect(ssoSessionRepository.delete).toHaveBeenCalledWith({ id: 'session-123' });
    });
  });

  describe('processSAMLResponse', () => {
    it('should process SAML response and return user info', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.parseLoginResponse.mockResolvedValue({
        user: {
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          nameId: 'user@example.com',
        },
        sessionIndex: 'session-idx-123',
      });

      const result = await service.processSAMLResponse('team-123', 'base64SAMLResponse');

      expect(result.user.email).toBe('user@example.com');
      expect(result.sessionIndex).toBe('session-idx-123');
    });

    it('should reject email from disallowed domain', async () => {
      ssoConfigRepository.findOne.mockResolvedValue({
        ...mockSSOConfig,
        allowedDomains: ['allowed.com'],
      });
      mockSAMLService.parseLoginResponse.mockResolvedValue({
        user: { email: 'user@disallowed.com', nameId: 'user@disallowed.com' },
      });

      await expect(service.processSAMLResponse('team-123', 'base64SAMLResponse')).rejects.toThrow(BadRequestException);
    });
  });

  describe('authenticateLDAP', () => {
    it('should authenticate LDAP user', async () => {
      const ldapConfig = { ...mockSSOConfig, provider: SSOProvider.LDAP };
      ssoConfigRepository.findOne.mockResolvedValue(ldapConfig);
      mockLdapService.authenticate.mockResolvedValue({
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        username: 'testuser',
        dn: 'cn=testuser,dc=example,dc=com',
        groups: ['group1'],
      });
      mockLdapService.getConfig.mockResolvedValue({});

      const result = await service.authenticateLDAP('team-123', 'testuser', 'password');

      expect(result.user.email).toBe('user@example.com');
      expect(result.dn).toContain('testuser');
    });

    it('should throw BadRequestException when LDAP not configured', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.authenticateLDAP('team-123', 'user', 'pass')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid credentials', async () => {
      const ldapConfig = { ...mockSSOConfig, provider: SSOProvider.LDAP };
      ssoConfigRepository.findOne.mockResolvedValue(ldapConfig);
      mockLdapService.authenticate.mockResolvedValue(null);

      await expect(service.authenticateLDAP('team-123', 'user', 'wrong-pass')).rejects.toThrow(BadRequestException);
    });
  });

  describe('discoverSSO', () => {
    it('should discover SSO by email domain', async () => {
      ssoConfigRepository.find.mockResolvedValue([mockSSOConfig]);
      // initiateSAMLLogin internally calls getActiveConfig which uses findOne
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);
      mockSAMLService.createLoginRequest.mockResolvedValue({
        redirectUrl: 'https://idp.example.com/sso',
        requestId: 'req-123',
      });

      const result = await service.discoverSSO('user@example.com');

      expect(result.hasSSO).toBe(true);
      expect(result.provider).toBe(SSOProvider.SAML);
    });

    it('should return hasSSO=false for unknown domain', async () => {
      ssoConfigRepository.find.mockResolvedValue([]);

      const result = await service.discoverSSO('user@unknown.com');

      expect(result.hasSSO).toBe(false);
    });

    it('should return hasSSO=false for invalid email', async () => {
      const result = await service.discoverSSO('invalid-email');

      expect(result.hasSSO).toBe(false);
    });
  });

  describe('getOrCreateUser', () => {
    it('should return user provisioning result', async () => {
      ssoConfigRepository.findOne.mockResolvedValue(mockSSOConfig);

      const result = await service.getOrCreateUser('team-123', 'config-123', {
        email: 'user@example.com',
        externalId: 'ext-123',
      });

      expect(result.userId).toBeDefined();
      expect(result.isNew).toBe(mockSSOConfig.autoProvision);
    });
  });
});
