import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPlatform } from './entities/pixel-config.entity';

class CreatePixelConfigDto {
  platform: AnalyticsPlatform;
  pixelId: string;
  name?: string;
  linkId?: string;
  enabled?: boolean;
  events?: string[];
  serverSideEnabled?: boolean;
  accessToken?: string;
  settings?: {
    testMode?: boolean;
    customParameters?: Record<string, string>;
    conversionLabel?: string;
    eventValueEnabled?: boolean;
  };
}

class UpdatePixelConfigDto {
  name?: string;
  enabled?: boolean;
  events?: string[];
  serverSideEnabled?: boolean;
  accessToken?: string;
  settings?: Record<string, any>;
}

class TestPixelDto {
  pixelId: string;
  platform: AnalyticsPlatform;
}

@ApiTags('analytics')
@Controller('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('pixels')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Create a pixel configuration' })
  async createPixel(
    @ScopedTeamId() teamId: string,
    @Body() dto: CreatePixelConfigDto,
  ) {
    // Validate pixel format
    const validation = this.analyticsService.validatePixelConfig({
      platform: dto.platform,
      pixelId: dto.pixelId,
      enabled: dto.enabled ?? true,
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    return this.analyticsService.createPixelConfig(teamId, dto);
  }

  @Get('pixels')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get all pixel configurations for team' })
  async getPixels(
    @ScopedTeamId() teamId: string,
    @Query('linkId') linkId?: string,
  ) {
    if (linkId) {
      return this.analyticsService.getPixelConfigsForLink(teamId, linkId);
    }
    return this.analyticsService.getTeamPixelConfigs(teamId);
  }

  @Get('pixels/:id')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get a specific pixel configuration' })
  async getPixel(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
  ) {
    return this.analyticsService.getPixelConfig(id, teamId);
  }

  @Put('pixels/:id')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Update a pixel configuration' })
  async updatePixel(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePixelConfigDto,
  ) {
    return this.analyticsService.updatePixelConfig(id, teamId, dto);
  }

  @Delete('pixels/:id')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Delete a pixel configuration' })
  async deletePixel(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
  ) {
    await this.analyticsService.deletePixelConfig(id, teamId);
    return { success: true };
  }

  @Post('pixels/:id/toggle')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Toggle pixel enabled status' })
  async togglePixel(
    @ScopedTeamId() teamId: string,
    @Param('id') id: string,
  ) {
    return this.analyticsService.togglePixelConfig(id, teamId);
  }

  @Post('test')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Test a pixel configuration' })
  async testPixel(
    @Body() dto: TestPixelDto,
  ) {
    const validation = this.analyticsService.validatePixelConfig({
      platform: dto.platform,
      pixelId: dto.pixelId,
      enabled: true,
    });

    return {
      valid: validation.valid,
      errors: validation.errors,
      platform: dto.platform,
      pixelId: dto.pixelId,
    };
  }

  @Get('script/:linkId')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get tracking script for a link' })
  async getTrackingScript(
    @ScopedTeamId() teamId: string,
    @Param('linkId') linkId: string,
  ) {
    const script = await this.analyticsService.generateTrackingScriptForLink(
      teamId,
      linkId,
    );
    return { script };
  }

  @Get('platforms')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get supported analytics platforms' })
  getSupportedPlatforms() {
    return {
      platforms: [
        {
          id: 'ga4',
          name: 'Google Analytics 4',
          description: 'Track with GA4 Measurement ID',
          format: 'G-XXXXXXXXXX',
          serverSideSupported: false,
        },
        {
          id: 'facebook_pixel',
          name: 'Facebook Pixel',
          description: 'Track with Meta Pixel',
          format: '15-16 digit number',
          serverSideSupported: true,
        },
        {
          id: 'tiktok_pixel',
          name: 'TikTok Pixel',
          description: 'Track with TikTok Pixel',
          format: 'Alphanumeric ID',
          serverSideSupported: true,
        },
        {
          id: 'google_ads',
          name: 'Google Ads',
          description: 'Track conversions for Google Ads',
          format: 'AW-XXXXXXXXX/XXXXX',
          serverSideSupported: false,
        },
        {
          id: 'linkedin_insight',
          name: 'LinkedIn Insight Tag',
          description: 'Track with LinkedIn Insight',
          format: 'Partner ID',
          serverSideSupported: false,
        },
      ],
    };
  }
}
