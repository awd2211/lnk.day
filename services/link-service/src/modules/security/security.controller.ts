import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  CurrentUser,
  ScopeGuard,
  PermissionGuard,
  ScopedTeamId,
  RequirePermissions,
  Permission,
} from '@lnk/nestjs-common';
import { SecurityService } from './security.service';

class ScanUrlDto {
  url: string;
  force?: boolean;
}

class BatchScanDto {
  urls: string[];
}

class QuickCheckDto {
  url: string;
}

@ApiTags('security')
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan a URL for security threats' })
  async scanUrl(@Body() dto: ScanUrlDto) {
    const analysis = await this.securityService.analyzeUrl(dto.url, {
      force: dto.force,
    });
    return analysis;
  }

  @Post('scan/batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch scan multiple URLs' })
  async batchScan(@Body() dto: BatchScanDto) {
    const results = await this.securityService.batchScan(dto.urls);
    return {
      count: results.size,
      results: Object.fromEntries(results),
    };
  }

  @Post('check')
  @ApiOperation({ summary: 'Quick safety check for a URL' })
  async quickCheck(@Body() dto: QuickCheckDto) {
    return this.securityService.quickSafetyCheck(dto.url);
  }

  @Get('safe-browsing')
  @ApiOperation({ summary: 'Check URL against Google Safe Browsing' })
  async checkSafeBrowsing(@Query('url') url: string) {
    return this.securityService.checkGoogleSafeBrowsing(url);
  }

  @Get('reputation')
  @ApiOperation({ summary: 'Calculate reputation score for a URL' })
  async getReputation(@Query('url') url: string) {
    return this.securityService.calculateReputationScore(url);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scan history for a URL' })
  async getScanHistory(
    @Query('url') url: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.securityService.getScanHistory(
      url,
      limit ? parseInt(limit) : 10,
    );
    return { url, history };
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent scans for team' })
  async getRecentScans(
    @CurrentUser() user: { teamId: string },
    @Query('limit') limit?: string,
  ) {
    const scans = await this.securityService.getRecentScans(
      user.teamId,
      limit ? parseInt(limit) : 50,
    );
    return { scans };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get reputation category descriptions' })
  getCategories() {
    return {
      categories: [
        {
          id: 'trusted',
          name: 'Trusted',
          scoreRange: '80-100',
          description: 'Well-known, highly reputable domain',
          color: '#22c55e',
        },
        {
          id: 'safe',
          name: 'Safe',
          scoreRange: '60-79',
          description: 'No known issues, appears safe',
          color: '#84cc16',
        },
        {
          id: 'suspicious',
          name: 'Suspicious',
          scoreRange: '40-59',
          description: 'Some risk factors detected, proceed with caution',
          color: '#f59e0b',
        },
        {
          id: 'malicious',
          name: 'Malicious',
          scoreRange: '0-39',
          description: 'High risk, potentially dangerous',
          color: '#ef4444',
        },
        {
          id: 'unknown',
          name: 'Unknown',
          scoreRange: 'N/A',
          description: 'Not enough data to determine safety',
          color: '#6b7280',
        },
      ],
    };
  }

  // ========== 前端兼容端点 ==========

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze URL security (alias for scan)' })
  async analyzeUrl(@Body() dto: ScanUrlDto) {
    return this.scanUrl(dto);
  }

  @Post('quick-check')
  @ApiOperation({ summary: 'Quick URL safety check (alias for check)' })
  async quickCheckUrl(@Body() dto: QuickCheckDto) {
    return this.quickCheck(dto);
  }

  @Post('batch-scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch scan URLs (alias for scan/batch)' })
  async batchScanUrls(@Body() dto: BatchScanDto) {
    return this.batchScan(dto);
  }

  @Get('suspended-links')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: 'Get suspended links' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getSuspendedLinks(
    @ScopedTeamId() teamId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.securityService.getSuspendedLinks(teamId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Post('suspended-links/:linkId/reinstate')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: 'Reinstate a suspended link' })
  async reinstateLink(
    @Param('linkId') linkId: string,
    @Body() body: { reason: string },
    @ScopedTeamId() teamId: string,
  ) {
    return this.securityService.reinstateLink(linkId, teamId, body.reason);
  }

  @Post('check-and-handle')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: 'Check URL and handle if malicious' })
  async checkAndHandle(@Body() dto: QuickCheckDto) {
    return this.securityService.checkAndHandleUrl(dto.url);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: 'Get security stats for team' })
  async getSecurityStats(@ScopedTeamId() teamId: string) {
    return this.securityService.getSecurityStats(teamId);
  }
}
