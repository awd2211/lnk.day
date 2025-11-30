import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  AdminOnly,
  CurrentUser,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { ModerationService, ModerationSettings } from './moderation.service';
import { UserClientService } from '../../common/user-client/user-client.service';
import {
  QueryFlaggedLinksDto,
  CreateReportDto,
  ApproveDto,
  BlockDto,
  BulkApproveDto,
  BulkBlockDto,
  UpdateModerationSettingsDto,
} from './dto/moderation.dto';
import { FlagReason } from './entities/flagged-link.entity';

@ApiTags('moderation')
@Controller('moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly userClientService: UserClientService,
  ) {}

  @Get('stats')
  @AdminOnly()
  @ApiOperation({ summary: 'Get moderation statistics' })
  async getStats() {
    return this.moderationService.getStats();
  }

  @Get('flagged-links')
  @AdminOnly()
  @ApiOperation({ summary: 'Get flagged links list' })
  async getFlaggedLinks(@Query() query: QueryFlaggedLinksDto) {
    return this.moderationService.findAll(query);
  }

  @Get('flagged-links/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Get flagged link details' })
  async getFlaggedLink(@Param('id') id: string) {
    return this.moderationService.findOne(id);
  }

  @Get('flagged-links/:id/reports')
  @AdminOnly()
  @ApiOperation({ summary: 'Get reports for a flagged link' })
  async getReports(@Param('id') id: string) {
    return this.moderationService.getReports(id);
  }

  @Post('flagged-links/:id/approve')
  @AdminOnly()
  @ApiOperation({ summary: 'Approve a flagged link' })
  async approveLink(
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderationService.approve(id, dto, user.sub, user.email);
  }

  @Post('flagged-links/:id/block')
  @AdminOnly()
  @ApiOperation({ summary: 'Block a flagged link' })
  async blockLink(
    @Param('id') id: string,
    @Body() dto: BlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderationService.block(id, dto, user.sub, user.email);
  }

  @Post('flagged-links/bulk-approve')
  @AdminOnly()
  @ApiOperation({ summary: 'Bulk approve flagged links' })
  async bulkApprove(
    @Body() dto: BulkApproveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const count = await this.moderationService.bulkApprove(dto, user.sub, user.email);
    return { approved: count };
  }

  @Post('flagged-links/bulk-block')
  @AdminOnly()
  @ApiOperation({ summary: 'Bulk block flagged links' })
  async bulkBlock(
    @Body() dto: BulkBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const count = await this.moderationService.bulkBlock(dto, user.sub, user.email);
    return { blocked: count };
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a link (public endpoint)' })
  async reportLink(@Body() dto: CreateReportDto, @Ip() ip: string) {
    return this.moderationService.createReport(dto, ip);
  }

  @Get('blocked-users')
  @AdminOnly()
  @ApiOperation({ summary: 'Get blocked users list' })
  async getBlockedUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.moderationService.getBlockedUsers({ page, limit });
  }

  @Post('users/:userId/block')
  @AdminOnly()
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    const success = await this.userClientService.suspendUser(userId, body.reason);
    if (!success) {
      return { success: false, message: 'Failed to block user' };
    }
    return { success: true, message: 'User has been blocked' };
  }

  @Post('users/:userId/unblock')
  @AdminOnly()
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(@Param('userId') userId: string) {
    const success = await this.userClientService.unsuspendUser(userId);
    if (!success) {
      return { success: false, message: 'Failed to unblock user' };
    }
    return { success: true, message: 'User has been unblocked' };
  }

  @Get('settings')
  @AdminOnly()
  @ApiOperation({ summary: 'Get moderation settings' })
  async getSettings(): Promise<ModerationSettings> {
    return this.moderationService.getSettings();
  }

  @Put('settings')
  @AdminOnly()
  @ApiOperation({ summary: 'Update moderation settings' })
  async updateSettings(@Body() dto: UpdateModerationSettingsDto): Promise<ModerationSettings> {
    return this.moderationService.updateSettings(dto);
  }

  // Internal endpoints for other services
  @Post('internal/flag')
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  @ApiOperation({ summary: 'Flag a link (internal)' })
  async internalFlag(
    @Body() body: {
      linkId: string;
      reason: FlagReason;
      severity?: string;
      autoDetected?: boolean;
      detectedBy?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.moderationService.flagLink(body.linkId, body.reason, {
      severity: body.severity as any,
      autoDetected: body.autoDetected,
      detectedBy: body.detectedBy,
      metadata: body.metadata,
    });
  }

  @Post('internal/unflag')
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  @ApiOperation({ summary: 'Unflag a link (internal)' })
  async internalUnflag(@Body() body: { linkId: string }) {
    await this.moderationService.unflagLink(body.linkId);
    return { success: true };
  }
}
