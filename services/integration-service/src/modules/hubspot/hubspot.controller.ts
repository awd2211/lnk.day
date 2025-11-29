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
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { HubSpotService } from './hubspot.service';
import {
  InitiateHubSpotOAuthDto,
  HubSpotOAuthCallbackDto,
  UpdateHubSpotSettingsDto,
  CreateHubSpotContactDto,
  UpdateHubSpotContactDto,
  LogHubSpotActivityDto,
  AssociateLinkToDealDto,
  HubSpotWebhookEvent,
} from './dto/hubspot.dto';

// Placeholder auth guard
class JwtAuthGuard {
  canActivate() {
    return true;
  }
}

@ApiTags('hubspot')
@Controller('hubspot')
export class HubSpotController {
  constructor(
    private readonly hubspotService: HubSpotService,
    private readonly configService: ConfigService,
  ) {}

  // ========== OAuth Endpoints ==========

  @Get('oauth/install')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Initiate HubSpot OAuth flow' })
  initiateOAuth(@Query() dto: InitiateHubSpotOAuthDto, @Res() res: Response) {
    const authUrl = this.hubspotService.generateAuthUrl(dto.teamId, dto.redirectUrl);
    return res.redirect(authUrl);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle HubSpot OAuth callback' })
  async handleOAuthCallback(
    @Query() query: HubSpotOAuthCallbackDto,
    @Res() res: Response,
  ) {
    try {
      const { connection, redirectUrl } = await this.hubspotService.handleOAuthCallback(
        query.code,
        query.state,
      );

      const successUrl =
        redirectUrl ||
        `/settings/integrations?hubspot=connected&portal=${connection.hubspotPortalId}`;
      return res.redirect(successUrl);
    } catch (error) {
      return res.redirect(`/settings/integrations?hubspot=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('connection')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get HubSpot connection status' })
  async getConnection(@Headers('x-team-id') teamId: string) {
    const connection = await this.hubspotService.getConnection(teamId);

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      portalId: connection.hubspotPortalId,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      settings: connection.settings,
    };
  }

  @Put('settings')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update HubSpot integration settings' })
  async updateSettings(
    @Headers('x-team-id') teamId: string,
    @Body() dto: UpdateHubSpotSettingsDto,
  ) {
    const connection = await this.hubspotService.updateSettings(teamId, dto);
    return { success: true, settings: connection.settings };
  }

  @Delete('disconnect')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Disconnect HubSpot integration' })
  async disconnect(@Headers('x-team-id') teamId: string) {
    await this.hubspotService.disconnect(teamId);
    return { success: true };
  }

  @Post('setup-properties')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Create custom properties in HubSpot' })
  async setupProperties(@Headers('x-team-id') teamId: string) {
    await this.hubspotService.ensureCustomProperties(teamId);
    return { success: true, message: 'Custom properties created' };
  }

  // ========== Contact Endpoints ==========

  @Get('contacts')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'List HubSpot contacts' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'after', required: false })
  async getContacts(
    @Headers('x-team-id') teamId: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
  ) {
    return this.hubspotService.getContacts(
      teamId,
      limit ? parseInt(limit) : 100,
      after,
    );
  }

  @Get('contacts/search')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Search for a contact by email' })
  async searchContact(
    @Headers('x-team-id') teamId: string,
    @Query('email') email: string,
  ) {
    const contact = await this.hubspotService.getContactByEmail(teamId, email);
    return contact || { found: false };
  }

  @Post('contacts')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Create a HubSpot contact' })
  async createContact(
    @Headers('x-team-id') teamId: string,
    @Body() dto: CreateHubSpotContactDto,
  ) {
    return this.hubspotService.createContact(teamId, dto);
  }

  @Put('contacts/:contactId')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update a HubSpot contact' })
  async updateContact(
    @Headers('x-team-id') teamId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateHubSpotContactDto,
  ) {
    return this.hubspotService.updateContact(teamId, contactId, dto);
  }

  // ========== Deal Endpoints ==========

  @Get('deals')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'List HubSpot deals' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'after', required: false })
  async getDeals(
    @Headers('x-team-id') teamId: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
  ) {
    return this.hubspotService.getDeals(
      teamId,
      limit ? parseInt(limit) : 100,
      after,
    );
  }

  @Get('deals/:dealId')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Get a specific deal' })
  async getDeal(
    @Headers('x-team-id') teamId: string,
    @Param('dealId') dealId: string,
  ) {
    return this.hubspotService.getDeal(teamId, dealId);
  }

  @Put('deals/:dealId/stage')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Update deal stage' })
  async updateDealStage(
    @Headers('x-team-id') teamId: string,
    @Param('dealId') dealId: string,
    @Body('stage') stage: string,
  ) {
    return this.hubspotService.updateDealStage(teamId, dealId, stage);
  }

  // ========== Activity Endpoints ==========

  @Post('activities')
  @ApiHeader({ name: 'x-team-id', required: true })
  
  @ApiOperation({ summary: 'Log an activity to HubSpot' })
  async logActivity(
    @Headers('x-team-id') teamId: string,
    @Body() dto: LogHubSpotActivityDto,
  ) {
    const result = await this.hubspotService.logActivity(teamId, dto);
    return { success: true, engagementId: result?.engagement?.id };
  }

  // ========== Webhook Endpoint ==========

  @Post('webhook')
  @ApiOperation({ summary: 'Receive HubSpot webhook events' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hubspot-signature') signature: string,
    @Body() events: HubSpotWebhookEvent[],
  ) {
    // Verify webhook signature
    const clientSecret = this.configService.get<string>('HUBSPOT_CLIENT_SECRET');
    const rawBody = req.rawBody?.toString() || JSON.stringify(events);

    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { error: 'Invalid signature' };
    }

    // Process events
    for (const event of events) {
      await this.processWebhookEvent(event);
    }

    return { processed: events.length };
  }

  private async processWebhookEvent(event: HubSpotWebhookEvent): Promise<void> {
    // Handle different event types
    switch (event.subscriptionType) {
      case 'contact.propertyChange':
        // Handle contact property changes
        break;

      case 'contact.creation':
        // Handle new contact created in HubSpot
        break;

      case 'deal.propertyChange':
        // Handle deal stage changes
        break;

      default:
        // Log unknown event type
        break;
    }
  }

  // ========== Link Tracking Endpoint (Internal) ==========

  @Post('track-click')
  @ApiOperation({ summary: 'Track a link click in HubSpot (internal use)' })
  async trackClick(
    @Headers('x-team-id') teamId: string,
    @Body()
    body: {
      linkId: string;
      shortUrl: string;
      visitorEmail?: string;
      metadata?: Record<string, any>;
    },
  ) {
    await this.hubspotService.trackLinkClick(
      teamId,
      body.linkId,
      body.shortUrl,
      body.visitorEmail,
      body.metadata,
    );
    return { success: true };
  }
}
