import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';

import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { SalesforceService } from './salesforce.service';

// DTOs
class UpdateSettingsDto {
  syncLeads?: boolean;
  syncContacts?: boolean;
  syncOpportunities?: boolean;
  logActivities?: boolean;
  autoCreateLeads?: boolean;
  fieldMapping?: Record<string, string>;
}

class CreateLeadDto {
  firstName?: string;
  lastName: string;
  email?: string;
  company: string;
  phone?: string;
  description?: string;
  leadSource?: string;
  customFields?: Record<string, any>;
}

class CreateContactDto {
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  accountId?: string;
  customFields?: Record<string, any>;
}

class CreateTaskDto {
  subject: string;
  description?: string;
  whoId?: string;
  whatId?: string;
  status?: string;
  priority?: string;
}

class QueryDto {
  soql: string;
}

@ApiTags('salesforce')
@Controller('salesforce')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class SalesforceController {
  constructor(private readonly salesforceService: SalesforceService) {}

  // ========== OAuth Endpoints ==========

  @Get('oauth/install')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Initiate Salesforce OAuth flow' })
  @ApiQuery({ name: 'sandbox', required: false, type: Boolean })
  initiateOAuth(
    @Query('teamId') teamId: string,
    @Query('redirectUrl') redirectUrl: string,
    @Query('sandbox') sandbox: string,
    @Res() res: Response,
  ) {
    const authUrl = this.salesforceService.generateAuthUrl(
      teamId,
      redirectUrl,
      sandbox === 'true',
    );
    return res.redirect(authUrl);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle Salesforce OAuth callback' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const { connection, redirectUrl } = await this.salesforceService.handleOAuthCallback(
        code,
        state,
      );

      const successUrl =
        redirectUrl ||
        `/settings/integrations?salesforce=connected&org=${connection.orgId}`;
      return res.redirect(successUrl);
    } catch (error) {
      return res.redirect(`/settings/integrations?salesforce=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('connection')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Salesforce connection status' })
  async getConnection(@ScopedTeamId() teamId: string) {
    const connection = await this.salesforceService.getConnection(teamId);

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      instanceUrl: connection.instanceUrl,
      orgId: connection.orgId,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      settings: connection.settings,
    };
  }

  @Put('settings')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update Salesforce integration settings' })
  async updateSettings(
    @ScopedTeamId() teamId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const connection = await this.salesforceService.updateSettings(teamId, dto);
    return { success: true, settings: connection.settings };
  }

  @Delete('disconnect')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Disconnect Salesforce integration' })
  async disconnect(@ScopedTeamId() teamId: string) {
    await this.salesforceService.disconnect(teamId);
    return { success: true };
  }

  // ========== Leads ==========

  @Get('leads')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Salesforce leads' })
  @ApiQuery({ name: 'limit', required: false })
  async getLeads(
    @ScopedTeamId() teamId: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesforceService.getLeads(teamId, limit ? parseInt(limit) : 100);
  }

  @Get('leads/search')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Search lead by email' })
  async searchLead(
    @ScopedTeamId() teamId: string,
    @Query('email') email: string,
  ) {
    const lead = await this.salesforceService.getLeadByEmail(teamId, email);
    return lead || { found: false };
  }

  @Post('leads')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Create a Salesforce lead' })
  async createLead(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.salesforceService.createLead(teamId, dto);
  }

  @Put('leads/:leadId')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update a Salesforce lead' })
  async updateLead(
    @ScopedTeamId() teamId: string,
    @Param('leadId') leadId: string,
    @Body() data: Record<string, any>,
  ) {
    await this.salesforceService.updateLead(teamId, leadId, data);
    return { success: true };
  }

  // ========== Contacts ==========

  @Get('contacts')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Salesforce contacts' })
  @ApiQuery({ name: 'limit', required: false })
  async getContacts(
    @ScopedTeamId() teamId: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesforceService.getContacts(teamId, limit ? parseInt(limit) : 100);
  }

  @Get('contacts/search')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Search contact by email' })
  async searchContact(
    @ScopedTeamId() teamId: string,
    @Query('email') email: string,
  ) {
    const contact = await this.salesforceService.getContactByEmail(teamId, email);
    return contact || { found: false };
  }

  @Post('contacts')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Create a Salesforce contact' })
  async createContact(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.salesforceService.createContact(teamId, dto);
  }

  // ========== Opportunities ==========

  @Get('opportunities')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get Salesforce opportunities' })
  @ApiQuery({ name: 'limit', required: false })
  async getOpportunities(
    @ScopedTeamId() teamId: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesforceService.getOpportunities(teamId, limit ? parseInt(limit) : 100);
  }

  @Put('opportunities/:opportunityId/stage')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update opportunity stage' })
  async updateOpportunityStage(
    @ScopedTeamId() teamId: string,
    @Param('opportunityId') opportunityId: string,
    @Body('stageName') stageName: string,
  ) {
    await this.salesforceService.updateOpportunityStage(teamId, opportunityId, stageName);
    return { success: true };
  }

  // ========== Tasks ==========

  @Post('tasks')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Create a Salesforce task' })
  async createTask(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.salesforceService.createTask(teamId, dto);
  }

  // ========== SOQL Query ==========

  @Post('query')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Execute SOQL query' })
  async query(
    @ScopedTeamId() teamId: string,
    @Body() dto: QueryDto,
  ) {
    return this.salesforceService.query(teamId, dto.soql);
  }

  // ========== Objects ==========

  @Get('objects')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get available Salesforce objects' })
  async getObjects(@ScopedTeamId() teamId: string) {
    const objects = await this.salesforceService.getAvailableObjects(teamId);
    return { objects };
  }

  @Get('objects/:objectName/describe')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Describe a Salesforce object' })
  async describeObject(
    @ScopedTeamId() teamId: string,
    @Param('objectName') objectName: string,
  ) {
    return this.salesforceService.describeObject(teamId, objectName);
  }

  // ========== Link Tracking ==========

  @Post('track-click')
  @ApiOperation({ summary: 'Track link click in Salesforce (internal)' })
  async trackClick(
    @ScopedTeamId() teamId: string,
    @Body()
    body: {
      linkId: string;
      shortUrl: string;
      visitorEmail?: string;
      metadata?: Record<string, any>;
    },
  ) {
    await this.salesforceService.trackLinkClick(
      teamId,
      body.linkId,
      body.shortUrl,
      body.visitorEmail,
      body.metadata,
    );
    return { success: true };
  }
}
