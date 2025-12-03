import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as crypto from 'crypto';

import { OAuthAccount, OAuthProvider } from './oauth-account.entity';
import { UserService } from '../../user/user.service';
import { SecurityService } from '../../security/security.service';
import { SecurityEventType } from '../../security/entities/security-event.entity';

export interface OAuthUserInfo {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  profile?: Record<string, any>;
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly securityService: SecurityService,
  ) {}

  async handleOAuthCallback(oauthUser: OAuthUserInfo, req?: Request): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    // Check if OAuth account already exists
    let oauthAccount = await this.oauthAccountRepository.findOne({
      where: {
        provider: oauthUser.provider,
        providerAccountId: oauthUser.providerAccountId,
      },
    });

    let user;
    let isNewUser = false;

    if (oauthAccount) {
      // Existing OAuth account - update tokens and get user
      oauthAccount.accessToken = oauthUser.accessToken;
      oauthAccount.refreshToken = oauthUser.refreshToken;
      oauthAccount.tokenExpiresAt = oauthUser.tokenExpiresAt;
      oauthAccount.profile = oauthUser.profile;
      await this.oauthAccountRepository.save(oauthAccount);

      user = await this.userService.findOne(oauthAccount.userId);
    } else {
      // New OAuth account
      // Check if user with same email exists
      if (oauthUser.email) {
        user = await this.userService.findByEmail(oauthUser.email);
      }

      if (!user) {
        // Create new user
        const randomPassword = crypto.randomBytes(32).toString('hex');
        user = await this.userService.create({
          email: oauthUser.email || `${oauthUser.provider}_${oauthUser.providerAccountId}@oauth.local`,
          name: oauthUser.name || `${oauthUser.provider} User`,
          password: randomPassword,
        });
        isNewUser = true;
      }

      // Create OAuth account link
      oauthAccount = this.oauthAccountRepository.create({
        userId: user.id,
        provider: oauthUser.provider,
        providerAccountId: oauthUser.providerAccountId,
        email: oauthUser.email,
        name: oauthUser.name,
        avatar: oauthUser.avatar,
        accessToken: oauthUser.accessToken,
        refreshToken: oauthUser.refreshToken,
        tokenExpiresAt: oauthUser.tokenExpiresAt,
        profile: oauthUser.profile,
      });
      await this.oauthAccountRepository.save(oauthAccount);
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate JWT tokens
    const tokens = this.generateTokens(user.id, user.email);

    // 创建 session 记录
    await this.createSessionFromRequest(user.id, tokens.accessToken, req);

    // 记录安全事件
    const eventMessage = isNewUser
      ? `通过 ${oauthUser.provider} OAuth 注册并登录`
      : `通过 ${oauthUser.provider} OAuth 登录`;
    await this.logSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, eventMessage, req);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar || oauthUser.avatar,
      },
      ...tokens,
      isNewUser,
    };
  }

  async linkOAuthAccount(userId: string, oauthUser: OAuthUserInfo): Promise<OAuthAccount> {
    // Check if OAuth account already linked to another user
    const existing = await this.oauthAccountRepository.findOne({
      where: {
        provider: oauthUser.provider,
        providerAccountId: oauthUser.providerAccountId,
      },
    });

    if (existing && existing.userId !== userId) {
      throw new BadRequestException('This account is already linked to another user');
    }

    if (existing) {
      // Update existing link
      existing.accessToken = oauthUser.accessToken;
      existing.refreshToken = oauthUser.refreshToken;
      existing.tokenExpiresAt = oauthUser.tokenExpiresAt;
      existing.profile = oauthUser.profile;
      return this.oauthAccountRepository.save(existing);
    }

    // Create new link
    const account = this.oauthAccountRepository.create({
      userId,
      provider: oauthUser.provider,
      providerAccountId: oauthUser.providerAccountId,
      email: oauthUser.email,
      name: oauthUser.name,
      avatar: oauthUser.avatar,
      accessToken: oauthUser.accessToken,
      refreshToken: oauthUser.refreshToken,
      tokenExpiresAt: oauthUser.tokenExpiresAt,
      profile: oauthUser.profile,
    });

    return this.oauthAccountRepository.save(account);
  }

  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    const account = await this.oauthAccountRepository.findOne({
      where: { userId, provider },
    });

    if (!account) {
      throw new BadRequestException('OAuth account not found');
    }

    // Check if user has password or other OAuth accounts
    const user = await this.userService.findOne(userId);
    const otherAccounts = await this.oauthAccountRepository.count({
      where: { userId },
    });

    // Prevent unlinking if it's the only login method and no password
    if (otherAccounts <= 1 && !user.password) {
      throw new BadRequestException('Cannot unlink the only login method');
    }

    await this.oauthAccountRepository.remove(account);
  }

  async getLinkedAccounts(userId: string): Promise<OAuthAccount[]> {
    return this.oauthAccountRepository.find({
      where: { userId },
      select: ['id', 'provider', 'email', 'name', 'avatar', 'createdAt'],
    });
  }

  async getOAuthConfig(provider: OAuthProvider): Promise<{
    authUrl: string;
    clientId: string;
    scope: string;
    state: string;
  }> {
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${this.configService.get('APP_URL')}/auth/${provider}/callback`;

    switch (provider) {
      case OAuthProvider.GOOGLE:
        return {
          authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.configService.get('GOOGLE_CLIENT_ID', '')}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&state=${state}`,
          clientId: this.configService.get('GOOGLE_CLIENT_ID', ''),
          scope: 'openid email profile',
          state,
        };

      case OAuthProvider.GITHUB:
        return {
          authUrl: `https://github.com/login/oauth/authorize?client_id=${this.configService.get('GITHUB_CLIENT_ID', '')}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('user:email')}&state=${state}`,
          clientId: this.configService.get('GITHUB_CLIENT_ID', ''),
          scope: 'user:email',
          state,
        };

      case OAuthProvider.WECHAT:
        return {
          authUrl: `https://open.weixin.qq.com/connect/qrconnect?appid=${this.configService.get('WECHAT_APP_ID', '')}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`,
          clientId: this.configService.get('WECHAT_APP_ID', ''),
          scope: 'snsapi_login',
          state,
        };

      default:
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }
  }

  // Exchange authorization code for tokens (provider-specific)
  async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
  ): Promise<OAuthUserInfo> {
    const redirectUri = `${this.configService.get('APP_URL')}/auth/${provider}/callback`;

    switch (provider) {
      case OAuthProvider.GOOGLE:
        return this.exchangeGoogleCode(code, redirectUri);
      case OAuthProvider.GITHUB:
        return this.exchangeGitHubCode(code, redirectUri);
      case OAuthProvider.WECHAT:
        return this.exchangeWeChatCode(code, redirectUri);
      default:
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }
  }

  private async exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.configService.get('GOOGLE_CLIENT_ID', ''),
        client_secret: this.configService.get('GOOGLE_CLIENT_SECRET', ''),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens: any = await tokenResponse.json();
    if (tokens.error) {
      throw new UnauthorizedException(`Google OAuth error: ${tokens.error_description}`);
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo: any = await userResponse.json();

    return {
      provider: OAuthProvider.GOOGLE,
      providerAccountId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      profile: userInfo,
    };
  }

  private async exchangeGitHubCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.configService.get('GITHUB_CLIENT_ID', ''),
        client_secret: this.configService.get('GITHUB_CLIENT_SECRET', ''),
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens: any = await tokenResponse.json();
    if (tokens.error) {
      throw new UnauthorizedException(`GitHub OAuth error: ${tokens.error_description}`);
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userInfo: any = await userResponse.json();

    // Get email if not public
    let email = userInfo.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const emails = await emailResponse.json() as any[];
      const primaryEmail = emails.find((e: any) => e.primary);
      email = primaryEmail?.email;
    }

    return {
      provider: OAuthProvider.GITHUB,
      providerAccountId: String(userInfo.id),
      email,
      name: userInfo.name || userInfo.login,
      avatar: userInfo.avatar_url,
      accessToken: tokens.access_token,
      profile: userInfo,
    };
  }

  private async exchangeWeChatCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
    // Exchange code for tokens
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.configService.get('WECHAT_APP_ID', '')}&secret=${this.configService.get('WECHAT_APP_SECRET', '')}&code=${code}&grant_type=authorization_code`;

    const tokenResponse = await fetch(tokenUrl);
    const tokens: any = await tokenResponse.json();

    if (tokens.errcode) {
      throw new UnauthorizedException(`WeChat OAuth error: ${tokens.errmsg}`);
    }

    // Get user info
    const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokens.access_token}&openid=${tokens.openid}`;
    const userResponse = await fetch(userUrl);
    const userInfo: any = await userResponse.json();

    return {
      provider: OAuthProvider.WECHAT,
      providerAccountId: tokens.unionid || tokens.openid,
      name: userInfo.nickname,
      avatar: userInfo.headimgurl,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      profile: userInfo,
    };
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d');

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: accessExpiresIn }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: refreshExpiresIn }),
    };
  }

  /**
   * 从请求创建 session 记录
   */
  private async createSessionFromRequest(userId: string, token: string, req?: Request): Promise<void> {
    try {
      const userAgent = req?.headers['user-agent'] || '';
      const ipAddress = this.getClientIp(req);

      // 解析 User-Agent
      const { browser, os, deviceType, deviceName } = this.parseUserAgent(userAgent);

      // 计算 token 过期时间
      const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
      const expiresAt = new Date(Date.now() + this.parseExpiresIn(accessExpiresIn) * 1000);

      await this.securityService.createSession({
        userId,
        token,
        deviceName,
        deviceType,
        browser,
        os,
        ipAddress,
        expiresAt,
      });
    } catch (error) {
      // Session 创建失败不应该影响登录
      console.error('Failed to create session:', error);
    }
  }

  /**
   * 记录安全事件
   */
  private async logSecurityEvent(
    userId: string,
    type: SecurityEventType,
    description: string,
    req?: Request,
  ): Promise<void> {
    try {
      const userAgent = req?.headers['user-agent'] || '';
      const ipAddress = this.getClientIp(req);
      const { deviceName } = this.parseUserAgent(userAgent);

      await this.securityService.logEvent({
        userId,
        type,
        description,
        ipAddress,
        userAgent,
        deviceName,
      });
    } catch (error) {
      // 事件记录失败不应该影响正常流程
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * 获取客户端 IP 地址
   * 优先级: CF-Connecting-IP (Cloudflare) > X-Real-IP (Nginx) > X-Forwarded-For > req.ip
   */
  private getClientIp(req?: Request): string {
    if (!req) return '';

    // 1. Cloudflare 的真实客户端 IP
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) {
      const ip = typeof cfIp === 'string' ? cfIp : cfIp[0];
      if (ip) return ip.trim();
    }

    // 2. Nginx 的 X-Real-IP
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      const ip = typeof realIp === 'string' ? realIp : realIp[0];
      if (ip) return ip.trim();
    }

    // 3. X-Forwarded-For 链中的第一个 IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
      if (ips) {
        const firstIp = ips.split(',')[0];
        if (firstIp) return firstIp.trim();
      }
    }

    // 4. 直接连接的 IP
    return req.ip || req.socket?.remoteAddress || '';
  }

  /**
   * 解析 User-Agent 字符串
   */
  private parseUserAgent(ua: string): {
    browser: string;
    os: string;
    deviceType: string;
    deviceName: string;
  } {
    let browser = 'Unknown';
    let os = 'Unknown';
    let deviceType = 'desktop';
    let deviceName = 'Unknown Device';

    // 检测浏览器
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
    } else if (ua.includes('Opera') || ua.includes('OPR')) {
      browser = 'Opera';
    }

    // 检测操作系统
    if (ua.includes('Windows')) {
      os = 'Windows';
    } else if (ua.includes('Mac OS')) {
      os = 'macOS';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
      deviceType = 'mobile';
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
      deviceType = ua.includes('iPad') ? 'tablet' : 'mobile';
    }

    // 生成设备名称
    deviceName = `${browser} on ${os}`;

    return { browser, os, deviceType, deviceName };
  }

  /**
   * 解析过期时间字符串为秒数
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) return 900; // 默认 15 分钟

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
