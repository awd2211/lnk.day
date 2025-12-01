import { Injectable, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PRESET_ROLE_PERMISSIONS, UnifiedJwtPayload, TeamRole, Scope } from '@lnk/nestjs-common';

import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { EmailService } from '../email/email.service';
import { TokenBlacklistService } from '../redis/token-blacklist.service';
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
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    const tokens = await this.generateTokensWithPermissions(user.id, user.email);

    // 发送欢迎邮件
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
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

    const tokens = await this.generateTokensWithPermissions(user.id, user.email, user.teamId);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teamId: user.teamId,
      },
      ...tokens,
    };
  }

  /**
   * 生成包含权限信息的统一格式 JWT
   *
   * 新版统一格式包含：
   * - type: 'user' 标识普通用户（区别于 'admin' 管理员）
   * - scope: 访问范围（team 或 personal）
   * - role: 团队角色
   * - permissions: 权限列表
   */
  private async generateTokensWithPermissions(userId: string, email: string, teamId?: string) {
    // 获取用户的团队成员身份和权限
    let teamRole: string = TeamRole.MEMBER;
    let permissions: string[] = [];
    let scope: Scope;

    if (teamId) {
      const membership = await this.teamService.getUserTeamMembership(userId, teamId);
      if (membership) {
        // membership.teamRole 是 TeamMemberRole 类型，值与 TeamRole 相同
        teamRole = membership.teamRole || TeamRole.MEMBER;
        permissions = membership.permissions;
      }
      scope = {
        level: 'team',
        teamId,
      };
    } else {
      // 没有团队的用户作为个人工作区，给予 OWNER 角色和权限
      teamRole = TeamRole.OWNER;
      permissions = PRESET_ROLE_PERMISSIONS.OWNER || [];
      scope = {
        level: 'personal',
        teamId: userId, // 个人工作区使用 userId 作为隔离标识
      };
    }

    // 构建统一格式的 JWT payload
    const payload: Omit<UnifiedJwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      type: 'user',
      scope,
      role: teamRole,
      permissions,
      // 向后兼容：保留旧字段
      teamId: teamId || null,
      teamRole,
    } as any;

    const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d');

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: accessExpiresIn }),
      refreshToken: this.jwtService.sign(
        { sub: userId, email }, // refresh token 不包含权限，刷新时重新获取
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
}
