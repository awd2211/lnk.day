import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { SSOController } from './sso.controller';
import { SSOService } from './sso.service';
import { SSOProvider, SSOStatus } from './entities/sso-config.entity';

describe('SSOController', () => {
  let controller: SSOController;
  let ssoService: jest.Mocked<SSOService>;

  const mockSSOService = {
    getConfigs: jest.fn(),
    getConfig: jest.fn(),
    getActiveConfig: jest.fn(),
    createSAMLConfig: jest.fn(),
    createSAMLConfigFromMetadata: jest.fn(),
    updateSAMLConfig: jest.fn(),
    getSAMLMetadata: jest.fn(),
    initiateSAMLLogin: jest.fn(),
    initiateSAMLLogout: jest.fn(),
    createOIDCConfig: jest.fn(),
    initiateOIDCLogin: jest.fn(),
    createLDAPConfig: jest.fn(),
    updateConfig: jest.fn(),
    activateConfig: jest.fn(),
    deactivateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    testConnection: jest.fn(),
    processSAMLResponse: jest.fn(),
    processSAMLLogoutResponse: jest.fn(),
    handleOIDCCallback: jest.fn(),
    authenticateLDAP: jest.fn(),
    discoverSSO: jest.fn(),
    getOrCreateUser: jest.fn(),
    createSession: jest.fn(),
  };

  const mockSSOConfig = {
    id: 'config-123',
    teamId: 'team-123',
    provider: SSOProvider.SAML,
    status: SSOStatus.ACTIVE,
    displayName: 'Test SSO',
    samlEntityId: 'https://idp.example.com',
    samlSsoUrl: 'https://idp.example.com/sso',
    oidcScopes: [],
    attributeMapping: {},
    autoProvision: true,
    enforceSSO: false,
    allowedDomains: ['example.com'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SSOController],
      providers: [
        {
          provide: SSOService,
          useValue: mockSSOService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<SSOController>(SSOController);
    ssoService = module.get(SSOService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfigs', () => {
    it('should return SSO configs for a team', async () => {
      mockSSOService.getConfigs.mockResolvedValue([mockSSOConfig]);

      const result = await controller.getConfigs('team-123');

      expect(ssoService.getConfigs).toHaveBeenCalledWith('team-123');
      expect(result).toHaveLength(1);
    });
  });

  describe('getConfig', () => {
    it('should return a single SSO config', async () => {
      mockSSOService.getConfig.mockResolvedValue(mockSSOConfig);

      const result = await controller.getConfig('team-123', 'config-123');

      expect(ssoService.getConfig).toHaveBeenCalledWith('team-123', 'config-123');
      expect(result.id).toBe('config-123');
    });
  });

  describe('createSAMLConfig', () => {
    it('should create SAML config', async () => {
      const dto = {
        displayName: 'New SAML',
        entityId: 'https://idp.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'MIIC...',
      };
      mockSSOService.createSAMLConfig.mockResolvedValue(mockSSOConfig);

      const result = await controller.createSAMLConfig('team-123', dto);

      expect(ssoService.createSAMLConfig).toHaveBeenCalledWith('team-123', dto);
      expect(result.provider).toBe(SSOProvider.SAML);
    });
  });

  describe('createSAMLConfigFromMetadata', () => {
    it('should create SAML config from metadata', async () => {
      const dto = {
        metadataXml: '<EntityDescriptor>...</EntityDescriptor>',
        displayName: 'From Metadata',
      };
      mockSSOService.createSAMLConfigFromMetadata.mockResolvedValue(mockSSOConfig);

      const result = await controller.createSAMLConfigFromMetadata('team-123', dto);

      expect(ssoService.createSAMLConfigFromMetadata).toHaveBeenCalledWith('team-123', dto);
    });
  });

  describe('updateSAMLConfig', () => {
    it('should update SAML config', async () => {
      const dto = { displayName: 'Updated SAML' };
      mockSSOService.updateSAMLConfig.mockResolvedValue({ ...mockSSOConfig, ...dto });

      const result = await controller.updateSAMLConfig('team-123', 'config-123', dto);

      expect(ssoService.updateSAMLConfig).toHaveBeenCalledWith('team-123', 'config-123', dto);
    });
  });

  describe('getSAMLMetadata', () => {
    it('should return SP metadata', async () => {
      const metadata = {
        entityId: 'https://app.lnk.day/sso/saml/team-123',
        acsUrl: 'https://app.lnk.day/sso/saml/team-123/acs',
        sloUrl: 'https://app.lnk.day/sso/saml/team-123/slo',
        metadataXml: '<SPMetadata>...</SPMetadata>',
      };
      mockSSOService.getSAMLMetadata.mockResolvedValue(metadata);

      const result = await controller.getSAMLMetadata('team-123');

      expect(result.entityId).toBeDefined();
      expect(result.metadataXml).toBeDefined();
    });
  });

  describe('downloadSAMLMetadata', () => {
    it('should return metadata for download', async () => {
      const metadata = {
        entityId: 'https://app.lnk.day/sso/saml/team-123',
        acsUrl: 'https://app.lnk.day/sso/saml/team-123/acs',
        sloUrl: 'https://app.lnk.day/sso/saml/team-123/slo',
        metadataXml: '<SPMetadata>...</SPMetadata>',
      };
      mockSSOService.getSAMLMetadata.mockResolvedValue(metadata);

      const result = await controller.downloadSAMLMetadata('team-123');

      expect(result.contentType).toBe('application/xml');
      expect(result.filename).toContain('team-123');
      expect(result.content).toBe(metadata.metadataXml);
    });
  });

  describe('initiateSAMLLogin', () => {
    it('should initiate SAML login', async () => {
      mockSSOService.initiateSAMLLogin.mockResolvedValue({
        redirectUrl: 'https://idp.example.com/sso?SAMLRequest=...',
        requestId: 'req-123',
      });

      const result = await controller.initiateSAMLLogin('team-123', '/dashboard');

      expect(ssoService.initiateSAMLLogin).toHaveBeenCalledWith('team-123', '/dashboard');
      expect(result.redirectUrl).toBeDefined();
    });
  });

  describe('initiateSAMLLogout', () => {
    it('should initiate SAML logout', async () => {
      mockSSOService.initiateSAMLLogout.mockResolvedValue({
        redirectUrl: 'https://idp.example.com/slo?SAMLRequest=...',
        requestId: 'logout-123',
      });

      const result = await controller.initiateSAMLLogout('team-123', {
        nameId: 'user@example.com',
        sessionIndex: 'session-idx',
      });

      expect(ssoService.initiateSAMLLogout).toHaveBeenCalledWith('team-123', 'user@example.com', 'session-idx');
    });
  });

  describe('createOIDCConfig', () => {
    it('should create OIDC config', async () => {
      const dto = {
        displayName: 'OIDC SSO',
        issuer: 'https://oidc.example.com',
        clientId: 'client-123',
        clientSecret: 'secret-123',
      };
      const oidcConfig = { ...mockSSOConfig, provider: SSOProvider.OIDC };
      mockSSOService.createOIDCConfig.mockResolvedValue(oidcConfig);

      const result = await controller.createOIDCConfig('team-123', dto);

      expect(ssoService.createOIDCConfig).toHaveBeenCalledWith('team-123', dto);
    });
  });

  describe('initiateOIDCLogin', () => {
    it('should initiate OIDC login', async () => {
      mockSSOService.initiateOIDCLogin.mockResolvedValue({
        redirectUrl: 'https://oidc.example.com/authorize?...',
        state: 'random-state',
      });

      const result = await controller.initiateOIDCLogin('team-123');

      expect(ssoService.initiateOIDCLogin).toHaveBeenCalledWith('team-123');
      expect(result.redirectUrl).toBeDefined();
    });
  });

  describe('createLDAPConfig', () => {
    it('should create LDAP config', async () => {
      const dto = {
        displayName: 'LDAP SSO',
        url: 'ldap://ldap.example.com:389',
        bindDn: 'cn=admin,dc=example,dc=com',
        bindPassword: 'password',
        searchBase: 'dc=example,dc=com',
      };
      const ldapConfig = { ...mockSSOConfig, provider: SSOProvider.LDAP };
      mockSSOService.createLDAPConfig.mockResolvedValue(ldapConfig);

      const result = await controller.createLDAPConfig('team-123', dto);

      expect(ssoService.createLDAPConfig).toHaveBeenCalledWith('team-123', dto);
    });
  });

  describe('updateConfig', () => {
    it('should update SSO config', async () => {
      const dto = { displayName: 'Updated Config' };
      mockSSOService.updateConfig.mockResolvedValue({ ...mockSSOConfig, ...dto });

      const result = await controller.updateConfig('team-123', 'config-123', dto);

      expect(ssoService.updateConfig).toHaveBeenCalledWith('team-123', 'config-123', dto);
    });
  });

  describe('activateConfig', () => {
    it('should activate SSO config', async () => {
      mockSSOService.activateConfig.mockResolvedValue({
        ...mockSSOConfig,
        status: SSOStatus.ACTIVE,
      });

      const result = await controller.activateConfig('team-123', 'config-123');

      expect(ssoService.activateConfig).toHaveBeenCalledWith('team-123', 'config-123');
    });
  });

  describe('deactivateConfig', () => {
    it('should deactivate SSO config', async () => {
      mockSSOService.deactivateConfig.mockResolvedValue({
        ...mockSSOConfig,
        status: SSOStatus.INACTIVE,
      });

      const result = await controller.deactivateConfig('team-123', 'config-123');

      expect(ssoService.deactivateConfig).toHaveBeenCalledWith('team-123', 'config-123');
    });
  });

  describe('deleteConfig', () => {
    it('should delete SSO config', async () => {
      mockSSOService.deleteConfig.mockResolvedValue(undefined);

      const result = await controller.deleteConfig('team-123', 'config-123');

      expect(ssoService.deleteConfig).toHaveBeenCalledWith('team-123', 'config-123');
      expect(result.message).toContain('deleted');
    });
  });

  describe('testConnection', () => {
    it('should test SSO connection', async () => {
      mockSSOService.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        details: {},
      });

      const result = await controller.testConnection('team-123', 'config-123');

      expect(ssoService.testConnection).toHaveBeenCalledWith('team-123', 'config-123');
      expect(result.success).toBe(true);
    });
  });

  describe('samlACS', () => {
    it('should process SAML ACS callback', async () => {
      mockSSOService.processSAMLResponse.mockResolvedValue({
        user: {
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          externalId: 'user@example.com',
        },
        sessionIndex: 'session-idx',
      });
      mockSSOService.getActiveConfig.mockResolvedValue(mockSSOConfig);
      mockSSOService.getOrCreateUser.mockResolvedValue({
        userId: 'user-123',
        isNew: false,
      });
      mockSSOService.createSession.mockResolvedValue({} as any);

      const result = await controller.samlACS('team-123', {
        SAMLResponse: 'base64SAMLResponse',
        RelayState: '/dashboard',
      });

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.redirectUrl).toBe('/dashboard');
    });

    it('should return error when SSO config not found', async () => {
      mockSSOService.processSAMLResponse.mockResolvedValue({
        user: { email: 'user@example.com' },
      });
      mockSSOService.getActiveConfig.mockResolvedValue(null);

      const result = await controller.samlACS('team-123', {
        SAMLResponse: 'base64SAMLResponse',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('samlSLO', () => {
    it('should process SAML SLO', async () => {
      const result = await controller.samlSLO('team-123', { SAMLResponse: 'response' });

      expect(result.success).toBe(true);
    });
  });

  describe('oidcCallback', () => {
    it('should handle OIDC callback', async () => {
      mockSSOService.handleOIDCCallback.mockResolvedValue({
        user: {
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          externalId: 'oidc-user-id',
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      });
      mockSSOService.getActiveConfig.mockResolvedValue(mockSSOConfig);
      mockSSOService.getOrCreateUser.mockResolvedValue({
        userId: 'user-123',
        isNew: false,
      });
      mockSSOService.createSession.mockResolvedValue({} as any);

      const result = await controller.oidcCallback('team-123', 'auth-code', 'state');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.accessToken).toBe('access-token');
    });

    it('should return error from OIDC provider', async () => {
      const result = await controller.oidcCallback(
        'team-123',
        '',
        'state',
        'access_denied',
        'User denied access',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('access_denied');
    });
  });

  describe('ldapAuth', () => {
    it('should authenticate via LDAP', async () => {
      mockSSOService.authenticateLDAP.mockResolvedValue({
        user: {
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          externalId: 'ldap-user-id',
        },
        dn: 'cn=user,dc=example,dc=com',
      });
      mockSSOService.getActiveConfig.mockResolvedValue(mockSSOConfig);
      mockSSOService.getOrCreateUser.mockResolvedValue({
        userId: 'user-123',
        isNew: false,
      });
      mockSSOService.createSession.mockResolvedValue({} as any);

      const result = await controller.ldapAuth('team-123', {
        username: 'testuser',
        password: 'password',
      });

      expect(ssoService.authenticateLDAP).toHaveBeenCalledWith('team-123', 'testuser', 'password');
      expect(result.success).toBe(true);
    });
  });

  describe('discoverSSO', () => {
    it('should discover SSO by email', async () => {
      mockSSOService.discoverSSO.mockResolvedValue({
        hasSSO: true,
        provider: SSOProvider.SAML,
        teamId: 'team-123',
        loginUrl: 'https://idp.example.com/sso',
      });

      const result = await controller.discoverSSO('user@example.com');

      expect(ssoService.discoverSSO).toHaveBeenCalledWith('user@example.com');
      expect(result.hasSSO).toBe(true);
    });

    it('should return no SSO for unknown domain', async () => {
      mockSSOService.discoverSSO.mockResolvedValue({ hasSSO: false });

      const result = await controller.discoverSSO('user@unknown.com');

      expect(result.hasSSO).toBe(false);
    });
  });
});
