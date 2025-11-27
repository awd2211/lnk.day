import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Headers,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { OAuthService } from './oauth.service';
import { OAuthProvider } from './oauth-account.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('oauth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: '获取可用的 OAuth 登录方式' })
  getProviders() {
    const providers = [];

    if (this.configService.get('GOOGLE_CLIENT_ID')) {
      providers.push({
        provider: OAuthProvider.GOOGLE,
        name: 'Google',
        icon: 'google',
        enabled: true,
      });
    }

    if (this.configService.get('GITHUB_CLIENT_ID')) {
      providers.push({
        provider: OAuthProvider.GITHUB,
        name: 'GitHub',
        icon: 'github',
        enabled: true,
      });
    }

    if (this.configService.get('WECHAT_APP_ID')) {
      providers.push({
        provider: OAuthProvider.WECHAT,
        name: '微信',
        icon: 'wechat',
        enabled: true,
      });
    }

    return { providers };
  }

  @Get(':provider')
  @ApiOperation({ summary: '获取 OAuth 登录 URL' })
  async getAuthUrl(@Param('provider') provider: OAuthProvider) {
    const config = await this.oauthService.getOAuthConfig(provider);
    return config;
  }

  @Get(':provider/redirect')
  @ApiOperation({ summary: '重定向到 OAuth 提供商' })
  async redirect(@Param('provider') provider: OAuthProvider, @Res() res: Response) {
    const config = await this.oauthService.getOAuthConfig(provider);
    return res.redirect(config.authUrl);
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'OAuth 回调处理' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  async callback(
    @Param('provider') provider: OAuthProvider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      // Exchange code for tokens and get user info
      const oauthUser = await this.oauthService.exchangeCodeForTokens(provider, code);

      // Handle OAuth login/registration
      const result = await this.oauthService.handleOAuthCallback(oauthUser);

      // Redirect to frontend with tokens
      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isNewUser: String(result.isNewUser),
      });

      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
      const errorMessage = error instanceof Error ? error.message : 'OAuth login failed';
      return res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Post(':provider/token')
  @ApiOperation({ summary: '使用授权码交换 Token (移动端/SPA)' })
  async exchangeToken(
    @Param('provider') provider: OAuthProvider,
    @Query('code') code: string,
  ) {
    const oauthUser = await this.oauthService.exchangeCodeForTokens(provider, code);
    return this.oauthService.handleOAuthCallback(oauthUser);
  }

  // Account linking endpoints
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取已关联的社交账号' })
  async getLinkedAccounts(@Headers('x-user-id') userId: string) {
    const accounts = await this.oauthService.getLinkedAccounts(userId);
    return { accounts };
  }

  @Post('link/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '关联社交账号' })
  async linkAccount(
    @Param('provider') provider: OAuthProvider,
    @Query('code') code: string,
    @Headers('x-user-id') userId: string,
  ) {
    const oauthUser = await this.oauthService.exchangeCodeForTokens(provider, code);
    const account = await this.oauthService.linkOAuthAccount(userId, oauthUser);
    return {
      message: `${provider} account linked successfully`,
      account: {
        id: account.id,
        provider: account.provider,
        email: account.email,
        name: account.name,
      },
    };
  }

  @Delete('unlink/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解除社交账号关联' })
  async unlinkAccount(
    @Param('provider') provider: OAuthProvider,
    @Headers('x-user-id') userId: string,
  ) {
    await this.oauthService.unlinkOAuthAccount(userId, provider);
    return { message: `${provider} account unlinked successfully` };
  }
}
