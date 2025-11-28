import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
}
