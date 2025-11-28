import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { HubSpotConnection } from './entities/hubspot-connection.entity';
import {
  HubSpotTokenResponse,
  HubSpotContact,
  HubSpotDeal,
  HubSpotApiResponse,
  CreateHubSpotContactDto,
  UpdateHubSpotContactDto,
  LogHubSpotActivityDto,
} from './dto/hubspot.dto';

@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiBaseUrl = 'https://api.hubapi.com';

  // OAuth state storage (use Redis in production)
  private oauthStates = new Map<string, { teamId: string; redirectUrl?: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(HubSpotConnection)
    private readonly connectionRepo: Repository<HubSpotConnection>,
  ) {
    this.clientId = this.configService.get<string>('HUBSPOT_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('HUBSPOT_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>(
      'HUBSPOT_REDIRECT_URI',
      'https://app.lnk.day/api/hubspot/oauth/callback',
    );
  }

  // ========== OAuth ==========

  generateAuthUrl(teamId: string, redirectUrl?: string): string {
    const state = crypto.randomBytes(16).toString('hex');

    this.oauthStates.set(state, {
      teamId,
      redirectUrl,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.objects.companies.read',
      'timeline',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ connection: HubSpotConnection; redirectUrl?: string }> {
    const stateData = this.oauthStates.get(state);
    if (!stateData) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    if (stateData.expiresAt < Date.now()) {
      this.oauthStates.delete(state);
      throw new BadRequestException('State parameter has expired');
    }

    this.oauthStates.delete(state);

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code);

    // Get portal info
    const portalInfo = await this.getPortalInfo(tokenResponse.access_token);

    // Save connection
    const connection = await this.saveConnection(
      stateData.teamId,
      portalInfo.portalId,
      tokenResponse,
    );

    return { connection, redirectUrl: stateData.redirectUrl };
  }

  private async exchangeCodeForTokens(code: string): Promise<HubSpotTokenResponse> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`HubSpot OAuth failed: ${error}`);
    }

    return response.json();
  }

  private async refreshAccessToken(connection: HubSpotConnection): Promise<HubSpotConnection> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: connection.refreshToken,
      }),
    });

    if (!response.ok) {
      connection.isActive = false;
      connection.lastError = 'Token refresh failed';
      await this.connectionRepo.save(connection);
      throw new BadRequestException('Failed to refresh HubSpot token');
    }

    const tokenData: HubSpotTokenResponse = await response.json();

    connection.accessToken = tokenData.access_token;
    connection.refreshToken = tokenData.refresh_token;
    connection.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    return this.connectionRepo.save(connection);
  }

  private async getPortalInfo(accessToken: string): Promise<{ portalId: string; name: string }> {
    const response = await fetch(`${this.apiBaseUrl}/account-info/v3/details`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get HubSpot portal info');
    }

    const data = await response.json();
    return { portalId: String(data.portalId), name: data.companyName };
  }

  private async saveConnection(
    teamId: string,
    portalId: string,
    tokenData: HubSpotTokenResponse,
  ): Promise<HubSpotConnection> {
    let connection = await this.connectionRepo.findOne({ where: { teamId } });

    if (connection) {
      connection.hubspotPortalId = portalId;
      connection.accessToken = tokenData.access_token;
      connection.refreshToken = tokenData.refresh_token;
      connection.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      connection.isActive = true;
      connection.lastError = null;
    } else {
      connection = this.connectionRepo.create({
        teamId,
        hubspotPortalId: portalId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scopes: [],
        settings: {
          syncContacts: true,
          syncDeals: false,
          logActivities: true,
          autoCreateContacts: false,
        },
      });
    }

    return this.connectionRepo.save(connection);
  }

  async getConnection(teamId: string): Promise<HubSpotConnection | null> {
    return this.connectionRepo.findOne({ where: { teamId, isActive: true } });
  }

  async disconnect(teamId: string): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (connection) {
      connection.isActive = false;
      await this.connectionRepo.save(connection);
    }
  }

  async updateSettings(
    teamId: string,
    settings: Partial<HubSpotConnection['settings']>,
  ): Promise<HubSpotConnection> {
    const connection = await this.getConnection(teamId);
    if (!connection) {
      throw new NotFoundException('HubSpot connection not found');
    }

    connection.settings = { ...connection.settings, ...settings };
    return this.connectionRepo.save(connection);
  }

  // ========== API Helper ==========

  private async apiRequest<T>(
    connection: HubSpotConnection,
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    // Check if token needs refresh
    if (connection.expiresAt < new Date()) {
      connection = await this.refreshAccessToken(connection);
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Token expired, try refresh
      connection = await this.refreshAccessToken(connection);
      return this.apiRequest(connection, method, endpoint, body);
    }

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`HubSpot API error: ${error}`);
      throw new BadRequestException(`HubSpot API error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ========== Contacts ==========

  async getContacts(
    teamId: string,
    limit: number = 100,
    after?: string,
  ): Promise<HubSpotApiResponse<HubSpotContact>> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    const params = new URLSearchParams({
      limit: String(limit),
      properties: 'email,firstname,lastname,company,phone,website',
    });
    if (after) params.append('after', after);

    return this.apiRequest(
      connection,
      'GET',
      `/crm/v3/objects/contacts?${params.toString()}`,
    );
  }

  async getContactByEmail(teamId: string, email: string): Promise<HubSpotContact | null> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    try {
      return await this.apiRequest(
        connection,
        'POST',
        '/crm/v3/objects/contacts/search',
        {
          filterGroups: [
            {
              filters: [
                { propertyName: 'email', operator: 'EQ', value: email },
              ],
            },
          ],
          properties: ['email', 'firstname', 'lastname', 'company'],
          limit: 1,
        },
      ).then((res: any) => res.results?.[0] || null);
    } catch {
      return null;
    }
  }

  async createContact(teamId: string, dto: CreateHubSpotContactDto): Promise<HubSpotContact> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    const properties: Record<string, any> = {
      email: dto.email,
    };

    if (dto.firstName) properties.firstname = dto.firstName;
    if (dto.lastName) properties.lastname = dto.lastName;
    if (dto.company) properties.company = dto.company;
    if (dto.customProperties) {
      Object.assign(properties, dto.customProperties);
    }

    return this.apiRequest(connection, 'POST', '/crm/v3/objects/contacts', {
      properties,
    });
  }

  async updateContact(
    teamId: string,
    contactId: string,
    dto: UpdateHubSpotContactDto,
  ): Promise<HubSpotContact> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    const properties: Record<string, any> = {};
    if (dto.firstName) properties.firstname = dto.firstName;
    if (dto.lastName) properties.lastname = dto.lastName;
    if (dto.customProperties) {
      Object.assign(properties, dto.customProperties);
    }

    return this.apiRequest(
      connection,
      'PATCH',
      `/crm/v3/objects/contacts/${contactId}`,
      { properties },
    );
  }

  async createOrUpdateContact(
    teamId: string,
    email: string,
    properties: Record<string, any>,
  ): Promise<HubSpotContact> {
    const existing = await this.getContactByEmail(teamId, email);

    if (existing) {
      return this.updateContact(teamId, existing.id, { customProperties: properties });
    }

    return this.createContact(teamId, { email, customProperties: properties });
  }

  // ========== Deals ==========

  async getDeals(
    teamId: string,
    limit: number = 100,
    after?: string,
  ): Promise<HubSpotApiResponse<HubSpotDeal>> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    const params = new URLSearchParams({
      limit: String(limit),
      properties: 'dealname,amount,dealstage,closedate,pipeline',
    });
    if (after) params.append('after', after);

    return this.apiRequest(
      connection,
      'GET',
      `/crm/v3/objects/deals?${params.toString()}`,
    );
  }

  async getDeal(teamId: string, dealId: string): Promise<HubSpotDeal> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    return this.apiRequest(connection, 'GET', `/crm/v3/objects/deals/${dealId}`);
  }

  async updateDealStage(teamId: string, dealId: string, stage: string): Promise<HubSpotDeal> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    return this.apiRequest(connection, 'PATCH', `/crm/v3/objects/deals/${dealId}`, {
      properties: { dealstage: stage },
    });
  }

  // ========== Timeline/Activities ==========

  async logActivity(teamId: string, dto: LogHubSpotActivityDto): Promise<any> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('HubSpot not connected');

    if (!connection.settings.logActivities) {
      this.logger.debug('Activity logging disabled for this team');
      return null;
    }

    const activityTypeMap: Record<string, string> = {
      link_click: 'Short Link Clicked',
      link_created: 'Short Link Created',
      conversion: 'Conversion Tracked',
      custom: 'Custom Activity',
    };

    // Create an engagement (note or call)
    const engagement = {
      engagement: {
        active: true,
        type: 'NOTE',
        timestamp: Date.now(),
      },
      associations: {
        contactIds: [parseInt(dto.contactId)],
      },
      metadata: {
        body: this.formatActivityNote(dto, activityTypeMap[dto.activityType]),
      },
    };

    return this.apiRequest(connection, 'POST', '/engagements/v1/engagements', engagement);
  }

  private formatActivityNote(dto: LogHubSpotActivityDto, activityTitle: string): string {
    let note = `<h3>${activityTitle}</h3>`;

    if (dto.linkUrl) {
      note += `<p><strong>Link:</strong> <a href="${dto.linkUrl}">${dto.linkUrl}</a></p>`;
    }

    if (dto.linkId) {
      note += `<p><strong>Link ID:</strong> ${dto.linkId}</p>`;
    }

    if (dto.metadata) {
      note += `<p><strong>Details:</strong></p><ul>`;
      for (const [key, value] of Object.entries(dto.metadata)) {
        note += `<li>${key}: ${value}</li>`;
      }
      note += '</ul>';
    }

    note += `<p><em>Logged by lnk.day</em></p>`;
    return note;
  }

  // ========== Link Click Tracking ==========

  async trackLinkClick(
    teamId: string,
    linkId: string,
    shortUrl: string,
    visitorEmail?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (!connection || !connection.settings.logActivities) return;

    // If we have visitor email, find or create contact
    if (visitorEmail) {
      let contact = await this.getContactByEmail(teamId, visitorEmail);

      if (!contact && connection.settings.autoCreateContacts) {
        contact = await this.createContact(teamId, { email: visitorEmail });
      }

      if (contact) {
        await this.logActivity(teamId, {
          contactId: contact.id,
          activityType: 'link_click',
          linkId,
          linkUrl: shortUrl,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        });

        // Update contact with link click count
        const currentClicks = parseInt(contact.properties['lnk_total_clicks'] || '0');
        await this.updateContact(teamId, contact.id, {
          customProperties: {
            lnk_total_clicks: String(currentClicks + 1),
            lnk_last_click_at: new Date().toISOString(),
          },
        });
      }
    }

    connection.lastSyncAt = new Date();
    await this.connectionRepo.save(connection);
  }

  // ========== Custom Properties ==========

  async ensureCustomProperties(teamId: string): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (!connection) return;

    const customProperties = [
      {
        name: 'lnk_total_clicks',
        label: 'lnk.day Total Clicks',
        type: 'number',
        fieldType: 'number',
        groupName: 'contactinformation',
        description: 'Total link clicks tracked by lnk.day',
      },
      {
        name: 'lnk_last_click_at',
        label: 'lnk.day Last Click',
        type: 'datetime',
        fieldType: 'date',
        groupName: 'contactinformation',
        description: 'Last link click timestamp from lnk.day',
      },
      {
        name: 'lnk_links_created',
        label: 'lnk.day Links Created',
        type: 'number',
        fieldType: 'number',
        groupName: 'contactinformation',
        description: 'Number of links created via lnk.day',
      },
    ];

    for (const prop of customProperties) {
      try {
        await this.apiRequest(
          connection,
          'POST',
          '/crm/v3/properties/contacts',
          prop,
        );
        this.logger.log(`Created HubSpot property: ${prop.name}`);
      } catch (error) {
        // Property might already exist, ignore error
        this.logger.debug(`Property ${prop.name} might already exist`);
      }
    }
  }
}
