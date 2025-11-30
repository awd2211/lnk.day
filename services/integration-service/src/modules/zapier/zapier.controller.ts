import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { ZapierService, TriggerEvent } from './zapier.service';

// DTOs
class SubscribeDto {
  event: TriggerEvent;
  webhookUrl: string;
  zapId?: string;
}

class CreateLinkActionDto {
  url: string;
  title?: string;
  customSlug?: string;
  tags?: string[];
  folderId?: string;
}

class UpdateLinkActionDto {
  title?: string;
  originalUrl?: string;
  tags?: string[];
  enabled?: boolean;
}

class CreateQrActionDto {
  url: string;
  size?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  format?: 'png' | 'svg';
}

@ApiTags('zapier')
@Controller('zapier')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class ZapierController {
  constructor(private readonly zapierService: ZapierService) {}

  // ==================== Authentication ====================

  @Get('auth/test')
  @ApiOperation({ summary: 'Test authentication (for Zapier)' })
  @ApiHeader({ name: 'x-team-id', required: true })
  async testAuth(@ScopedTeamId() teamId: string) {
    return {
      success: true,
      teamId,
      message: 'Authentication successful',
    };
  }

  // ==================== Triggers (Hooks) ====================

  @Post('hooks/subscribe')
  @ApiOperation({ summary: 'Subscribe to a trigger event' })
  @ApiHeader({ name: 'x-team-id', required: true })
  async subscribe(
    @ScopedTeamId() teamId: string,
    @Body() dto: SubscribeDto,
  ) {
    const subscription = await this.zapierService.subscribeToTrigger(
      teamId,
      dto.event,
      dto.webhookUrl,
    );

    return {
      id: subscription.id,
      event: subscription.event,
      enabled: subscription.enabled,
    };
  }

  @Delete('hooks/subscribe/:id')
  @ApiHeader({ name: 'x-team-id', required: true })
  @HttpCode(204)
  @ApiOperation({ summary: 'Unsubscribe from a trigger event' })
  async unsubscribe(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
  ) {
    await this.zapierService.unsubscribeFromTrigger(id, teamId);
    return null;
  }

  @Get('hooks/subscriptions')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'List all subscriptions' })
  async listSubscriptions(@ScopedTeamId() teamId: string) {
    const subscriptions = await this.zapierService.getSubscriptions(teamId);
    return { subscriptions };
  }

  // ==================== Polling Triggers ====================

  @Get('triggers/new_link')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Poll for new links (Zapier polling trigger)' })
  async pollNewLinks(
    @ScopedTeamId() teamId: string,
    @Query('since') since?: string,
  ) {
    const links = await this.zapierService.getRecentLinks(
      teamId,
      since ? new Date(since) : undefined,
    );
    return links;
  }

  @Get('triggers/new_click')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Poll for new clicks (Zapier polling trigger)' })
  async pollNewClicks(
    @ScopedTeamId() teamId: string,
    @Query('since') since?: string,
  ) {
    const clicks = await this.zapierService.getRecentClicks(
      teamId,
      since ? new Date(since) : undefined,
    );
    return clicks;
  }

  // ==================== Sample Data ====================

  @Get('triggers/:event/sample')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Get sample data for a trigger event' })
  async getSampleData(@Param('event') event: TriggerEvent) {
    const sample = this.zapierService.getSampleData(event);
    return [sample]; // Zapier expects an array
  }

  // ==================== Actions ====================

  @Post('actions/create_link')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Create a short link (Zapier action)' })
  async createLink(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateLinkActionDto,
  ) {
    const result = await this.zapierService.createLink(teamId, dto);
    if (!result.success) {
      return { error: result.error };
    }
    return result.data;
  }

  @Post('actions/update_link')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Update a link (Zapier action)' })
  async updateLink(
    @ScopedTeamId() teamId: string,
    @Body() body: { linkId: string } & UpdateLinkActionDto,
  ) {
    const { linkId, ...data } = body;
    const result = await this.zapierService.updateLink(teamId, linkId, data);
    if (!result.success) {
      return { error: result.error };
    }
    return result.data;
  }

  @Post('actions/delete_link')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Delete a link (Zapier action)' })
  async deleteLink(
    @ScopedTeamId() teamId: string,
    @Body() body: { linkId: string },
  ) {
    const result = await this.zapierService.deleteLink(teamId, body.linkId);
    if (!result.success) {
      return { error: result.error };
    }
    return { success: true, deleted: body.linkId };
  }

  @Post('actions/get_link')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Get link details (Zapier action)' })
  async getLink(
    @ScopedTeamId() teamId: string,
    @Body() body: { linkId: string },
  ) {
    const result = await this.zapierService.getLink(teamId, body.linkId);
    if (!result.success) {
      return { error: result.error };
    }
    return result.data;
  }

  @Post('actions/get_link_stats')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Get link statistics (Zapier action)' })
  async getLinkStats(
    @ScopedTeamId() teamId: string,
    @Body() body: { linkId: string },
  ) {
    const result = await this.zapierService.getLinkStats(teamId, body.linkId);
    if (!result.success) {
      return { error: result.error };
    }
    return result.data;
  }

  @Post('actions/create_qr')
  @ApiHeader({ name: 'x-team-id', required: true })
  @ApiOperation({ summary: 'Create a QR code (Zapier action)' })
  async createQr(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreateQrActionDto,
  ) {
    const result = await this.zapierService.createQrCode(teamId, dto);
    if (!result.success) {
      return { error: result.error };
    }
    return result.data;
  }

  // ==================== Available Events & Actions ====================

  @Get('meta/triggers')
  @ApiOperation({ summary: 'List available trigger events' })
  getAvailableTriggers() {
    return {
      triggers: [
        { key: 'link.created', name: 'New Link Created', type: 'hook' },
        { key: 'link.clicked', name: 'Link Clicked', type: 'hook' },
        { key: 'link.updated', name: 'Link Updated', type: 'hook' },
        { key: 'link.deleted', name: 'Link Deleted', type: 'hook' },
        { key: 'link.milestone', name: 'Link Reaches Milestone', type: 'hook' },
        { key: 'qr.scanned', name: 'QR Code Scanned', type: 'hook' },
        { key: 'page.published', name: 'Page Published', type: 'hook' },
        { key: 'new_link', name: 'New Link (Polling)', type: 'polling' },
        { key: 'new_click', name: 'New Click (Polling)', type: 'polling' },
      ],
    };
  }

  @Get('meta/actions')
  @ApiOperation({ summary: 'List available actions' })
  getAvailableActions() {
    return {
      actions: [
        { key: 'create_link', name: 'Create Short Link' },
        { key: 'update_link', name: 'Update Link' },
        { key: 'delete_link', name: 'Delete Link' },
        { key: 'get_link', name: 'Get Link Details' },
        { key: 'get_link_stats', name: 'Get Link Statistics' },
        { key: 'create_qr', name: 'Create QR Code' },
      ],
    };
  }
}
