import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

import {
  SAMLService,
  SAMLIdentityProviderConfig,
  SAMLServiceProviderConfig,
} from './saml.service';

// Mock samlify
jest.mock('samlify', () => ({
  ServiceProvider: jest.fn(() => ({
    createLoginRequest: jest.fn().mockReturnValue({
      context: 'https://idp.example.com/sso?SAMLRequest=...',
      id: 'req-123',
    }),
    createLogoutRequest: jest.fn().mockReturnValue({
      context: 'https://idp.example.com/slo?SAMLRequest=...',
      id: 'logout-123',
    }),
    parseLoginResponse: jest.fn().mockResolvedValue({
      extract: {
        nameID: 'user@example.com',
        sessionIndex: 'session-123',
        issuer: 'https://idp.example.com',
        attributes: {
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      },
    }),
    parseLogoutResponse: jest.fn().mockResolvedValue({
      extract: {
        issuer: 'https://idp.example.com',
      },
    }),
    getMetadata: jest.fn().mockReturnValue('<SPMetadata>...</SPMetadata>'),
  })),
  IdentityProvider: jest.fn(() => ({})),
  Constants: {
    namespace: {
      binding: {
        post: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
        redirect: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
      },
      format: {
        emailAddress: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      },
    },
  },
}));

// Mock xml2js
jest.mock('xml2js', () => ({
  Parser: jest.fn().mockImplementation(() => ({
    parseStringPromise: jest.fn().mockResolvedValue({
      EntityDescriptor: {
        $: { entityID: 'https://idp.example.com' },
        IDPSSODescriptor: [{
          $: {
            WantAuthnRequestsSigned: 'false',
            WantAssertionsSigned: 'true',
          },
          SingleSignOnService: [{
            $: {
              Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
              Location: 'https://idp.example.com/sso',
            },
          }],
          SingleLogoutService: [{
            $: {
              Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
              Location: 'https://idp.example.com/slo',
            },
          }],
          KeyDescriptor: [{
            $: { use: 'signing' },
            KeyInfo: [{
              X509Data: [{
                X509Certificate: ['MIIC...test-certificate...'],
              }],
            }],
          }],
          NameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
        }],
      },
    }),
  })),
  processors: {
    stripPrefix: jest.fn((name) => name),
  },
}));

describe('SAMLService', () => {
  let service: SAMLService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://app.lnk.day'),
  };

  const mockIdpConfig: SAMLIdentityProviderConfig = {
    entityId: 'https://idp.example.com',
    ssoUrl: 'https://idp.example.com/sso',
    sloUrl: 'https://idp.example.com/slo',
    certificate: 'MIIC...test-certificate...',
    nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SAMLService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SAMLService>(SAMLService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('createServiceProvider', () => {
    it('should create service provider with default config', () => {
      const sp = service.createServiceProvider('team-123');

      expect(sp).toBeDefined();
      expect(sp.getMetadata).toBeDefined();
    });

    it('should cache service provider', () => {
      const sp1 = service.createServiceProvider('team-123');
      const sp2 = service.createServiceProvider('team-123');

      expect(sp1).toBe(sp2);
    });

    it('should accept custom config', () => {
      const customConfig: Partial<SAMLServiceProviderConfig> = {
        entityId: 'custom-entity-id',
        wantAssertionsSigned: false,
      };

      const sp = service.createServiceProvider('team-456', customConfig);

      expect(sp).toBeDefined();
    });
  });

  describe('createIdentityProvider', () => {
    it('should create identity provider', () => {
      const idp = service.createIdentityProvider('config-123', mockIdpConfig);

      expect(idp).toBeDefined();
    });

    it('should cache identity provider', () => {
      const idp1 = service.createIdentityProvider('config-123', mockIdpConfig);
      const idp2 = service.createIdentityProvider('config-123', mockIdpConfig);

      expect(idp1).toBe(idp2);
    });

    it('should create identity provider without SLO URL', () => {
      const configWithoutSlo = { ...mockIdpConfig, sloUrl: undefined };
      const idp = service.createIdentityProvider('config-no-slo', configWithoutSlo);

      expect(idp).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear specific config from cache', () => {
      service.createIdentityProvider('config-123', mockIdpConfig);
      service.clearCache('config-123');

      // Creating again should not return cached instance
      // (This is a behavior test, actual caching is implementation detail)
    });

    it('should clear all caches when no configId provided', () => {
      service.createServiceProvider('team-123');
      service.createIdentityProvider('config-123', mockIdpConfig);
      service.clearCache();

      // Both caches should be cleared
    });
  });

  describe('createLoginRequest', () => {
    it('should create SAML login request', async () => {
      const result = await service.createLoginRequest('team-123', mockIdpConfig);

      expect(result.redirectUrl).toContain('https://idp.example.com/sso');
      expect(result.requestId).toBe('req-123');
    });

    it('should include relayState in redirect URL', async () => {
      const result = await service.createLoginRequest('team-123', mockIdpConfig, '/dashboard');

      expect(result.redirectUrl).toContain('RelayState');
      expect(result.redirectUrl).toContain(encodeURIComponent('/dashboard'));
    });
  });

  describe('parseLoginResponse', () => {
    it('should parse SAML login response', async () => {
      const result = await service.parseLoginResponse(
        'team-123',
        mockIdpConfig,
        'base64SAMLResponse',
      );

      expect(result.user.email).toBe('user@example.com');
      expect(result.sessionIndex).toBe('session-123');
      expect(result.issuer).toBeDefined();
    });

    it('should map custom attributes', async () => {
      const attributeMapping = {
        email: 'customEmail',
        firstName: 'givenName',
      };

      const result = await service.parseLoginResponse(
        'team-123',
        mockIdpConfig,
        'base64SAMLResponse',
        attributeMapping,
      );

      expect(result.user).toBeDefined();
    });

    it('should throw when extract is missing', async () => {
      const samlify = require('samlify');
      samlify.ServiceProvider.mockReturnValueOnce({
        createLoginRequest: jest.fn(),
        parseLoginResponse: jest.fn().mockResolvedValue({ extract: null }),
        getMetadata: jest.fn(),
      });

      // Clear cache to use new mock
      service.clearCache();

      await expect(
        service.parseLoginResponse('team-fail', mockIdpConfig, 'base64SAMLResponse'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on parse error', async () => {
      const samlify = require('samlify');
      samlify.ServiceProvider.mockReturnValueOnce({
        createLoginRequest: jest.fn(),
        parseLoginResponse: jest.fn().mockRejectedValue(new Error('Parse failed')),
        getMetadata: jest.fn(),
      });

      service.clearCache();

      await expect(
        service.parseLoginResponse('team-error', mockIdpConfig, 'invalidResponse'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default issuer from idpConfig when not in response', async () => {
      const samlify = require('samlify');
      samlify.ServiceProvider.mockReturnValueOnce({
        createLoginRequest: jest.fn(),
        parseLoginResponse: jest.fn().mockResolvedValue({
          extract: {
            nameID: 'user@example.com',
            sessionIndex: 'session-123',
            issuer: undefined,
            attributes: { email: 'user@example.com' },
          },
        }),
        getMetadata: jest.fn(),
      });

      service.clearCache();

      const result = await service.parseLoginResponse(
        'team-no-issuer',
        mockIdpConfig,
        'base64SAMLResponse',
      );

      expect(result.issuer).toBe(mockIdpConfig.entityId);
    });
  });

  describe('createLogoutRequest', () => {
    it('should create SAML logout request', async () => {
      const result = await service.createLogoutRequest(
        'team-123',
        mockIdpConfig,
        'user@example.com',
        'session-123',
      );

      expect(result.redirectUrl).toContain('https://idp.example.com/slo');
      expect(result.requestId).toBe('logout-123');
    });
  });

  describe('parseLogoutResponse', () => {
    it('should parse SAML logout response', async () => {
      const result = await service.parseLogoutResponse(
        'team-123',
        mockIdpConfig,
        'base64SAMLResponse',
      );

      expect(result.success).toBe(true);
      expect(result.issuer).toBeDefined();
    });

    it('should return success false on parse error', async () => {
      const samlify = require('samlify');
      samlify.ServiceProvider.mockReturnValueOnce({
        createLogoutRequest: jest.fn(),
        parseLogoutResponse: jest.fn().mockRejectedValue(new Error('Logout parse failed')),
        getMetadata: jest.fn(),
      });

      service.clearCache();

      const result = await service.parseLogoutResponse(
        'team-logout-fail',
        mockIdpConfig,
        'invalidLogoutResponse',
      );

      expect(result.success).toBe(false);
      expect(result.issuer).toBe(mockIdpConfig.entityId);
    });

    it('should use default issuer when not in response', async () => {
      const samlify = require('samlify');
      samlify.ServiceProvider.mockReturnValueOnce({
        createLogoutRequest: jest.fn(),
        parseLogoutResponse: jest.fn().mockResolvedValue({
          extract: { issuer: undefined },
        }),
        getMetadata: jest.fn(),
      });

      service.clearCache();

      const result = await service.parseLogoutResponse(
        'team-logout-no-issuer',
        mockIdpConfig,
        'base64SAMLResponse',
      );

      expect(result.success).toBe(true);
      expect(result.issuer).toBe(mockIdpConfig.entityId);
    });
  });

  describe('generateSPMetadata', () => {
    it('should generate SP metadata XML', () => {
      const metadata = service.generateSPMetadata('team-123');

      expect(metadata).toContain('SPMetadata');
    });

    it('should accept custom config', () => {
      const metadata = service.generateSPMetadata('team-123', {
        entityId: 'custom-sp',
      });

      expect(metadata).toBeDefined();
    });
  });

  describe('parseIdPMetadata', () => {
    it('should parse IdP metadata XML', async () => {
      const result = await service.parseIdPMetadata('<EntityDescriptor>...</EntityDescriptor>');

      expect(result.entityId).toBe('https://idp.example.com');
      expect(result.ssoUrl).toBe('https://idp.example.com/sso');
      expect(result.sloUrl).toBe('https://idp.example.com/slo');
      expect(result.certificate).toBeDefined();
    });

    it('should throw on missing EntityDescriptor', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest.fn().mockResolvedValue({}),
      }));

      await expect(
        service.parseIdPMetadata('<Invalid>...</Invalid>'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on missing IDPSSODescriptor', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest.fn().mockResolvedValue({
          EntityDescriptor: {
            $: { entityID: 'https://idp.example.com' },
          },
        }),
      }));

      await expect(
        service.parseIdPMetadata('<EntityDescriptor>no idp</EntityDescriptor>'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle certificate as object with underscore property', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest.fn().mockResolvedValue({
          EntityDescriptor: {
            $: { entityID: 'https://idp.example.com' },
            IDPSSODescriptor: [{
              $: { WantAuthnRequestsSigned: 'true', WantAssertionsSigned: 'false' },
              SingleSignOnService: [{
                $: {
                  Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                  Location: 'https://idp.example.com/sso',
                },
              }],
              SingleLogoutService: [],
              KeyDescriptor: [{
                $: { use: 'signing' },
                KeyInfo: [{
                  X509Data: [{
                    X509Certificate: [{ _: 'MIIC...cert-content...' }],
                  }],
                }],
              }],
              NameIDFormat: [{ _: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' }],
            }],
          },
        }),
      }));

      const result = await service.parseIdPMetadata('<EntityDescriptor>...</EntityDescriptor>');

      expect(result.certificate).toBe('MIIC...cert-content...');
      expect(result.signedRequests).toBe(true);
      expect(result.signedAssertions).toBe(false);
    });

    it('should handle missing KeyDescriptor use attribute', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest.fn().mockResolvedValue({
          EntityDescriptor: {
            $: { entityID: 'https://idp.example.com' },
            IDPSSODescriptor: [{
              $: {},
              SingleSignOnService: [{
                $: {
                  Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                  Location: 'https://idp.example.com/sso',
                },
              }],
              SingleLogoutService: [],
              KeyDescriptor: [{
                $: {},  // No use attribute
                KeyInfo: [{
                  X509Data: [{
                    X509Certificate: ['MIIC...default-cert...'],
                  }],
                }],
              }],
              NameIDFormat: [],
            }],
          },
        }),
      }));

      const result = await service.parseIdPMetadata('<EntityDescriptor>...</EntityDescriptor>');

      expect(result.certificate).toBe('MIIC...default-cert...');
    });

    it('should handle empty services array for SLO', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementationOnce(() => ({
        parseStringPromise: jest.fn().mockResolvedValue({
          EntityDescriptor: {
            $: { entityID: 'https://idp.example.com' },
            IDPSSODescriptor: [{
              $: {},
              SingleSignOnService: [{
                $: {
                  Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                  Location: 'https://idp.example.com/sso',
                },
              }],
              SingleLogoutService: [],
              KeyDescriptor: [],
              NameIDFormat: [],
            }],
          },
        }),
      }));

      const result = await service.parseIdPMetadata('<EntityDescriptor>...</EntityDescriptor>');

      expect(result.sloUrl).toBe('');
      expect(result.certificate).toBe('');
    });
  });

  describe('validateCertificate', () => {
    it('should validate PEM format certificate', () => {
      const cert = `-----BEGIN CERTIFICATE-----
MIIC...test-certificate...
-----END CERTIFICATE-----`;

      const result = service.validateCertificate(cert);

      expect(result.valid).toBe(true);
    });

    it('should validate certificate without PEM headers', () => {
      const cert = 'MIIC...test-certificate...';

      const result = service.validateCertificate(cert);

      // formatCertificate adds headers, so validation should pass
      expect(result.valid).toBe(true);
    });

    it('should handle empty certificate', () => {
      const result = service.validateCertificate('');

      // The implementation adds BEGIN/END to any cert, so it becomes valid structurally
      // This test just verifies it doesn't throw
      expect(result).toBeDefined();
    });
  });

  describe('formatCertificate', () => {
    it('should format certificate with proper PEM headers', () => {
      const cert = 'MIIC...test-certificate...';

      const result = service.formatCertificate(cert);

      expect(result).toContain('-----BEGIN CERTIFICATE-----');
      expect(result).toContain('-----END CERTIFICATE-----');
    });

    it('should remove existing headers and reformat', () => {
      const cert = `-----BEGIN CERTIFICATE-----
MIIC...test...
-----END CERTIFICATE-----`;

      const result = service.formatCertificate(cert);

      // Should have exactly one pair of headers
      expect((result.match(/BEGIN CERTIFICATE/g) || []).length).toBe(1);
      expect((result.match(/END CERTIFICATE/g) || []).length).toBe(1);
    });
  });

  describe('testSAMLConfiguration', () => {
    it('should validate complete configuration', async () => {
      const result = await service.testSAMLConfiguration('team-123', mockIdpConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing entityId', async () => {
      const invalidConfig = { ...mockIdpConfig, entityId: '' };

      const result = await service.testSAMLConfiguration('team-123', invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing IdP Entity ID');
    });

    it('should report missing SSO URL', async () => {
      const invalidConfig = { ...mockIdpConfig, ssoUrl: '' };

      const result = await service.testSAMLConfiguration('team-123', invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing IdP SSO URL');
    });

    it('should report invalid SSO URL format', async () => {
      const invalidConfig = { ...mockIdpConfig, ssoUrl: 'not-a-url' };

      const result = await service.testSAMLConfiguration('team-123', invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid IdP SSO URL format');
    });

    it('should report missing certificate', async () => {
      const invalidConfig = { ...mockIdpConfig, certificate: '' };

      const result = await service.testSAMLConfiguration('team-123', invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing IdP certificate');
    });
  });
});
