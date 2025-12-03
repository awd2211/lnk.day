import { Injectable, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PRESET_ROLE_PERMISSIONS, UnifiedJwtPayload, TeamRole, Scope } from '@lnk/nestjs-common';

import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { EmailService } from '../email/email.service';
import { TokenBlacklistService } from '../redis/token-blacklist.service';
import { SecurityService } from '../security/security.service';
import { SecurityEventType } from '../security/entities/security-event.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly securityService: SecurityService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async register(registerDto: RegisterDto, req?: Request) {
    const user = await this.userService.create(registerDto);
    const tokens = await this.generateTokensWithPermissions(user.id, user.email);

    // 创建 session 记录
    await this.createSessionFromRequest(user.id, tokens.accessToken, req);

    // 记录安全事件
    await this.logSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, '用户注册并登录', req);

    // 发送欢迎邮件
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    // 发送邮箱验证邮件
    try {
      await this.userService.sendEmailVerification(user.id);
    } catch (error) {
      // 验证邮件发送失败不影响注册成功
      console.error('Failed to send verification email:', error);
    }

    // 对于新注册用户，使用 userId 作为个人工作区的 teamId
    // 这与 JWT scope.teamId 的逻辑保持一致
    const effectiveTeamId = user.teamId || user.id;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teamId: effectiveTeamId,
        emailVerified: false, // 新注册用户邮箱未验证
      },
      ...tokens,
      requiresEmailVerification: true, // 告诉前端需要邮箱验证
    };
  }

  async login(loginDto: LoginDto, req?: Request) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 检查账户是否被锁定
    if (this.userService.isAccountLocked(user)) {
      const remainingMinutes = this.userService.getRemainingLockTime(user);
      throw new UnauthorizedException(
        `账户已被锁定，请在 ${remainingMinutes} 分钟后重试`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      // 记录登录失败
      const result = await this.userService.recordFailedLogin(user.id);

      // 记录安全事件
      await this.logSecurityEvent(user.id, SecurityEventType.LOGIN_FAILED, '登录失败：密码错误', req);

      if (result.locked) {
        throw new UnauthorizedException(
          `密码错误次数过多，账户已锁定 ${result.lockMinutes} 分钟`,
        );
      }
      throw new UnauthorizedException(
        `密码错误，还剩 ${result.remainingAttempts} 次尝试机会`,
      );
    }

    // 更新最后登录时间 (会自动重置失败计数)
    await this.userService.updateLastLogin(user.id);

    // 对于没有团队的用户，使用 userId 作为个人工作区的 teamId
    // 这与 JWT scope.teamId 的逻辑保持一致
    const effectiveTeamId = user.teamId || user.id;

    const tokens = await this.generateTokensWithPermissions(user.id, user.email, user.teamId);
    const emailVerified = !!user.emailVerifiedAt;

    // 创建 session 记录
    await this.createSessionFromRequest(user.id, tokens.accessToken, req);

    // 记录安全事件
    await this.logSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, '用户登录成功', req);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teamId: effectiveTeamId,
        emailVerified,
      },
      ...tokens,
      // 如果邮箱未验证，提示用户需要验证
      ...(emailVerified ? {} : { requiresEmailVerification: true }),
    };
  }

  /**
   * 生成精简 JWT（不包含权限列表）
   *
   * 设计原则：
   * - Token 只存储角色，不存储完整权限列表（减小 Token 体积）
   * - 权限由服务端根据角色实时计算（支持热更新）
   * - 权限版本号用于失效旧 Token
   *
   * JWT payload 包含：
   * - type: 'user' 标识普通用户（区别于 'admin' 管理员）
   * - scope: 访问范围（team 或 personal）
   * - role: 团队角色（权限从角色实时计算）
   * - customRoleId: 自定义角色 ID（如果使用自定义角色）
   * - pv: 权限版本号（用于实时失效）
   */
  private async generateTokensWithPermissions(userId: string, email: string, teamId?: string) {
    // 获取用户的团队成员身份
    let teamRole: string = TeamRole.MEMBER;
    let customRoleId: string | undefined;
    let scope: Scope;
    let permissionVersion = 1;

    if (teamId) {
      const membership = await this.teamService.getUserTeamMembership(userId, teamId);
      if (membership) {
        teamRole = membership.teamRole || TeamRole.MEMBER;
        // 如果使用自定义角色
        if (membership.customRoleId) {
          customRoleId = membership.customRoleId;
        }
        // 获取权限版本号（如果有）
        if (membership.permissionVersion) {
          permissionVersion = membership.permissionVersion;
        }
      }
      scope = {
        level: 'team',
        teamId,
      };
    } else {
      // 没有团队的用户作为个人工作区，给予 OWNER 角色
      teamRole = TeamRole.OWNER;
      scope = {
        level: 'personal',
        teamId: userId, // 个人工作区使用 userId 作为隔离标识
      };
    }

    // 构建精简的 JWT payload（不包含 permissions）
    const payload: Omit<UnifiedJwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      type: 'user',
      scope,
      role: teamRole,
      pv: permissionVersion,
      // 自定义角色 ID（可选）
      ...(customRoleId && { customRoleId }),
    };

    const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d');

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: accessExpiresIn }),
      refreshToken: this.jwtService.sign(
        { sub: userId, email },
        { expiresIn: refreshExpiresIn },
      ),
      expiresIn: this.parseExpiresIn(accessExpiresIn),
    };
  }

  /**
   * 生成简单 JWT（不包含权限，用于向后兼容）
   */
  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d');

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: accessExpiresIn }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: refreshExpiresIn }),
      expiresIn: this.parseExpiresIn(accessExpiresIn),
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认 15 分钟
    const value = parseInt(match[1]!, 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  async refreshTokens(refreshToken: string) {
    // 检查 token 是否在黑名单中
    if (await this.tokenBlacklistService.isBlacklisted(refreshToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      // 验证 refresh token
      const payload = this.jwtService.verify(refreshToken);

      // 检查用户是否存在
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 将旧 token 加入黑名单 (30天TTL)
      await this.tokenBlacklistService.addToBlacklist(refreshToken);

      // 生成新的 tokens（包含最新权限）
      return this.generateTokensWithPermissions(user.id, user.email, user.teamId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    // 将 token 加入黑名单
    await this.tokenBlacklistService.addToBlacklist(token);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.tokenBlacklistService.isBlacklisted(token);
  }

  async validateToken(token: string) {
    if (await this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findOne(payload.sub);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);

    // 即使用户不存在也返回成功消息，防止用户枚举攻击
    if (!user) {
      return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
    }

    // 删除该用户之前的重置 token
    await this.passwordResetTokenRepository.delete({ userId: user.id });

    // 生成新的重置 token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1小时后过期

    await this.passwordResetTokenRepository.save({
      userId: user.id,
      token,
      expiresAt,
    });

    // 发送密码重置邮件
    await this.emailService.sendPasswordResetEmail(user.email, token);

    // 开发环境下返回 token (便于测试)
    if (this.configService.get('NODE_ENV') === 'development') {
      return {
        message: '密码重置邮件已发送',
        // @ts-ignore - 仅开发环境返回 token
        resetToken: token,
      };
    }

    return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        token,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      throw new BadRequestException('重置链接无效或已过期');
    }

    // 更新用户密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updatePassword(resetToken.userId, hashedPassword);

    // 删除已使用的 token
    await this.passwordResetTokenRepository.remove(resetToken);

    return { message: '密码重置成功' };
  }

  /**
   * 发送登录验证码
   * 生成6位数字验证码，5分钟有效
   */
  async sendLoginCode(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);

    // 即使用户不存在也返回成功消息，防止用户枚举攻击
    if (!user) {
      return { message: '如果该邮箱已注册，您将收到登录验证码' };
    }

    // 检查账户是否被锁定
    if (this.userService.isAccountLocked(user)) {
      const remainingMinutes = this.userService.getRemainingLockTime(user);
      throw new UnauthorizedException(
        `账户已被锁定，请在 ${remainingMinutes} 分钟后重试`,
      );
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 保存验证码到用户记录
    await this.userService.setLoginCode(user.id, code, expiresAt);

    // 发送登录验证码邮件
    await this.emailService.sendLoginCodeEmail(user.email, code);

    // 开发环境下返回验证码 (便于测试)
    if (this.configService.get('NODE_ENV') === 'development') {
      return {
        message: '登录验证码已发送',
        // @ts-ignore - 仅开发环境返回验证码
        loginCode: code,
      };
    }

    return { message: '如果该邮箱已注册，您将收到登录验证码' };
  }

  /**
   * 验证码登录
   * 验证邮箱和验证码，成功后返回登录凭证
   */
  async verifyLoginCode(email: string, code: string, req?: Request) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('邮箱或验证码错误');
    }

    // 检查账户是否被锁定
    if (this.userService.isAccountLocked(user)) {
      const remainingMinutes = this.userService.getRemainingLockTime(user);
      throw new UnauthorizedException(
        `账户已被锁定，请在 ${remainingMinutes} 分钟后重试`,
      );
    }

    // 验证验证码
    if (!user.loginCode || !user.loginCodeExpiresAt) {
      throw new UnauthorizedException('请先获取登录验证码');
    }

    if (new Date() > user.loginCodeExpiresAt) {
      // 清除过期的验证码
      await this.userService.clearLoginCode(user.id);
      throw new UnauthorizedException('验证码已过期，请重新获取');
    }

    if (user.loginCode !== code) {
      // 记录登录失败
      const result = await this.userService.recordFailedLogin(user.id);

      // 记录安全事件
      await this.logSecurityEvent(user.id, SecurityEventType.LOGIN_FAILED, '验证码登录失败：验证码错误', req);

      if (result.locked) {
        throw new UnauthorizedException(
          `验证码错误次数过多，账户已锁定 ${result.lockMinutes} 分钟`,
        );
      }
      throw new UnauthorizedException(
        `验证码错误，还剩 ${result.remainingAttempts} 次尝试机会`,
      );
    }

    // 验证成功，清除验证码
    await this.userService.clearLoginCode(user.id);

    // 更新最后登录时间 (会自动重置失败计数)
    await this.userService.updateLastLogin(user.id);

    // 对于没有团队的用户，使用 userId 作为个人工作区的 teamId
    const effectiveTeamId = user.teamId || user.id;

    const tokens = await this.generateTokensWithPermissions(user.id, user.email, user.teamId);
    const emailVerified = !!user.emailVerifiedAt;

    // 创建 session 记录
    await this.createSessionFromRequest(user.id, tokens.accessToken, req);

    // 记录安全事件
    await this.logSecurityEvent(user.id, SecurityEventType.LOGIN_SUCCESS, '验证码登录成功', req);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teamId: effectiveTeamId,
        emailVerified,
      },
      ...tokens,
      // 如果邮箱未验证，提示用户需要验证
      ...(emailVerified ? {} : { requiresEmailVerification: true }),
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

    // 构建设备名称
    deviceName = `${browser} on ${os}`;

    return { browser, os, deviceType, deviceName };
  }
}
