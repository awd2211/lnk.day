import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Headers,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lnk/nestjs-common';
import { ModerationService, ModerationSettings } from './moderation.service';
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
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get moderation statistics' })
  async getStats() {
    return this.moderationService.getStats();
  }

  @Get('flagged-links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get flagged links list' })
  async getFlaggedLinks(@Query() query: QueryFlaggedLinksDto) {
    return this.moderationService.findAll(query);
  }

  @Get('flagged-links/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get flagged link details' })
  async getFlaggedLink(@Param('id') id: string) {
    return this.moderationService.findOne(id);
  }

  @Get('flagged-links/:id/reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reports for a flagged link' })
  async getReports(@Param('id') id: string) {
    return this.moderationService.getReports(id);
  }

  @Post('flagged-links/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-name', required: false })
  @ApiOperation({ summary: 'Approve a flagged link' })
  async approveLink(
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName?: string,
  ) {
    return this.moderationService.approve(id, dto, userId, userName);
  }

  @Post('flagged-links/:id/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-name', required: false })
  @ApiOperation({ summary: 'Block a flagged link' })
  async blockLink(
    @Param('id') id: string,
    @Body() dto: BlockDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName?: string,
  ) {
    return this.moderationService.block(id, dto, userId, userName);
  }

  @Post('flagged-links/bulk-approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-name', required: false })
  @ApiOperation({ summary: 'Bulk approve flagged links' })
  async bulkApprove(
    @Body() dto: BulkApproveDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName?: string,
  ) {
    const count = await this.moderationService.bulkApprove(dto, userId, userName);
    return { approved: count };
  }

  @Post('flagged-links/bulk-block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-name', required: false })
  @ApiOperation({ summary: 'Bulk block flagged links' })
  async bulkBlock(
    @Body() dto: BulkBlockDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName?: string,
  ) {
    const count = await this.moderationService.bulkBlock(dto, userId, userName);
    return { blocked: count };
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a link (public endpoint)' })
  async reportLink(@Body() dto: CreateReportDto, @Ip() ip: string) {
    return this.moderationService.createReport(dto, ip);
  }

  @Get('blocked-users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get blocked users list' })
  async getBlockedUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.moderationService.getBlockedUsers({ page, limit });
  }

  @Post('users/:userId/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    // TODO: Call user-service to block the user
    return { success: true, message: 'User block request sent' };
  }

  @Post('users/:userId/unblock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(@Param('userId') userId: string) {
    // TODO: Call user-service to unblock the user
    return { success: true, message: 'User unblock request sent' };
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get moderation settings' })
  async getSettings(): Promise<ModerationSettings> {
    return this.moderationService.getSettings();
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
