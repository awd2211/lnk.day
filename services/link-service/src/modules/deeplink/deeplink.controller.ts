import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  ScopedTeamId,
} from '@lnk/nestjs-common';
import { DeepLinkService } from './deeplink.service';
import { FallbackBehavior, IOSConfig, AndroidConfig, AttributionConfig } from './deeplink.entity';

class CreateDeepLinkConfigDto {
  ios?: IOSConfig;
  android?: AndroidConfig;
  fallbackBehavior?: FallbackBehavior;
  webFallbackUrl?: string;
  attribution?: Partial<AttributionConfig>;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

@ApiTags('deep-links')
@Controller('links/:linkId/deep-link')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class DeepLinkController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @Post()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.DEEPLINKS_CREATE)
  @ApiOperation({ summary: '配置深度链接' })
  create(@Param('linkId') linkId: string, @Body() data: CreateDeepLinkConfigDto) {
    return this.deepLinkService.createConfig(linkId, data);
  }

  @Get()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  @ApiOperation({ summary: '获取深度链接配置' })
  get(@Param('linkId') linkId: string) {
    return this.deepLinkService.getConfig(linkId);
  }

  @Put()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.DEEPLINKS_EDIT)
  @ApiOperation({ summary: '更新深度链接配置' })
  update(@Param('linkId') linkId: string, @Body() data: Partial<CreateDeepLinkConfigDto>) {
    return this.deepLinkService.updateConfig(linkId, data);
  }

  @Delete()
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.DEEPLINKS_EDIT)
  @ApiOperation({ summary: '删除深度链接配置' })
  delete(@Param('linkId') linkId: string) {
    return this.deepLinkService.deleteConfig(linkId);
  }

  @Post('resolve')
  @ApiHeader({ name: 'x-team-id', required: true })
  @RequirePermissions(Permission.DEEPLINKS_VIEW)
  @ApiOperation({ summary: '解析深度链接目标 URL' })
  async resolve(
    @Param('linkId') linkId: string,
    @Body() body: { os: string; version?: string; defaultUrl: string },
  ) {
    const config = await this.deepLinkService.getConfig(linkId);
    if (!config) {
      return { targetUrl: body.defaultUrl, method: 'fallback', platform: 'web' };
    }

    return this.deepLinkService.resolveDeepLink(config, { os: body.os, version: body.version }, body.defaultUrl);
  }
}

@ApiTags('deep-links')
@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @Get('apple-app-site-association')
  @ApiOperation({ summary: 'Apple App Site Association 文件' })
  async getAASA(@Query('teamId') teamId?: string) {
    // In production, this would fetch all configs for the domain
    // teamId is optional - domain resolution happens at redirect-service level
    return {
      applinks: {
        apps: [],
        details: [],
      },
    };
  }

  @Get('assetlinks.json')
  @ApiOperation({ summary: 'Android Asset Links 文件' })
  async getAssetLinks(@Query('teamId') teamId?: string) {
    // In production, this would fetch all configs for the domain
    // teamId is optional - domain resolution happens at redirect-service level
    return [];
  }
}

@ApiTags('deep-links')
@Controller('deferred-deep-link')
export class DeferredDeepLinkController {
  constructor(private readonly deepLinkService: DeepLinkService) {}

  @Post('record')
  @ApiOperation({ summary: '记录延迟深度链接' })
  async record(
    @Body()
    body: {
      linkId: string;
      context: {
        targetUrl: string;
        campaignId?: string;
        source?: string;
        medium?: string;
        referrer?: string;
      };
    },
    @Req() req: Request,
  ) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();

    return this.deepLinkService.createDeferredLink(body.linkId, body.context, deviceInfo, ipAddress);
  }

  @Post('match')
  @ApiOperation({ summary: '匹配延迟深度链接' })
  async match(@Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();

    const match = await this.deepLinkService.matchDeferredLink(deviceInfo, ipAddress);

    if (match) {
      return {
        found: true,
        context: match.context,
        linkId: match.linkId,
      };
    }

    return { found: false };
  }
}
