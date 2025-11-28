import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
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
  ImportIdPMetadataDto,
  UpdateSAMLConfigDto,
} from './dto/sso.dto';
import { SAMLService, SAMLIdentityProviderConfig } from './saml/saml.service';
import { LdapService } from '../auth/ldap/ldap.service';

@Injectable()
export class SSOService {
  private readonly logger = new Logger(SSOService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(SSOConfig)
    private readonly ssoConfigRepository: Repository<SSOConfig>,
    @InjectRepository(SSOSession)
    private readonly ssoSessionRepository: Repository<SSOSession>,
    private readonly configService: ConfigService,
    private readonly samlService: SAMLService,
    private readonly ldapService: LdapService,
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

    // Validate certificate format
    const certValidation = this.samlService.validateCertificate(dto.certificate);
    if (!certValidation.valid) {
      throw new BadRequestException('Invalid IdP certificate format');
    }

    const config = this.ssoConfigRepository.create({
      teamId,
      provider: SSOProvider.SAML,
      status: SSOStatus.PENDING,
      displayName: dto.displayName,
      samlEntityId: dto.entityId,
      samlSsoUrl: dto.ssoUrl,
      samlSloUrl: dto.sloUrl,
      samlCertificate: this.samlService.formatCertificate(dto.certificate),
      samlNameIdFormat: dto.nameIdFormat,
      attributeMapping: dto.attributeMapping || {},
      autoProvision: dto.autoProvision || false,
      enforceSSO: dto.enforceSSO || false,
      allowedDomains: dto.allowedDomains || [],
    });

    return this.ssoConfigRepository.save(config);
  }

  async createSAMLConfigFromMetadata(teamId: string, dto: ImportIdPMetadataDto): Promise<SSOConfig> {
    // Check for existing config
    const existing = await this.ssoConfigRepository.findOne({
      where: { teamId, provider: SSOProvider.SAML },
    });

    if (existing) {
      throw new ConflictException('SAML configuration already exists for this team');
    }

    // Parse IdP metadata
    const metadata = await this.samlService.parseIdPMetadata(dto.metadataXml);

    if (!metadata.certificate) {
      throw new BadRequestException('IdP metadata does not contain a signing certificate');
    }

    const config = this.ssoConfigRepository.create({
      teamId,
      provider: SSOProvider.SAML,
      status: SSOStatus.PENDING,
      displayName: dto.displayName || `SAML SSO - ${metadata.entityId}`,
      samlEntityId: metadata.entityId,
      samlSsoUrl: metadata.ssoUrl,
      samlSloUrl: metadata.sloUrl,
      samlCertificate: this.samlService.formatCertificate(metadata.certificate),
      samlNameIdFormat: metadata.nameIdFormats[0] || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: dto.attributeMapping || {},
      autoProvision: dto.autoProvision || false,
      enforceSSO: dto.enforceSSO || false,
      allowedDomains: dto.allowedDomains || [],
    });

    this.logger.log(`Created SAML config for team ${teamId} from metadata: ${metadata.entityId}`);
    return this.ssoConfigRepository.save(config);
  }

  async updateSAMLConfig(teamId: string, configId: string, dto: UpdateSAMLConfigDto): Promise<SSOConfig> {
    const config = await this.getConfig(teamId, configId);

    if (config.provider !== SSOProvider.SAML) {
      throw new BadRequestException('This is not a SAML configuration');
    }

    if (dto.displayName !== undefined) config.displayName = dto.displayName;
    if (dto.entityId !== undefined) config.samlEntityId = dto.entityId;
    if (dto.ssoUrl !== undefined) config.samlSsoUrl = dto.ssoUrl;
    if (dto.sloUrl !== undefined) config.samlSloUrl = dto.sloUrl;
    if (dto.certificate !== undefined) {
      const certValidation = this.samlService.validateCertificate(dto.certificate);
      if (!certValidation.valid) {
        throw new BadRequestException('Invalid IdP certificate format');
      }
      config.samlCertificate = this.samlService.formatCertificate(dto.certificate);
      // Clear cache when certificate changes
      this.samlService.clearCache(configId);
    }
    if (dto.nameIdFormat !== undefined) config.samlNameIdFormat = dto.nameIdFormat;
    if (dto.autoProvision !== undefined) config.autoProvision = dto.autoProvision;
    if (dto.enforceSSO !== undefined) config.enforceSSO = dto.enforceSSO;
    if (dto.allowedDomains !== undefined) config.allowedDomains = dto.allowedDomains;
    if (dto.attributeMapping !== undefined) {
      config.attributeMapping = { ...config.attributeMapping, ...dto.attributeMapping };
    }

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

    // Use samlify to generate proper SP metadata
    const metadataXml = this.samlService.generateSPMetadata(teamId, {
      entityId,
      assertionConsumerServiceUrl: acsUrl,
      singleLogoutServiceUrl: sloUrl,
    });

    return {
      entityId,
      acsUrl,
      sloUrl,
      metadataXml,
    };
  }

  private getIdPConfig(config: SSOConfig): SAMLIdentityProviderConfig {
    return {
      entityId: config.samlEntityId!,
      ssoUrl: config.samlSsoUrl!,
      sloUrl: config.samlSloUrl,
      certificate: config.samlCertificate!,
      nameIdFormat: config.samlNameIdFormat,
    };
  }

  async initiateSAMLLogin(teamId: string, relayState?: string): Promise<{ redirectUrl: string; requestId: string }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.SAML) {
      throw new BadRequestException('SAML is not configured for this team');
    }

    const idpConfig = this.getIdPConfig(config);

    try {
      return await this.samlService.createLoginRequest(teamId, idpConfig, relayState);
    } catch (error: any) {
      this.logger.error(`Failed to create SAML login request: ${error.message}`);
      throw new BadRequestException(`Failed to initiate SAML login: ${error.message}`);
    }
  }

  async initiateSAMLLogout(
    teamId: string,
    nameId: string,
    sessionIndex?: string,
  ): Promise<{ redirectUrl: string; requestId: string }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.SAML) {
      throw new BadRequestException('SAML is not configured for this team');
    }

    if (!config.samlSloUrl) {
      throw new BadRequestException('Single Logout is not configured for this IdP');
    }

    const idpConfig = this.getIdPConfig(config);

    try {
      return await this.samlService.createLogoutRequest(teamId, idpConfig, nameId, sessionIndex);
    } catch (error: any) {
      this.logger.error(`Failed to create SAML logout request: ${error.message}`);
      throw new BadRequestException(`Failed to initiate SAML logout: ${error.message}`);
    }
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

  async testConnection(teamId: string, configId: string): Promise<{ success: boolean; message: string; details?: any }> {
    const config = await this.getConfig(teamId, configId);

    switch (config.provider) {
      case SSOProvider.SAML:
        return this.testSAMLConnection(teamId, config);
      case SSOProvider.OIDC:
        return this.testOIDCConnection(config);
      case SSOProvider.LDAP:
        // LDAP testing is handled by LdapService
        return { success: true, message: 'LDAP configuration exists. Use LDAP test endpoint for connection test.' };
      default:
        return { success: false, message: 'Unknown provider' };
    }
  }

  private async testSAMLConnection(
    teamId: string,
    config: SSOConfig,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const idpConfig = this.getIdPConfig(config);
    const result = await this.samlService.testSAMLConfiguration(teamId, idpConfig);

    if (result.valid) {
      // Also validate certificate expiration
      const certValidation = this.samlService.validateCertificate(config.samlCertificate || '');

      return {
        success: true,
        message: 'SAML configuration is valid',
        details: {
          entityId: config.samlEntityId,
          ssoUrl: config.samlSsoUrl,
          hasSLO: !!config.samlSloUrl,
          certificateValid: certValidation.valid,
          certificateExpiresAt: certValidation.expiresAt,
        },
      };
    }

    return {
      success: false,
      message: `SAML configuration is invalid: ${result.errors.join(', ')}`,
      details: { errors: result.errors },
    };
  }

  private async testOIDCConnection(config: SSOConfig): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Try to fetch OIDC discovery document
      const discoveryUrl = `${config.oidcIssuer}/.well-known/openid-configuration`;
      const response = await fetch(discoveryUrl);

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to fetch OIDC discovery document: ${response.status}`,
        };
      }

      const discovery = await response.json();

      return {
        success: true,
        message: 'OIDC configuration is valid',
        details: {
          issuer: discovery.issuer,
          authorizationEndpoint: discovery.authorization_endpoint,
          tokenEndpoint: discovery.token_endpoint,
          userInfoEndpoint: discovery.userinfo_endpoint,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to validate OIDC configuration: ${error.message}`,
      };
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

  // ========== SAML Response Processing ==========

  async processSAMLResponse(
    teamId: string,
    samlResponse: string,
  ): Promise<{
    user: {
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      externalId?: string;
      groups?: string[];
    };
    sessionIndex?: string;
  }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.SAML) {
      throw new BadRequestException('SAML is not configured for this team');
    }

    const idpConfig = this.getIdPConfig(config);

    try {
      // Use SAMLService to parse and validate response with signature verification
      const result = await this.samlService.parseLoginResponse(
        teamId,
        idpConfig,
        samlResponse,
        config.attributeMapping,
      );

      // Validate allowed domains if configured
      if (config.allowedDomains.length > 0 && result.user.email) {
        const domain = result.user.email.split('@')[1] || '';
        if (!config.allowedDomains.includes(domain)) {
          throw new BadRequestException(`Email domain ${domain} is not allowed for SSO`);
        }
      }

      return {
        user: {
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          displayName: result.user.displayName,
          externalId: result.user.nameId,
          groups: result.user.groups,
        },
        sessionIndex: result.sessionIndex,
      };
    } catch (error: any) {
      this.logger.error(`SAML response processing failed: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to process SAML response: ${error.message}`);
    }
  }

  async processSAMLLogoutResponse(
    teamId: string,
    samlResponse: string,
  ): Promise<{ success: boolean; issuer: string }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.SAML) {
      throw new BadRequestException('SAML is not configured for this team');
    }

    const idpConfig = this.getIdPConfig(config);
    return this.samlService.parseLogoutResponse(teamId, idpConfig, samlResponse);
  }

  // ========== OIDC Token Exchange ==========

  async handleOIDCCallback(
    teamId: string,
    code: string,
    state: string,
  ): Promise<{
    user: {
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      externalId: string;
      picture?: string;
    };
    tokens: {
      accessToken: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn: number;
    };
  }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.OIDC) {
      throw new BadRequestException('OIDC is not configured for this team');
    }

    const redirectUri = `${this.baseUrl}/sso/oidc/${teamId}/callback`;
    const tokenUrl = config.oidcTokenUrl || `${config.oidcIssuer}/oauth/token`;

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(
      tokenUrl,
      code,
      config.oidcClientId!,
      config.oidcClientSecret!,
      redirectUri,
    );

    // Get user info
    const userInfoUrl = config.oidcUserInfoUrl || `${config.oidcIssuer}/userinfo`;
    const userInfo = await this.fetchUserInfo(userInfoUrl, tokenResponse.access_token);

    // Map attributes
    const mapping = config.attributeMapping;
    const user = {
      email: userInfo[mapping.email || 'email'] || userInfo.email,
      firstName: userInfo[mapping.firstName || 'given_name'] || userInfo.given_name,
      lastName: userInfo[mapping.lastName || 'family_name'] || userInfo.family_name,
      displayName: userInfo[mapping.displayName || 'name'] || userInfo.name,
      externalId: userInfo.sub,
      picture: userInfo.picture,
    };

    return {
      user,
      tokens: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        idToken: tokenResponse.id_token,
        expiresIn: tokenResponse.expires_in || 3600,
      },
    };
  }

  private async exchangeCodeForTokens(
    tokenUrl: string,
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type: string;
  }> {
    // In production, use axios or node-fetch
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to exchange authorization code for tokens');
    }

    return response.json();
  }

  private async fetchUserInfo(userInfoUrl: string, accessToken: string): Promise<Record<string, any>> {
    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to fetch user info');
    }

    return response.json();
  }

  // ========== LDAP Authentication ==========

  async authenticateLDAP(
    teamId: string,
    username: string,
    password: string,
  ): Promise<{
    user: {
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      externalId: string;
      groups?: string[];
    };
    dn: string;
  }> {
    const config = await this.getActiveConfig(teamId);

    if (!config || config.provider !== SSOProvider.LDAP) {
      throw new BadRequestException('LDAP is not configured for this team');
    }

    // Use LdapService for real LDAP authentication
    const ldapUser = await this.ldapService.authenticate(teamId, username, password);

    if (!ldapUser) {
      throw new BadRequestException('Invalid LDAP credentials or user not found');
    }

    // Get LDAP config for role mapping
    const ldapConfig = await this.ldapService.getConfig(teamId);

    // Map LDAP user to SSO user format
    return {
      user: {
        email: ldapUser.email,
        firstName: ldapUser.firstName,
        lastName: ldapUser.lastName,
        displayName: ldapUser.displayName,
        externalId: ldapUser.username,
        groups: ldapUser.groups,
      },
      dn: ldapUser.dn,
    };
  }

  async testLDAPConnection(teamId: string): Promise<{ success: boolean; message: string; details?: any }> {
    return this.ldapService.testConnection(teamId);
  }

  async syncLDAPUsers(teamId: string): Promise<{
    success: boolean;
    usersFound: number;
    usersCreated: number;
    usersUpdated: number;
    errors: string[];
  }> {
    return this.ldapService.syncUsers(teamId);
  }

  // ========== User Provisioning ==========

  async provisionUser(
    teamId: string,
    ssoConfigId: string,
    userInfo: {
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      externalId?: string;
    },
  ): Promise<{
    userId: string;
    isNew: boolean;
    action: 'created' | 'updated' | 'linked';
  }> {
    const config = await this.getConfig(teamId, ssoConfigId);

    // This would integrate with UserService in production
    // For now, return mock data
    const userId = crypto.randomUUID();

    return {
      userId,
      isNew: config.autoProvision,
      action: config.autoProvision ? 'created' : 'linked',
    };
  }

  // ========== Domain Discovery ==========

  async discoverSSO(email: string): Promise<{
    hasSSO: boolean;
    provider?: SSOProvider;
    teamId?: string;
    loginUrl?: string;
  }> {
    const domain = email.split('@')[1] || '';
    if (!domain) {
      return { hasSSO: false };
    }

    // Find SSO config with this domain
    const configs = await this.ssoConfigRepository.find({
      where: { status: SSOStatus.ACTIVE },
    });

    for (const config of configs) {
      if (config.allowedDomains.includes(domain)) {
        let loginUrl: string;

        switch (config.provider) {
          case SSOProvider.SAML:
            const samlLogin = await this.initiateSAMLLogin(config.teamId);
            loginUrl = samlLogin.redirectUrl;
            break;
          case SSOProvider.OIDC:
            const oidcLogin = await this.initiateOIDCLogin(config.teamId);
            loginUrl = oidcLogin.redirectUrl;
            break;
          case SSOProvider.LDAP:
            loginUrl = `${this.baseUrl}/login/ldap?team=${config.teamId}`;
            break;
          default:
            continue;
        }

        return {
          hasSSO: true,
          provider: config.provider,
          teamId: config.teamId,
          loginUrl,
        };
      }
    }

    return { hasSSO: false };
  }

  // ========== Just-in-Time Provisioning ==========

  async getOrCreateUser(
    teamId: string,
    ssoConfigId: string,
    externalUser: {
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      externalId: string;
      groups?: string[];
    },
  ): Promise<{
    userId: string;
    isNew: boolean;
    teamMemberId?: string;
  }> {
    const config = await this.getConfig(teamId, ssoConfigId);

    // In production, this would:
    // 1. Check if user exists by email or external ID
    // 2. If exists, update attributes if needed
    // 3. If not exists and autoProvision is true, create user
    // 4. Add user to team if not already a member
    // 5. Assign default role

    const userId = crypto.randomUUID();
    const isNew = config.autoProvision;

    return {
      userId,
      isNew,
      teamMemberId: isNew ? crypto.randomUUID() : undefined,
    };
  }
}
