import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpException,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  JwtAuthGuard,
  ScopeGuard,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { MobileService, MobileDevice, LinkCreateDto, QrCodeGenerateDto } from './mobile.service';

@ApiTags('mobile')
@ApiBearerAuth()
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  // ================== 应用配置 ==================

  @Get('config')
  @Version('1')
  @ApiOperation({ summary: '获取移动端应用配置' })
  getAppConfig() {
    return this.mobileService.getAppConfig();
  }

  // ================== 设备管理 ==================

  @Post('devices')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '注册移动设备' })
  @ApiHeader({ name: 'x-device-id', description: '设备唯一标识' })
  registerDevice(
    @Body() device: MobileDevice,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mobileService.registerDevice(user.id, device);
  }

  @Put('devices/:deviceId/push-token')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '更新推送令牌' })
  updatePushToken(
    @Param('deviceId') deviceId: string,
    @Body() body: { pushToken: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mobileService.updatePushToken(user.id, deviceId, body.pushToken);
  }

  // ================== 仪表板 ==================

  @Get('dashboard')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '获取移动端仪表板数据' })
  @ApiQuery({ name: 'period', required: false, description: '时间范围: 1d, 7d, 30d, 90d' })
  async getDashboard(
    @ScopedTeamId() teamId: string,
    @Query('period') period: string = '7d',
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.getDashboardData(teamId, period, headers);
  }

  // ================== 链接管理 ==================

  @Post('links')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '快速创建短链接' })
  async createLink(
    @Body() data: LinkCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.quickCreateLink(user.id, teamId, data, headers);
  }

  @Get('links/recent')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '获取最近链接' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentLinks(
    @ScopedTeamId() teamId: string,
    @Query('limit') limit: number = 20,
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.getRecentLinks(teamId, limit, headers);
  }

  @Get('links/search')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '搜索链接' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  async searchLinks(
    @ScopedTeamId() teamId: string,
    @Query('q') query: string,
    @Req() req: Request,
  ) {
    if (!query || query.trim().length < 2) {
      throw new HttpException('Search query must be at least 2 characters', 400);
    }
    const headers = this.extractHeaders(req);
    return this.mobileService.searchLinks(teamId, query, headers);
  }

  @Get('links/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '获取链接详情 (含统计)' })
  async getLinkDetails(
    @Param('id') linkId: string,
    @ScopedTeamId() teamId: string,
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.getLinkDetails(linkId, teamId, headers);
  }

  @Get('links/:id/realtime')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '获取链接实时统计' })
  async getLinkRealtimeStats(
    @Param('id') linkId: string,
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.getLinkRealtimeStats(linkId, headers);
  }

  // ================== QR 码 ==================

  @Post('qr/generate')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '生成 QR 码图片' })
  async generateQrCode(
    @Body() data: QrCodeGenerateDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const headers = this.extractHeaders(req);
    const buffer = await this.mobileService.generateQrCode(data, headers);
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(buffer);
  }

  // ================== 分享扩展 ==================

  @Post('share')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '分享扩展 - 快速创建链接' })
  async handleShare(
    @Body() body: { url: string; title?: string },
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Req() req: Request,
  ) {
    if (!body.url) {
      throw new HttpException('URL is required', 400);
    }
    const headers = this.extractHeaders(req);
    return this.mobileService.handleShareExtension(
      user.id,
      teamId,
      body.url,
      body.title,
      headers,
    );
  }

  // ================== 用户 ==================

  @Get('user/profile')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '获取用户资料' })
  async getUserProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.getUserProfile(user.id, headers);
  }

  // ================== 离线同步 ==================

  @Get('sync')
  @Version('1')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @ApiOperation({ summary: '获取离线同步数据' })
  @ApiQuery({ name: 'lastSyncAt', required: false, description: '上次同步时间 (ISO 8601)' })
  async getSyncData(
    @ScopedTeamId() teamId: string,
    @Query('lastSyncAt') lastSyncAt: string | undefined,
    @Req() req: Request,
  ) {
    const headers = this.extractHeaders(req);
    return this.mobileService.getOfflineSyncData(teamId, lastSyncAt, headers);
  }

  // ================== 辅助方法 ==================

  private extractHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization as string;
    }

    if (req.headers['x-request-id']) {
      headers['x-request-id'] = req.headers['x-request-id'] as string;
    }

    return headers;
  }
}
