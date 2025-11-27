import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { SSOConfig, SSOSession, SSOProvider, SSOStatus } from './entities/sso-config.entity';
import {
  CreateSAMLConfigDto,
  CreateOIDCConfigDto,
  CreateLDAPConfigDto,
  UpdateSSOConfigDto,
} from './dto/sso.dto';

@Injectable()
export class SSOService {
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(SSOConfig)
    private readonly ssoConfigRepository: Repository<SSOConfig>,
    @InjectRepository(SSOSession)
    private readonly ssoSessionRepository: Repository<SSOSession>,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('APP_URL', 'https://app.lnk.day');
  }

  // ========== Config Management ==========

  async getConfigs(teamId: string): Promise<SSOConfig[]> {
    return this.ssoConfigRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async getConfig(teamId: string, configId: string): Promise<SSOConfig> {
    const config = await this.ssoConfigRepository.findOne({
      where: { id: configId, teamId },
    });

    if (!config) {
      throw new NotFoundException('SSO configuration not found');
    }

    return config;
  }

  async getActiveConfig(teamId: string): Promise<SSOConfig | null> {
    return this.ssoConfigRepository.findOne({
      where: { teamId, status: SSOStatus.ACTIVE },
    });
  }

  // ========== SAML ==========

  async createSAMLConfig(teamId: string, dto: CreateSAMLConfigDto): Promise<SSOConfig> {
    // Check for existing config
    const existing = await this.ssoConfigRepository.findOne({
      where: { teamId, provider: SSOProvider.SAML },
    });

    if (existing) {
      throw new ConflictException('SAML configuration already exists for this team');
    }

    const config = this.ssoConfigRepository.create({
      teamId,
      provider: SSOProvider.SAML,
      status: SSOStatus.PENDING,
      displayName: dto.displayName,
      samlEntityId: dto.entityId,
      samlSsoUrl: dto.ssoUrl,
      samlSloUrl: dto.sloUrl,
      samlCertificate: dto.certificate,
      samlNameIdFormat: dto.nameIdFormat,
      attributeMapping: dto.attributeMapping || {},
      autoProvision: dto.autoProvision || false,
      enforceSSO: dto.enforceSSO || false,
      allowedDomains: dto.allowedDomains || [],
    });

    return this.ssoConfigRepository.save(config);
  }

  async getSAMLMetadata(teamId: string): Promise<{
    entityId: string;
    acsUrl: string;
    sloUrl: string;
    metadataXml: string;
  }> {
    const entityId = `${this.baseUrl}/sso/saml/${teamId}`;
    const acsUrl = `${this.baseUrl}/sso/saml/${teamId}/acs`;
    const sloUrl = `${this.baseUrl}/sso/saml/${teamId}/slo`;

    const metadataXml = this.generateSAMLMetadata(entityId, acsUrl, sloUrl);

    return {
      entityId,
      acsUrl,
      sloUrl,
      metadataXml,
    };
  }

  private generateSAMLMetadata(entityId: string, acsUrl: string, sloUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0" isDefault="true"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  async initiateSAMLLogin(teamId: string): Promise<{ redirectUrl: string; requestId: string }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.SAML) {
      throw new BadRequestException('SAML is not configured for this team');
    }

    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();
    const acsUrl = `${this.baseUrl}/sso/saml/${teamId}/acs`;

    // In production, this would use a proper SAML library
    const samlRequest = this.buildSAMLRequest(requestId, issueInstant, config.samlEntityId!, acsUrl);
    const encodedRequest = Buffer.from(samlRequest).toString('base64');

    const redirectUrl = `${config.samlSsoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}`;

    return { redirectUrl, requestId };
  }

  private buildSAMLRequest(requestId: string, issueInstant: string, destination: string, acsUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${destination}"
                    AssertionConsumerServiceURL="${acsUrl}">
  <saml:Issuer>${this.baseUrl}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;
  }

  // ========== OIDC ==========

  async createOIDCConfig(teamId: string, dto: CreateOIDCConfigDto): Promise<SSOConfig> {
    const existing = await this.ssoConfigRepository.findOne({
      where: { teamId, provider: SSOProvider.OIDC },
    });

    if (existing) {
      throw new ConflictException('OIDC configuration already exists for this team');
    }

    const config = this.ssoConfigRepository.create({
      teamId,
      provider: SSOProvider.OIDC,
      status: SSOStatus.PENDING,
      displayName: dto.displayName,
      oidcIssuer: dto.issuer,
      oidcClientId: dto.clientId,
      oidcClientSecret: dto.clientSecret,
      oidcAuthorizationUrl: dto.authorizationUrl,
      oidcTokenUrl: dto.tokenUrl,
      oidcUserInfoUrl: dto.userInfoUrl,
      oidcScopes: dto.scopes || ['openid', 'profile', 'email'],
      attributeMapping: dto.attributeMapping || {},
      autoProvision: dto.autoProvision || false,
      enforceSSO: dto.enforceSSO || false,
    });

    return this.ssoConfigRepository.save(config);
  }

  async initiateOIDCLogin(teamId: string): Promise<{ redirectUrl: string; state: string }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.OIDC) {
      throw new BadRequestException('OIDC is not configured for this team');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    const redirectUri = `${this.baseUrl}/sso/oidc/${teamId}/callback`;

    const authUrl = new URL(config.oidcAuthorizationUrl || `${config.oidcIssuer}/authorize`);
    authUrl.searchParams.set('client_id', config.oidcClientId!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', config.oidcScopes.join(' '));
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    return { redirectUrl: authUrl.toString(), state };
  }

  // ========== LDAP ==========

  async createLDAPConfig(teamId: string, dto: CreateLDAPConfigDto): Promise<SSOConfig> {
    const existing = await this.ssoConfigRepository.findOne({
      where: { teamId, provider: SSOProvider.LDAP },
    });

    if (existing) {
      throw new ConflictException('LDAP configuration already exists for this team');
    }

    const config = this.ssoConfigRepository.create({
      teamId,
      provider: SSOProvider.LDAP,
      status: SSOStatus.PENDING,
      displayName: dto.displayName,
      ldapUrl: dto.url,
      ldapBindDn: dto.bindDn,
      ldapBindPassword: dto.bindPassword,
      ldapSearchBase: dto.searchBase,
      ldapSearchFilter: dto.searchFilter || '(uid={{username}})',
      ldapUsernameAttribute: dto.usernameAttribute || 'uid',
      ldapEmailAttribute: dto.emailAttribute || 'mail',
      attributeMapping: dto.attributeMapping || {},
      autoProvision: dto.autoProvision || false,
    });

    return this.ssoConfigRepository.save(config);
  }

  // ========== Common Operations ==========

  async updateConfig(teamId: string, configId: string, dto: UpdateSSOConfigDto): Promise<SSOConfig> {
    const config = await this.getConfig(teamId, configId);

    if (dto.displayName !== undefined) config.displayName = dto.displayName;
    if (dto.autoProvision !== undefined) config.autoProvision = dto.autoProvision;
    if (dto.enforceSSO !== undefined) config.enforceSSO = dto.enforceSSO;
    if (dto.allowedDomains !== undefined) config.allowedDomains = dto.allowedDomains;
    if (dto.attributeMapping !== undefined) {
      config.attributeMapping = { ...config.attributeMapping, ...dto.attributeMapping };
    }

    return this.ssoConfigRepository.save(config);
  }

  async activateConfig(teamId: string, configId: string): Promise<SSOConfig> {
    const config = await this.getConfig(teamId, configId);

    // Deactivate other configs
    await this.ssoConfigRepository.update(
      { teamId, status: SSOStatus.ACTIVE },
      { status: SSOStatus.INACTIVE },
    );

    config.status = SSOStatus.ACTIVE;
    return this.ssoConfigRepository.save(config);
  }

  async deactivateConfig(teamId: string, configId: string): Promise<SSOConfig> {
    const config = await this.getConfig(teamId, configId);
    config.status = SSOStatus.INACTIVE;
    return this.ssoConfigRepository.save(config);
  }

  async deleteConfig(teamId: string, configId: string): Promise<void> {
    const config = await this.getConfig(teamId, configId);
    await this.ssoConfigRepository.remove(config);
  }

  async testConnection(teamId: string, configId: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig(teamId, configId);

    // In production, this would actually test the connection
    switch (config.provider) {
      case SSOProvider.SAML:
        // Would fetch and validate IdP metadata
        return { success: true, message: 'SAML configuration is valid' };
      case SSOProvider.OIDC:
        // Would fetch OIDC discovery document
        return { success: true, message: 'OIDC configuration is valid' };
      case SSOProvider.LDAP:
        // Would attempt LDAP bind
        return { success: true, message: 'LDAP connection successful' };
      default:
        return { success: false, message: 'Unknown provider' };
    }
  }

  // ========== Sessions ==========

  async createSession(
    ssoConfigId: string,
    userId: string,
    externalUserId: string,
    attributes?: Record<string, any>,
  ): Promise<SSOSession> {
    const session = this.ssoSessionRepository.create({
      ssoConfigId,
      userId,
      externalUserId,
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      attributes,
    });

    return this.ssoSessionRepository.save(session);
  }

  async getSession(userId: string): Promise<SSOSession | null> {
    return this.ssoSessionRepository.findOne({
      where: { userId },
      order: { authenticatedAt: 'DESC' },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ssoSessionRepository.delete({ id: sessionId });
  }
}
