import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { SalesforceConnection } from './entities/salesforce-connection.entity';

export interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceRecord {
  Id: string;
  attributes: { type: string; url: string };
  [key: string]: any;
}

export interface SalesforceQueryResult<T = SalesforceRecord> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

@Injectable()
export class SalesforceService {
  private readonly logger = new Logger(SalesforceService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiVersion = 'v59.0';

  // OAuth state storage
  private oauthStates = new Map<string, { teamId: string; redirectUrl?: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SalesforceConnection)
    private readonly connectionRepo: Repository<SalesforceConnection>,
  ) {
    this.clientId = this.configService.get<string>('SALESFORCE_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('SALESFORCE_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>(
      'SALESFORCE_REDIRECT_URI',
      'https://app.lnk.day/api/salesforce/oauth/callback',
    );
  }

  // ========== OAuth ==========

  generateAuthUrl(teamId: string, redirectUrl?: string, sandbox: boolean = false): string {
    const state = crypto.randomBytes(16).toString('hex');

    this.oauthStates.set(state, {
      teamId,
      redirectUrl,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const baseUrl = sandbox
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'api refresh_token offline_access',
    });

    return `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ connection: SalesforceConnection; redirectUrl?: string }> {
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

    // Get org info
    const userInfo = await this.getUserInfo(tokenResponse);

    // Save connection
    const connection = await this.saveConnection(
      stateData.teamId,
      tokenResponse,
      userInfo,
    );

    return { connection, redirectUrl: stateData.redirectUrl };
  }

  private async exchangeCodeForTokens(code: string): Promise<SalesforceTokenResponse> {
    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
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
      throw new BadRequestException(`Salesforce OAuth failed: ${error}`);
    }

    return response.json();
  }

  private async refreshAccessToken(connection: SalesforceConnection): Promise<SalesforceConnection> {
    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
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
      throw new BadRequestException('Failed to refresh Salesforce token');
    }

    const tokenData = await response.json();

    connection.accessToken = tokenData.access_token;
    connection.instanceUrl = tokenData.instance_url;
    connection.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    return this.connectionRepo.save(connection);
  }

  private async getUserInfo(tokenResponse: SalesforceTokenResponse): Promise<any> {
    const response = await fetch(tokenResponse.id, {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get Salesforce user info');
    }

    return response.json();
  }

  private async saveConnection(
    teamId: string,
    tokenResponse: SalesforceTokenResponse,
    userInfo: any,
  ): Promise<SalesforceConnection> {
    let connection = await this.connectionRepo.findOne({ where: { teamId } });

    if (connection) {
      connection.instanceUrl = tokenResponse.instance_url;
      connection.accessToken = tokenResponse.access_token;
      connection.refreshToken = tokenResponse.refresh_token;
      connection.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      connection.orgId = userInfo.organization_id;
      connection.userId = userInfo.user_id;
      connection.isActive = true;
      connection.lastError = null;
    } else {
      connection = this.connectionRepo.create({
        teamId,
        instanceUrl: tokenResponse.instance_url,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        orgId: userInfo.organization_id,
        userId: userInfo.user_id,
        settings: {
          syncLeads: true,
          syncContacts: true,
          syncOpportunities: false,
          logActivities: true,
          autoCreateLeads: false,
        },
      });
    }

    return this.connectionRepo.save(connection);
  }

  async getConnection(teamId: string): Promise<SalesforceConnection | null> {
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
    settings: Partial<SalesforceConnection['settings']>,
  ): Promise<SalesforceConnection> {
    const connection = await this.getConnection(teamId);
    if (!connection) {
      throw new NotFoundException('Salesforce connection not found');
    }

    connection.settings = { ...connection.settings, ...settings };
    return this.connectionRepo.save(connection);
  }

  // ========== API Helper ==========

  private async apiRequest<T>(
    connection: SalesforceConnection,
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    // Check if token needs refresh
    if (connection.expiresAt < new Date()) {
      connection = await this.refreshAccessToken(connection);
    }

    const url = `${connection.instanceUrl}/services/data/${this.apiVersion}${endpoint}`;

    const response = await fetch(url, {
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
      this.logger.error(`Salesforce API error: ${error}`);
      throw new BadRequestException(`Salesforce API error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ========== SOQL Query ==========

  async query<T = SalesforceRecord>(
    teamId: string,
    soql: string,
  ): Promise<SalesforceQueryResult<T>> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    return this.apiRequest(
      connection,
      'GET',
      `/query?q=${encodeURIComponent(soql)}`,
    );
  }

  // ========== Leads ==========

  async getLeads(teamId: string, limit: number = 100): Promise<SalesforceQueryResult> {
    return this.query(
      teamId,
      `SELECT Id, FirstName, LastName, Email, Company, Status, Phone
       FROM Lead
       ORDER BY CreatedDate DESC
       LIMIT ${limit}`,
    );
  }

  async getLeadByEmail(teamId: string, email: string): Promise<SalesforceRecord | null> {
    const result = await this.query(
      teamId,
      `SELECT Id, FirstName, LastName, Email, Company, Status
       FROM Lead
       WHERE Email = '${email}'
       LIMIT 1`,
    );
    return result.records[0] || null;
  }

  async createLead(
    teamId: string,
    data: {
      firstName?: string;
      lastName: string;
      email?: string;
      company: string;
      phone?: string;
      description?: string;
      leadSource?: string;
      customFields?: Record<string, any>;
    },
  ): Promise<{ id: string; success: boolean }> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    const leadData: Record<string, any> = {
      FirstName: data.firstName,
      LastName: data.lastName,
      Email: data.email,
      Company: data.company,
      Phone: data.phone,
      Description: data.description,
      LeadSource: data.leadSource || 'lnk.day',
      ...data.customFields,
    };

    // Remove undefined values
    Object.keys(leadData).forEach((key) => {
      if (leadData[key] === undefined) delete leadData[key];
    });

    const result = await this.apiRequest<{ id: string; success: boolean }>(
      connection,
      'POST',
      '/sobjects/Lead',
      leadData,
    );

    return result;
  }

  async updateLead(
    teamId: string,
    leadId: string,
    data: Record<string, any>,
  ): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    await this.apiRequest(connection, 'PATCH', `/sobjects/Lead/${leadId}`, data);
  }

  // ========== Contacts ==========

  async getContacts(teamId: string, limit: number = 100): Promise<SalesforceQueryResult> {
    return this.query(
      teamId,
      `SELECT Id, FirstName, LastName, Email, Phone, AccountId, Account.Name
       FROM Contact
       ORDER BY CreatedDate DESC
       LIMIT ${limit}`,
    );
  }

  async getContactByEmail(teamId: string, email: string): Promise<SalesforceRecord | null> {
    const result = await this.query(
      teamId,
      `SELECT Id, FirstName, LastName, Email, AccountId
       FROM Contact
       WHERE Email = '${email}'
       LIMIT 1`,
    );
    return result.records[0] || null;
  }

  async createContact(
    teamId: string,
    data: {
      firstName?: string;
      lastName: string;
      email?: string;
      phone?: string;
      accountId?: string;
      customFields?: Record<string, any>;
    },
  ): Promise<{ id: string; success: boolean }> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    const contactData: Record<string, any> = {
      FirstName: data.firstName,
      LastName: data.lastName,
      Email: data.email,
      Phone: data.phone,
      AccountId: data.accountId,
      ...data.customFields,
    };

    Object.keys(contactData).forEach((key) => {
      if (contactData[key] === undefined) delete contactData[key];
    });

    return this.apiRequest(connection, 'POST', '/sobjects/Contact', contactData);
  }

  // ========== Opportunities ==========

  async getOpportunities(teamId: string, limit: number = 100): Promise<SalesforceQueryResult> {
    return this.query(
      teamId,
      `SELECT Id, Name, StageName, Amount, CloseDate, AccountId, Account.Name
       FROM Opportunity
       ORDER BY CreatedDate DESC
       LIMIT ${limit}`,
    );
  }

  async updateOpportunityStage(
    teamId: string,
    opportunityId: string,
    stageName: string,
  ): Promise<void> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    await this.apiRequest(
      connection,
      'PATCH',
      `/sobjects/Opportunity/${opportunityId}`,
      { StageName: stageName },
    );
  }

  // ========== Tasks (Activities) ==========

  async createTask(
    teamId: string,
    data: {
      subject: string;
      description?: string;
      whoId?: string; // Lead or Contact ID
      whatId?: string; // Account, Opportunity, etc.
      status?: string;
      priority?: string;
      activityDate?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    if (!connection.settings.logActivities) {
      return { id: '', success: false };
    }

    const taskData = {
      Subject: data.subject,
      Description: data.description,
      WhoId: data.whoId,
      WhatId: data.whatId,
      Status: data.status || 'Completed',
      Priority: data.priority || 'Normal',
      ActivityDate: data.activityDate || new Date().toISOString().split('T')[0],
    };

    return this.apiRequest(connection, 'POST', '/sobjects/Task', taskData);
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

    if (visitorEmail) {
      // Try to find lead first, then contact
      let record = await this.getLeadByEmail(teamId, visitorEmail);
      let recordType = 'Lead';

      if (!record) {
        record = await this.getContactByEmail(teamId, visitorEmail);
        recordType = 'Contact';
      }

      if (!record && connection.settings.autoCreateLeads) {
        // Create a new lead
        const result = await this.createLead(teamId, {
          lastName: visitorEmail.split('@')[0],
          email: visitorEmail,
          company: '[Unknown]',
          leadSource: 'lnk.day Link Click',
        });
        if (result.success) {
          record = { Id: result.id } as SalesforceRecord;
          recordType = 'Lead';
        }
      }

      if (record) {
        // Log activity
        await this.createTask(teamId, {
          subject: `Link Click: ${shortUrl}`,
          description: `Visitor clicked link ${shortUrl}\nLink ID: ${linkId}\n${
            metadata ? JSON.stringify(metadata, null, 2) : ''
          }`,
          whoId: record.Id,
          status: 'Completed',
        });
      }
    }

    connection.lastSyncAt = new Date();
    await this.connectionRepo.save(connection);
  }

  // ========== Custom Objects ==========

  async describeObject(teamId: string, objectName: string): Promise<any> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    return this.apiRequest(connection, 'GET', `/sobjects/${objectName}/describe`);
  }

  async getAvailableObjects(teamId: string): Promise<any[]> {
    const connection = await this.getConnection(teamId);
    if (!connection) throw new NotFoundException('Salesforce not connected');

    const result = await this.apiRequest<{ sobjects: any[] }>(
      connection,
      'GET',
      '/sobjects',
    );

    return result.sobjects
      .filter((obj) => obj.queryable && obj.createable)
      .map((obj) => ({
        name: obj.name,
        label: obj.label,
        keyPrefix: obj.keyPrefix,
      }));
  }
}
