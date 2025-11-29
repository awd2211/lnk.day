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
import { JwtAuthGuard, CurrentUser } from '@lnk/nestjs-common';
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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('pixels')
  @ApiOperation({ summary: 'Create a pixel configuration' })
  async createPixel(
    @CurrentUser() user: { teamId: string },
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

    return this.analyticsService.createPixelConfig(user.teamId, dto);
  }

  @Get('pixels')
  @ApiOperation({ summary: 'Get all pixel configurations for team' })
  async getPixels(
    @CurrentUser() user: { teamId: string },
    @Query('linkId') linkId?: string,
  ) {
    if (linkId) {
      return this.analyticsService.getPixelConfigsForLink(user.teamId, linkId);
    }
    return this.analyticsService.getTeamPixelConfigs(user.teamId);
  }

  @Get('pixels/:id')
  @ApiOperation({ summary: 'Get a specific pixel configuration' })
  async getPixel(
    @CurrentUser() user: { teamId: string },
    @Param('id') id: string,
  ) {
    return this.analyticsService.getPixelConfig(id, user.teamId);
  }

  @Put('pixels/:id')
  @ApiOperation({ summary: 'Update a pixel configuration' })
  async updatePixel(
    @CurrentUser() user: { teamId: string },
    @Param('id') id: string,
    @Body() dto: UpdatePixelConfigDto,
  ) {
    return this.analyticsService.updatePixelConfig(id, user.teamId, dto);
  }

  @Delete('pixels/:id')
  @ApiOperation({ summary: 'Delete a pixel configuration' })
  async deletePixel(
    @CurrentUser() user: { teamId: string },
    @Param('id') id: string,
  ) {
    await this.analyticsService.deletePixelConfig(id, user.teamId);
    return { success: true };
  }

  @Post('pixels/:id/toggle')
  @ApiOperation({ summary: 'Toggle pixel enabled status' })
  async togglePixel(
    @CurrentUser() user: { teamId: string },
    @Param('id') id: string,
  ) {
    return this.analyticsService.togglePixelConfig(id, user.teamId);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test a pixel configuration' })
  async testPixel(
    @CurrentUser() user: { teamId: string },
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
  @ApiOperation({ summary: 'Get tracking script for a link' })
  async getTrackingScript(
    @CurrentUser() user: { teamId: string },
    @Param('linkId') linkId: string,
  ) {
    const script = await this.analyticsService.generateTrackingScriptForLink(
      user.teamId,
      linkId,
    );
    return { script };
  }

  @Get('platforms')
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
