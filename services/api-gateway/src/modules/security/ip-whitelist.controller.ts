import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { IpWhitelistService, IpWhitelistSettings } from './ip-whitelist.service';

// Placeholder auth guard
class JwtAuthGuard {
  canActivate() {
    return true;
  }
}

class AddIpDto {
  ip: string;
  description?: string;
  expiresAt?: string; // ISO date string
}

class UpdateSettingsDto {
  enabled?: boolean;
  enforcementMode?: 'block' | 'log_only';
  bypassForAdmins?: boolean;
  allowedCidrs?: string[];
}

class BulkIpsDto {
  ips: string[];
}

@ApiTags('ip-whitelist')
@Controller('security/ip-whitelist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IpWhitelistController {
  constructor(private readonly ipWhitelistService: IpWhitelistService) {}

  // ========== Settings ==========

  @Get('settings')
  @ApiOperation({ summary: 'Get IP whitelist settings' })
  async getSettings(@Headers('x-team-id') teamId: string) {
    return this.ipWhitelistService.getSettings(teamId);
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update IP whitelist settings' })
  async updateSettings(
    @Headers('x-team-id') teamId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.ipWhitelistService.updateSettings(teamId, dto);
  }

  @Post('enable')
  @ApiOperation({ summary: 'Enable IP whitelist' })
  async enable(@Headers('x-team-id') teamId: string) {
    await this.ipWhitelistService.enableWhitelist(teamId);
    return { success: true, message: 'IP whitelist enabled' };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable IP whitelist' })
  async disable(@Headers('x-team-id') teamId: string) {
    await this.ipWhitelistService.disableWhitelist(teamId);
    return { success: true, message: 'IP whitelist disabled' };
  }

  // ========== IP Entries ==========

  @Get('entries')
  @ApiOperation({ summary: 'List all whitelisted IPs' })
  async listIps(@Headers('x-team-id') teamId: string) {
    const entries = await this.ipWhitelistService.listIps(teamId);
    return { entries, count: entries.length };
  }

  @Post('entries')
  @ApiOperation({ summary: 'Add an IP to the whitelist' })
  async addIp(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: AddIpDto,
  ) {
    const entry = await this.ipWhitelistService.addIp(
      teamId,
      dto.ip,
      userId,
      dto.description,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
    return entry;
  }

  @Delete('entries/:ip')
  @ApiOperation({ summary: 'Remove an IP from the whitelist' })
  async removeIp(
    @Headers('x-team-id') teamId: string,
    @Param('ip') ip: string,
  ) {
    // URL decode the IP (in case it's a CIDR like 192.168.1.0/24)
    const decodedIp = decodeURIComponent(ip);
    const removed = await this.ipWhitelistService.removeIp(teamId, decodedIp);
    return { success: removed };
  }

  @Post('entries/bulk')
  @ApiOperation({ summary: 'Add multiple IPs to the whitelist' })
  @ApiBody({
    description: 'List of IPs to add',
    type: BulkIpsDto,
  })
  async bulkAddIps(
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: BulkIpsDto,
  ) {
    const result = await this.ipWhitelistService.bulkAddIps(teamId, dto.ips, userId);
    return {
      success: true,
      added: result.added,
      failed: result.failed,
    };
  }

  @Delete('entries/bulk')
  @ApiOperation({ summary: 'Remove multiple IPs from the whitelist' })
  @ApiBody({
    description: 'List of IPs to remove',
    type: BulkIpsDto,
  })
  async bulkRemoveIps(
    @Headers('x-team-id') teamId: string,
    @Body() dto: BulkIpsDto,
  ) {
    const removed = await this.ipWhitelistService.bulkRemoveIps(teamId, dto.ips);
    return { success: true, removed };
  }

  // ========== Validation ==========

  @Get('check')
  @ApiOperation({ summary: 'Check if an IP is whitelisted' })
  async checkIp(
    @Headers('x-team-id') teamId: string,
    @Query('ip') ip: string,
  ) {
    return this.ipWhitelistService.checkIp(teamId, ip);
  }

  @Get('my-ip')
  @ApiOperation({ summary: 'Get your current IP address' })
  async getMyIp(
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';
    return { ip };
  }

  // ========== Suggested IPs ==========

  @Get('suggested')
  @ApiOperation({ summary: 'Get suggested IPs to whitelist' })
  async getSuggestedIps(@Headers('x-team-id') teamId: string) {
    // Return common suggestions
    return {
      suggestions: [
        {
          type: 'current',
          description: 'Your current IP address',
          note: 'Use /my-ip endpoint to get your current IP',
        },
        {
          type: 'cidr',
          examples: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
          description: 'Private network ranges',
        },
        {
          type: 'wildcard',
          examples: ['203.0.113.*'],
          description: 'Wildcard patterns',
        },
      ],
      tips: [
        'Add your office IP ranges to allow all employees',
        'Use CIDR notation for IP ranges (e.g., 192.168.1.0/24)',
        'Set expiration dates for temporary access',
        'Enable log_only mode first to test before blocking',
      ],
    };
  }
}
