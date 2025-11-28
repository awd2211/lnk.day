import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import * as samlify from 'samlify';
// import * as validator from '@authenio/samlify-xsd-schema-validator';

// Configure samlify with schema validator
// samlify.setSchemaValidator(validator);

export interface SAMLServiceProviderConfig {
  entityId: string;
  assertionConsumerServiceUrl: string;
  singleLogoutServiceUrl: string;
  privateKey?: string;
  certificate?: string;
  wantAssertionsSigned?: boolean;
  wantMessageSigned?: boolean;
  signatureAlgorithm?: string;
}

export interface SAMLIdentityProviderConfig {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  nameIdFormat?: string;
  wantLogoutRequestSigned?: boolean;
}

export interface SAMLAuthResponse {
  user: {
    nameId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string[];
    attributes: Record<string, any>;
  };
  sessionIndex?: string;
  issuer: string;
}

export interface ParsedIdPMetadata {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  nameIdFormats: string[];
  signedRequests: boolean;
  signedAssertions: boolean;
}

@Injectable()
export class SAMLService {
  private readonly logger = new Logger(SAMLService.name);
  private readonly baseUrl: string;
  private spCache: Map<string, any> = new Map();
  private idpCache: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('APP_URL', 'https://app.lnk.day');
  }

  // ========== Service Provider Management ==========

  createServiceProvider(teamId: string, config?: Partial<SAMLServiceProviderConfig>): any {
    const cacheKey = `sp_${teamId}`;

    if (this.spCache.has(cacheKey)) {
      return this.spCache.get(cacheKey);
    }

    const spConfig: SAMLServiceProviderConfig = {
      entityId: config?.entityId || `${this.baseUrl}/sso/saml/${teamId}`,
      assertionConsumerServiceUrl: config?.assertionConsumerServiceUrl || `${this.baseUrl}/sso/saml/${teamId}/acs`,
      singleLogoutServiceUrl: config?.singleLogoutServiceUrl || `${this.baseUrl}/sso/saml/${teamId}/slo`,
      wantAssertionsSigned: config?.wantAssertionsSigned ?? true,
      wantMessageSigned: config?.wantMessageSigned ?? false,
      signatureAlgorithm: config?.signatureAlgorithm || 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      ...config,
    };

    const sp = samlify.ServiceProvider({
      entityID: spConfig.entityId,
      assertionConsumerService: [{
        Binding: samlify.Constants.namespace.binding.post,
        Location: spConfig.assertionConsumerServiceUrl,
      }],
      singleLogoutService: [{
        Binding: samlify.Constants.namespace.binding.post,
        Location: spConfig.singleLogoutServiceUrl,
      }],
      wantAssertionsSigned: spConfig.wantAssertionsSigned,
      authnRequestsSigned: !!spConfig.privateKey,
      privateKey: spConfig.privateKey,
      privateKeyPass: '',
      signingCert: spConfig.certificate,
      encPrivateKey: spConfig.privateKey,
      encPrivateKeyPass: '',
    });

    this.spCache.set(cacheKey, sp);
    return sp;
  }

  // ========== Identity Provider Management ==========

  createIdentityProvider(configId: string, idpConfig: SAMLIdentityProviderConfig): any {
    const cacheKey = `idp_${configId}`;

    if (this.idpCache.has(cacheKey)) {
      return this.idpCache.get(cacheKey);
    }

    const idp = samlify.IdentityProvider({
      entityID: idpConfig.entityId,
      singleSignOnService: [{
        Binding: samlify.Constants.namespace.binding.redirect,
        Location: idpConfig.ssoUrl,
      }, {
        Binding: samlify.Constants.namespace.binding.post,
        Location: idpConfig.ssoUrl,
      }],
      singleLogoutService: idpConfig.sloUrl ? [{
        Binding: samlify.Constants.namespace.binding.post,
        Location: idpConfig.sloUrl,
      }] : [],
      signingCert: this.formatCertificate(idpConfig.certificate),
      wantLogoutRequestSigned: idpConfig.wantLogoutRequestSigned ?? false,
      nameIDFormat: [idpConfig.nameIdFormat || samlify.Constants.namespace.format.emailAddress],
    });

    this.idpCache.set(cacheKey, idp);
    return idp;
  }

  clearCache(configId?: string): void {
    if (configId) {
      this.idpCache.delete(`idp_${configId}`);
    } else {
      this.idpCache.clear();
      this.spCache.clear();
    }
  }

  // ========== SAML Operations ==========

  async createLoginRequest(
    teamId: string,
    idpConfig: SAMLIdentityProviderConfig,
    relayState?: string,
  ): Promise<{ redirectUrl: string; requestId: string }> {
    const sp = this.createServiceProvider(teamId);
    const idp = this.createIdentityProvider(`${teamId}_login`, idpConfig);

    const { context, id } = sp.createLoginRequest(idp, 'redirect');

    let redirectUrl = context;
    if (relayState) {
      redirectUrl += `&RelayState=${encodeURIComponent(relayState)}`;
    }

    return {
      redirectUrl,
      requestId: id,
    };
  }

  async parseLoginResponse(
    teamId: string,
    idpConfig: SAMLIdentityProviderConfig,
    samlResponse: string,
    attributeMapping?: Record<string, string>,
  ): Promise<SAMLAuthResponse> {
    const sp = this.createServiceProvider(teamId);
    const idp = this.createIdentityProvider(`${teamId}_resp`, idpConfig);

    try {
      const parseResult = await sp.parseLoginResponse(idp, 'post', { body: { SAMLResponse: samlResponse } });

      if (!parseResult.extract) {
        throw new BadRequestException('Failed to extract SAML assertion');
      }

      const { nameID, sessionIndex, attributes } = parseResult.extract;
      const mapping = attributeMapping || {};

      // Map attributes
      const user = {
        nameId: nameID,
        email: this.getAttribute(attributes, mapping.email || 'email', nameID),
        firstName: this.getAttribute(attributes, mapping.firstName || 'firstName'),
        lastName: this.getAttribute(attributes, mapping.lastName || 'lastName'),
        displayName: this.getAttribute(attributes, mapping.displayName || 'displayName'),
        groups: this.getGroupAttribute(attributes, mapping.groups || 'groups'),
        attributes: attributes || {},
      };

      return {
        user,
        sessionIndex,
        issuer: parseResult.extract.issuer || idpConfig.entityId,
      };
    } catch (error: any) {
      this.logger.error(`SAML response parsing failed: ${error.message}`);
      throw new BadRequestException(`Invalid SAML response: ${error.message}`);
    }
  }

  async createLogoutRequest(
    teamId: string,
    idpConfig: SAMLIdentityProviderConfig,
    nameId: string,
    sessionIndex?: string,
  ): Promise<{ redirectUrl: string; requestId: string }> {
    const sp = this.createServiceProvider(teamId);
    const idp = this.createIdentityProvider(`${teamId}_logout`, idpConfig);

    const { context, id } = sp.createLogoutRequest(idp, 'redirect', {
      nameID: nameId,
      sessionIndex: sessionIndex,
    });

    return {
      redirectUrl: context,
      requestId: id,
    };
  }

  async parseLogoutResponse(
    teamId: string,
    idpConfig: SAMLIdentityProviderConfig,
    samlResponse: string,
  ): Promise<{ success: boolean; issuer: string }> {
    const sp = this.createServiceProvider(teamId);
    const idp = this.createIdentityProvider(`${teamId}_slo`, idpConfig);

    try {
      const parseResult = await sp.parseLogoutResponse(idp, 'post', { body: { SAMLResponse: samlResponse } });

      return {
        success: true,
        issuer: parseResult.extract?.issuer || idpConfig.entityId,
      };
    } catch (error: any) {
      this.logger.error(`SAML logout response parsing failed: ${error.message}`);
      return {
        success: false,
        issuer: idpConfig.entityId,
      };
    }
  }

  // ========== Metadata ==========

  generateSPMetadata(teamId: string, config?: Partial<SAMLServiceProviderConfig>): string {
    const sp = this.createServiceProvider(teamId, config);
    return sp.getMetadata();
  }

  async parseIdPMetadata(metadataXml: string): Promise<ParsedIdPMetadata> {
    try {
      const parser = new xml2js.Parser({
        tagNameProcessors: [xml2js.processors.stripPrefix],
        attrNameProcessors: [xml2js.processors.stripPrefix],
      });

      const result = await parser.parseStringPromise(metadataXml);
      const entityDescriptor = result.EntityDescriptor;

      if (!entityDescriptor) {
        throw new Error('Invalid IdP metadata: missing EntityDescriptor');
      }

      const entityId = entityDescriptor.$.entityID;
      const idpDescriptor = entityDescriptor.IDPSSODescriptor?.[0];

      if (!idpDescriptor) {
        throw new Error('Invalid IdP metadata: missing IDPSSODescriptor');
      }

      // Extract SSO URL
      const ssoServices = idpDescriptor.SingleSignOnService || [];
      const ssoUrl = this.findServiceUrl(ssoServices, [
        'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
        'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      ]);

      // Extract SLO URL
      const sloServices = idpDescriptor.SingleLogoutService || [];
      const sloUrl = this.findServiceUrl(sloServices, [
        'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
        'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
      ]);

      // Extract certificate
      const keyDescriptors = idpDescriptor.KeyDescriptor || [];
      const signingKey = keyDescriptors.find((k: any) => !k.$.use || k.$.use === 'signing');
      let certificate = '';

      if (signingKey?.KeyInfo?.[0]?.X509Data?.[0]?.X509Certificate?.[0]) {
        certificate = signingKey.KeyInfo[0].X509Data[0].X509Certificate[0];
        if (typeof certificate === 'object') {
          certificate = (certificate as any)._ || '';
        }
        certificate = certificate.trim();
      }

      // Extract NameID formats
      const nameIdFormats = (idpDescriptor.NameIDFormat || []).map((f: any) =>
        typeof f === 'string' ? f : f._
      );

      // Check signing requirements
      const signedRequests = idpDescriptor.$.WantAuthnRequestsSigned === 'true';
      const signedAssertions = idpDescriptor.$.WantAssertionsSigned === 'true';

      return {
        entityId,
        ssoUrl,
        sloUrl,
        certificate,
        nameIdFormats,
        signedRequests,
        signedAssertions,
      };
    } catch (error: any) {
      this.logger.error(`Failed to parse IdP metadata: ${error.message}`);
      throw new BadRequestException(`Invalid IdP metadata: ${error.message}`);
    }
  }

  // ========== Certificate Management ==========

  validateCertificate(certificate: string): { valid: boolean; expiresAt?: Date; subject?: string; issuer?: string } {
    try {
      const formattedCert = this.formatCertificate(certificate);

      // Basic validation - check if it's a valid PEM format
      if (!formattedCert.includes('-----BEGIN CERTIFICATE-----')) {
        return { valid: false };
      }

      // In production, would parse the certificate using node-forge or similar
      // to extract expiration and subject information
      return {
        valid: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Placeholder
      };
    } catch (error) {
      return { valid: false };
    }
  }

  formatCertificate(cert: string): string {
    // Remove any existing PEM headers and whitespace
    let cleanCert = cert
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    // Add proper PEM formatting
    const lines = [];
    for (let i = 0; i < cleanCert.length; i += 64) {
      lines.push(cleanCert.substring(i, i + 64));
    }

    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
  }

  // ========== Helper Methods ==========

  private getAttribute(attributes: Record<string, any>, key: string, defaultValue?: string): string {
    if (!attributes) return defaultValue || '';

    // Try direct key
    if (attributes[key]) {
      const value = attributes[key];
      return Array.isArray(value) ? value[0] : value;
    }

    // Try common SAML attribute names
    const commonMappings: Record<string, string[]> = {
      email: [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
        'mail',
        'emailAddress',
        'email',
      ],
      firstName: [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        'givenName',
        'FirstName',
        'first_name',
      ],
      lastName: [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        'sn',
        'LastName',
        'last_name',
      ],
      displayName: [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        'displayName',
        'name',
        'cn',
      ],
    };

    const keysToTry = commonMappings[key] || [key];
    for (const k of keysToTry) {
      if (attributes[k]) {
        const value = attributes[k];
        return Array.isArray(value) ? value[0] : value;
      }
    }

    return defaultValue || '';
  }

  private getGroupAttribute(attributes: Record<string, any>, key: string): string[] {
    if (!attributes) return [];

    const groupKeys = [
      key,
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
      'http://schemas.xmlsoap.org/claims/Group',
      'memberOf',
      'groups',
      'Group',
    ];

    for (const k of groupKeys) {
      if (attributes[k]) {
        const value = attributes[k];
        return Array.isArray(value) ? value : [value];
      }
    }

    return [];
  }

  private findServiceUrl(services: any[], preferredBindings: string[]): string {
    for (const binding of preferredBindings) {
      const service = services.find((s: any) => s.$.Binding === binding);
      if (service) {
        return service.$.Location;
      }
    }
    return services[0]?.$.Location || '';
  }

  // ========== Testing ==========

  async testSAMLConfiguration(
    teamId: string,
    idpConfig: SAMLIdentityProviderConfig,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate EntityID
    if (!idpConfig.entityId) {
      errors.push('Missing IdP Entity ID');
    }

    // Validate SSO URL
    if (!idpConfig.ssoUrl) {
      errors.push('Missing IdP SSO URL');
    } else {
      try {
        new URL(idpConfig.ssoUrl);
      } catch {
        errors.push('Invalid IdP SSO URL format');
      }
    }

    // Validate certificate
    if (!idpConfig.certificate) {
      errors.push('Missing IdP certificate');
    } else {
      const certValidation = this.validateCertificate(idpConfig.certificate);
      if (!certValidation.valid) {
        errors.push('Invalid IdP certificate format');
      }
    }

    // Try to create IdP and SP instances
    try {
      this.createServiceProvider(teamId);
      this.createIdentityProvider(`${teamId}_test`, idpConfig);
    } catch (error: any) {
      errors.push(`Configuration error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
